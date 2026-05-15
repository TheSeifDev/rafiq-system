/**
 * services/connectionManager.js
 * Reconnection recovery, cursor reconciliation, missed changes
 */

import { getDb } from '../db/index.js';
import { cairoNow } from '../db/utils.js';
import { getSupabase } from '../sync/supabase.js';
import { getAllSyncStates, updateSyncState, getDevice, updateHeartbeat } from './deviceRegistry.js';

// ── Handle Reconnect ────────────────────────────────────────────────────────────

export function handleReconnect(deviceId) {
  const device = getDevice(deviceId);
  if (!device) return null;

  // Update heartbeat immediately on reconnect
  updateHeartbeat(deviceId);

  // Reconcile cursors after reconnect
  const cursors = reconcileCursors(deviceId);

  return {
    device,
    cursors,
    lastSeen: device.last_seen,
  };
}

// ── Reconcile Cursors ──────────────────────────────────────────────────────────

export function reconcileCursors(deviceId) {
  const db = getDb();
  const supabase = getSupabase();
  const states = getAllSyncStates(deviceId);
  const reconciled = [];

  for (const state of states) {
    // Get the current server cursor for comparison
    const serverCursor = supabase
      ? getServerCursor(supabase, state.table_name, deviceId)
      : state.cursor_position;

    if (serverCursor > state.cursor_position) {
      // Server has more data — device is behind, will fetch missed changes
      reconciled.push({
        table_name: state.table_name,
        device_cursor: state.cursor_position,
        server_cursor: serverCursor,
        delta: serverCursor - state.cursor_position,
        action: 'fetch',
      });
    } else if (serverCursor < state.cursor_position) {
      // Device has more data — will push to server
      reconciled.push({
        table_name: state.table_name,
        device_cursor: state.cursor_position,
        server_cursor: serverCursor,
        delta: state.cursor_position - serverCursor,
        action: 'push',
      });
    } else {
      reconciled.push({
        table_name: state.table_name,
        device_cursor: state.cursor_position,
        server_cursor: serverCursor,
        delta: 0,
        action: 'synced',
      });
    }
  }

  return reconciled;
}

// ── Fetch Missed Changes ──────────────────────────────────────────────────────

export function fetchMissedChanges(deviceId, lastCursor) {
  const db = getDb();
  const supabase = getSupabase();
  if (!supabase) return { changes: [], count: 0 };

  // Get device to know its patient_id and sync scope
  const device = getDevice(deviceId);
  if (!device) return { changes: [], count: 0 };

  const changes = [];
  const cursor = lastCursor ?? device.sync_cursor ?? 0;

  // Define which tables to check for missed changes
  const syncTables = [
    'alerts', 'reminders', 'notifications',
    'locations', 'vitals', 'medications',
  ];

  for (const table of syncTables) {
    const { data, error } = supabase
      .from(table)
      .select('*')
      .gt('id', cursor)
      .order('id', { ascending: true })
      .limit(500);

    if (error) {
      console.warn(`[conn] fetchMissedChanges ${table}:`, error.message);
      continue;
    }

    for (const row of data ?? []) {
      // Apply to local DB
      const cols = Object.keys(row).join(', ');
      const marks = Object.keys(row).map(() => '?').join(', ');
      const vals = Object.values(row);
      const upd = Object.keys(row)
        .filter(k => k !== 'id')
        .map(k => `${k} = excluded.${k}`)
        .join(', ');

      try {
        db.prepare(`
          INSERT INTO ${table} (${cols}) VALUES (${marks})
          ON CONFLICT(id) DO UPDATE SET ${upd}
        `).run(...vals);

        changes.push({ table, id: row.id });
      } catch (e) {
        console.warn(`[conn] applyMissedChange ${table}#${row.id}:`, e.message);
      }
    }

    // Update sync state cursor
    if (data?.length > 0) {
      const maxId = Math.max(...data.map(r => r.id));
      updateSyncState(deviceId, table, maxId);
    }
  }

  // Update device global cursor
  const maxChangeId = changes.length > 0 ? Math.max(...changes.map(c => c.id)) : cursor;
  db.prepare('UPDATE devices SET sync_cursor = ? WHERE id = ?').run(maxChangeId, deviceId);

  return { changes, count: changes.length };
}

// ── Get Missed Events ──────────────────────────────────────────────────────────

export function getMissedEvents(deviceId, since) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const device = getDevice(deviceId);
  if (!device) return [];

  const sinceTs = since ?? new Date(Date.now() - 5 * 60 * 1000).toISOString(); // default last 5 min
  const events = [];

  // Critical events: emergency_logs, gas_alerts, fall_events, alerts
  const eventTables = [
    { table: 'emergency_logs', type: 'emergency' },
    { table: 'gas_alerts', type: 'gas_alert' },
    { table: 'fall_events', type: 'fall' },
    { table: 'alerts', type: 'alert' },
  ];

  for (const { table, type } of eventTables) {
    const { data, error } = supabase
      .from(table)
      .select('*')
      .gte('created_at', sinceTs)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn(`[conn] getMissedEvents ${table}:`, error.message);
      continue;
    }

    for (const row of data ?? []) {
      events.push({
        event_type: type,
        table,
        data: row,
        timestamp: row.created_at,
      });
    }
  }

  return events;
}

// ── Get Online Devices ──────────────────────────────────────────────────────────

export function getOnlineDevices() {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM devices WHERE status = 'online' ORDER BY last_seen DESC
  `).all();
}

// ── Prune Stale Sessions ────────────────────────────────────────────────────────

export function pruneStaleSessions(maxAgeMinutes = 60) {
  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000)
    .toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' })
    .replace(' ', 'T') + '+02:00';

  const { changes } = db.prepare(`
    DELETE FROM device_sessions WHERE last_activity < ?
  `).run(cutoff);

  return changes;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getServerCursor(supabase, tableName, deviceId) {
  // Try to get max id from server as cursor estimate
  const { data, error } = supabase
    .from(tableName)
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  return error ? 0 : (data?.id ?? 0);
}