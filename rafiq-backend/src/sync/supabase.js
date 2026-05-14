/**
 * sync/supabase.js
 * Durable background sync: backend SQLite pending_sync -> Supabase.
 * Realtime is treated as a wake-up signal; pull reconciliation remains durable.
 */

import { createClient } from '@supabase/supabase-js';
import { createUuid, json, parseJson } from '../db/utils.js';
import { getDb, popSyncQueue, deleteSyncItems, incrementSyncAttempts } from '../db/index.js';
import { broadcastAlert } from '../sockets/sse.js';

const PUSH_TABLES = new Set([
  'patients',
  'emergency_contacts',
  'devices',
  'esp32_devices',
  'vitals_readings',
  'vitals',
  'medications',
  'medication_logs',
  'reminders',
  'notifications',
  'notification_receipts',
  'alerts',
  'emergency_events',
  'fall_detection_events',
  'gas_alerts',
  'oxygen_alerts',
  'heart_rate_alerts',
  'respiratory_alerts',
  'mqtt_events',
  'sensor_readings',
  'smart_home_devices',
  'smart_home_commands',
  'automation_logs',
  'relay_logs',
  'radar_presence_logs',
  'ai_conversations',
  'ai_messages',
  'ai_memory',
  'ai_context',
  'ai_personality',
  'ai_voice_sessions',
  'ai_emotion_logs',
  'ai_reminders',
]);

const PULL_TABLES = [
  'patients',
  'emergency_contacts',
  'devices',
  'reminders',
  'notifications',
  'alerts',
  'emergency_events',
  'smart_home_devices',
];

const REALTIME_TABLES = [
  'notifications',
  'emergency_events',
  'alerts',
  'gas_alerts',
  'fall_detection_events',
];

let supabase = null;
const realtimeChannels = new Map();

export function initSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.warn('[sync] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set - sync disabled');
    return false;
  }
  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log('[sync] Supabase client ready');
  return true;
}

export function getSupabase() {
  return supabase;
}

function insertFailed(db, item, err) {
  const attempts = (item.attempts ?? 0) + 1;
  db.prepare(
    `INSERT INTO failed_sync
      (id, pending_sync_id, user_id, device_id, table_name, record_id, operation, payload, error_message, attempts)
     VALUES
      (@id, @pending_sync_id, @user_id, @device_id, @table_name, @record_id, @operation, @payload, @error_message, @attempts)`
  ).run({
    id: createUuid(),
    pending_sync_id: item.id,
    user_id: item.user_id ?? null,
    device_id: item.device_id ?? null,
    table_name: item.table_name,
    record_id: item.record_id,
    operation: item.operation,
    payload: item.payload ?? '{}',
    error_message: err?.message ?? String(err),
    attempts,
  });
}

export async function flushQueue(limit = 50) {
  if (!supabase) return { pushed: 0, dropped: 0, failed: 0 };

  const db = getDb();
  const items = popSyncQueue(db, limit);
  if (!items.length) return { pushed: 0, dropped: 0, failed: 0 };

  const pushed = [];
  const dropped = [];
  const failed = [];

  for (const item of items) {
    if (!PUSH_TABLES.has(item.table_name)) {
      dropped.push(item.id);
      continue;
    }

    let payload;
    try {
      payload = parseJson(item.payload, {});
    } catch {
      dropped.push(item.id);
      continue;
    }

    try {
      db.prepare('UPDATE pending_sync SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run('processing', item.id);

      if (String(item.operation).toLowerCase() === 'delete') {
        const { error } = await supabase.from(item.table_name).delete().eq('id', item.record_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(item.table_name).upsert(payload, { onConflict: 'id' });
        if (error) throw error;
      }
      pushed.push(item.id);
    } catch (err) {
      console.error(`[sync] Failed ${item.table_name}#${item.record_id}:`, err.message);
      if ((item.attempts ?? 0) + 1 >= (item.max_attempts ?? 5)) {
        insertFailed(db, item, err);
        dropped.push(item.id);
      } else {
        db.prepare('UPDATE pending_sync SET last_error = ?, status = ? WHERE id = ?')
          .run(err.message, 'pending', item.id);
        failed.push(item.id);
      }
    }
  }

  deleteSyncItems(db, [...pushed, ...dropped]);
  incrementSyncAttempts(db, failed);

  db.prepare(
    `INSERT INTO sync_logs (id, direction, status, pushed, failed, details)
     VALUES (?, 'push', ?, ?, ?, ?)`
  ).run(createUuid(), failed.length ? 'partial' : 'success', pushed.length, failed.length, json({ dropped: dropped.length }));

  return { pushed: pushed.length, dropped: dropped.length, failed: failed.length };
}

export function startSyncLoop(intervalMs = 30_000) {
  if (!supabase) return;
  setInterval(async () => {
    const r = await flushQueue().catch(e => ({ error: e.message, pushed: 0, failed: 1 }));
    if (r.pushed > 0 || r.failed > 0 || r.error) console.log('[sync]', JSON.stringify(r));
  }, intervalMs);
}

export async function pullFromSupabase(db = getDb()) {
  if (!supabase) return { pulled: 0, failed: 0 };
  let pulled = 0;
  let failed = 0;

  for (const table of PULL_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1000);
    if (error) {
      failed++;
      console.error('[sync pull]', table, error.message);
      continue;
    }

    for (const row of data ?? []) {
      const cols = Object.keys(row);
      if (!cols.length) continue;
      const marks = cols.map(() => '?').join(', ');
      const upd = cols.filter(k => k !== 'id').map(k => `${k} = excluded.${k}`).join(', ');
      db.prepare(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${marks})
         ON CONFLICT(id) DO UPDATE SET ${upd}`
      ).run(...cols.map(k => typeof row[k] === 'object' && row[k] !== null ? json(row[k]) : row[k]));
      pulled++;
    }
  }

  db.prepare(
    `INSERT INTO sync_logs (id, direction, status, pulled, failed, details)
     VALUES (?, 'pull', ?, ?, ?, ?)`
  ).run(createUuid(), failed ? 'partial' : 'success', pulled, failed, json({ tables: PULL_TABLES }));

  return { pulled, failed };
}

export function subscribeToRealtime(userId, callback = () => {}) {
  if (!supabase) return () => {};

  const channel = supabase.channel(`rafiq:${userId}`);
  for (const table of REALTIME_TABLES) {
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter: table === 'gas_alerts' || table === 'fall_detection_events' ? undefined : `user_id=eq.${userId}`,
    }, (payload) => {
      const event = {
        type: table,
        data: payload.new ?? payload.old,
        event: payload.eventType,
        timestamp: new Date().toISOString(),
      };
      broadcastAlert(event);
      callback(event);
    });
  }

  channel.subscribe();
  realtimeChannels.set(userId, channel);

  return () => {
    channel.unsubscribe();
    realtimeChannels.delete(userId);
  };
}

export async function pushNotification(notification) {
  if (!supabase) return null;

  const payload = {
    id: notification.id ?? createUuid(),
    source: 'backend',
    is_read: false,
    is_pinned: notification.severity === 'critical',
    ...notification,
  };
  const { data, error } = await supabase
    .from('notifications')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[sync] Push notification failed:', error.message);
    return null;
  }

  broadcastAlert({ type: 'notification', data, timestamp: new Date().toISOString() });
  return data;
}

export async function checkSupabaseHealth() {
  if (!supabase) return { healthy: false, reason: 'Not initialized' };

  try {
    const { error } = await supabase.from('patients').select('id').limit(1);
    return { healthy: !error, reason: error?.message };
  } catch (err) {
    return { healthy: false, reason: err.message };
  }
}
