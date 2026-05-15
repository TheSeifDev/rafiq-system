/**
 * sync/supabase.js
 * Background sync: SQLite _sync_queue → Supabase
 * Runs every 30s, handles INSERT / UPDATE / DELETE
 * Enhanced with priority-based sync and device tracking
 */

import { createClient } from '@supabase/supabase-js';
import { getDb } from '../db/index.js';
import { popSyncQueue, deleteSyncItems, incrementSyncAttempts, recordSyncAttempt, getSyncMetrics, TABLE_PRIORITY } from '../services/syncPriorities.js';
import { broadcastAlert } from '../sockets/sse.js';

// Tables allowed to push to Supabase
const PUSH_TABLES = new Set([
  'patients', 'alerts', 'reminders', 'emergency_contacts',
  'locations', 'devices', 'notifications', 'medications',
  'medication_logs', 'vitals', 'wearables', 'gas_alerts',
  'fall_events', 'ai_conversations', 'ai_messages',
  'forbidden_foods', 'favorite_foods', 'smart_home_devices'
]);

// Tables for realtime subscriptions
const REALTIME_TABLES = [
  'notifications',
  'emergency_logs',
  'gas_alerts',
  'fall_events',
  'vitals',
];

let supabase = null;
const realtimeChannels = new Map();

export function initSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.warn('[sync] SUPABASE_URL/KEY not set — sync disabled');
    return false;
  }
  supabase = createClient(url, key);
  console.log('[sync] Supabase client ready');
  return true;
}

export function getSupabase() {
  return supabase;
}

export async function flushQueue() {
  if (!supabase) return { pushed: 0, dropped: 0, failed: 0 };

  const db = getDb();
  const items = popSyncQueue(db, 50);
  if (!items.length) return { pushed: 0, dropped: 0, failed: 0 };

  const pushed = [], dropped = [], failed = [];

  for (const item of items) {
    if (!PUSH_TABLES.has(item.table_name)) {
      dropped.push(item.id);
      continue;
    }

    let payload;
    try { payload = JSON.parse(item.payload); } catch {
      dropped.push(item.id);
      continue;
    }

    try {
      if (item.operation === 'DELETE') {
        const { error } = await supabase
          .from(item.table_name)
          .delete()
          .eq('id', item.record_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(item.table_name)
          .upsert(payload, { onConflict: 'id' });
        if (error) throw error;
      }
      pushed.push(item.id);
    } catch (err) {
      console.error(`[sync] Failed ${item.table_name}#${item.record_id}:`, err.message);
      if (item.attempts >= 5) {
        dropped.push(item.id);
      } else {
        failed.push(item.id);
      }
    }
  }

  deleteSyncItems(db, [...pushed, ...dropped]);
  incrementSyncAttempts(db, failed);

  return { pushed: pushed.length, dropped: dropped.length, failed: failed.length };
}

export function startSyncLoop(intervalMs = 30_000) {
  if (!supabase) return;
  setInterval(async () => {
    const r = await flushQueue().catch(e => ({ error: e.message }));
    if (r.pushed > 0 || r.failed > 0) {
      console.log('[sync]', JSON.stringify(r));
    }
  }, intervalMs);
}

// ── Pull (Supabase → local) ───────────────────────────────────────────────────
const PULL_TABLES = ['patients', 'emergency_contacts', 'reminders'];

export async function pullFromSupabase(db) {
  if (!supabase) return { pulled: 0 };
  let total = 0;

  for (const table of PULL_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true });
    if (error) { console.error('[sync pull]', table, error.message); continue; }

    for (const row of data ?? []) {
      const cols  = Object.keys(row).join(', ');
      const marks = Object.keys(row).map(() => '?').join(', ');
      const vals  = Object.values(row);
      const upd   = Object.keys(row)
        .filter(k => k !== 'id')
        .map(k => `${k} = excluded.${k}`)
        .join(', ');
      db.prepare(
        `INSERT INTO ${table} (${cols}) VALUES (${marks})
         ON CONFLICT(id) DO UPDATE SET ${upd}`
      ).run(...vals);
      total++;
    }
  }

  return { pulled: total };
}

// ── Realtime Subscriptions ───────────────────────────────────────────────────

export function subscribeToRealtime(userId, callback) {
  if (!supabase) return () => {};

  // Subscribe to critical alerts
  const channel = supabase
    .channel(`rafiq:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const notification = payload.new;
      // Broadcast to WebSocket clients
      broadcastAlert({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString(),
      });
      callback(notification);
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'emergency_logs',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      broadcastAlert({
        type: 'emergency_alert',
        data: payload.new,
        timestamp: new Date().toISOString(),
      });
      callback({ type: 'emergency', data: payload.new });
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'gas_alerts',
    }, (payload) => {
      if (payload.new.level === 'danger' || payload.new.level === 'critical') {
        broadcastAlert({
          type: 'gas_alert',
          data: payload.new,
          timestamp: new Date().toISOString(),
        });
        callback({ type: 'gas_alert', data: payload.new });
      }
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'fall_events',
    }, (payload) => {
      broadcastAlert({
        type: 'fall_detected',
        data: payload.new,
        timestamp: new Date().toISOString(),
      });
      callback({ type: 'fall', data: payload.new });
    })
    .subscribe();

  realtimeChannels.set(userId, channel);

  return () => {
    channel.unsubscribe();
    realtimeChannels.delete(userId);
  };
}

// ── Push helpers for notifications ──────────────────────────────────────────

export async function pushNotification(notification) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error) {
    console.error('[sync] Push notification failed:', error);
    return null;
  }

  // Broadcast immediately
  broadcastAlert({
    type: 'notification',
    data,
    timestamp: new Date().toISOString(),
  });

  return data;
}

// ── Health check ─────────────────────────────────────────────────────────────

export async function checkSupabaseHealth() {
  if (!supabase) return { healthy: false, reason: 'Not initialized' };

  try {
    const { error } = await supabase.from('patients').select('id').limit(1);
    return { healthy: !error, reason: error?.message };
  } catch (err) {
    return { healthy: false, reason: err.message };
  }
}
