/**
 * services/realtimeRecovery.js
 * Track cursors, detect missed events, and replay on reconnect
 */

import { getDb } from '../db/index.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(__dir, '..', 'db', 'migrations', '004_realtime_cursors.sql');

// Ensure migration is applied
let _migrationApplied = false;
function ensureMigration() {
  if (_migrationApplied) return;
  const db = getDb();
  if (existsSync(MIGRATION)) {
    const sql = readFileSync(MIGRATION, 'utf8');
    db.exec(sql);
  }
  _migrationApplied = true;
}

// ── Cursor Tracking ────────────────────────────────────────────────────────────

/**
 * Track last seen cursor for a device
 */
export function trackRealtimeCursor(deviceId, cursor) {
  ensureMigration();
  const db = getDb();
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' }).replace(' ', 'T') + '+02:00';
  db.prepare(
    `INSERT INTO realtime_cursors (device_id, channel, last_cursor, updated_at)
     VALUES (?, 'main', ?, ?)
     ON CONFLICT(device_id, channel) DO UPDATE SET last_cursor = ?, updated_at = ?`
  ).run(deviceId, cursor, now, cursor, now);
}

/**
 * Get missed events since the last cursor for a device
 */
export function getMissedEventsSince(deviceId, lastCursor) {
  ensureMigration();
  const db = getDb();
  return db.prepare(
    `SELECT * FROM realtime_events
     WHERE device_id = ? AND created_at > ?
     ORDER BY created_at ASC`
  ).all(deviceId, lastCursor || '1970-01-01T00:00:00+02:00');
}

// ── Connection State ──────────────────────────────────────────────────────────

/**
 * Mark device for recovery on disconnect
 */
export function handleRealtimeDisconnect(deviceId) {
  ensureMigration();
  const db = getDb();
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' }).replace(' ', 'T') + '+02:00';
  db.prepare(
    `INSERT OR REPLACE INTO stale_connections (device_id, detected_at, last_ping)
     VALUES (?, ?, NULL)`
  ).run(deviceId, now);
}

/**
 * Pull missing events and mark connection as healthy on reconnect
 */
export function handleRealtimeReconnect(deviceId) {
  ensureMigration();
  const db = getDb();

  // Get last cursor
  const row = db.prepare(
    `SELECT last_cursor FROM realtime_cursors WHERE device_id = ? AND channel = 'main'`
  ).get(deviceId);
  const lastCursor = row?.last_cursor || '';

  // Fetch missed events
  const missed = getMissedEventsSince(deviceId, lastCursor);

  // Clear stale connection entry
  db.prepare('DELETE FROM stale_connections WHERE device_id = ?').run(deviceId);

  return { lastCursor, missed };
}

// ── Event Replay ──────────────────────────────────────────────────────────────

/**
 * Replay events in order — updates device cursor and marks events delivered
 */
export function replayMissedEvents(deviceId, events) {
  ensureMigration();
  const db = getDb();
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' }).replace(' ', 'T') + '+02:00';
  const lastCursor = events.length > 0 ? events[events.length - 1].created_at : null;

  for (const ev of events) {
    // Mark delivered
    db.prepare('UPDATE realtime_events SET delivered = 1 WHERE id = ?').run(ev.id);
  }

  // Update cursor
  if (lastCursor) {
    trackRealtimeCursor(deviceId, lastCursor);
  }

  console.log(`[realtime] Replayed ${events.length} events for device: ${deviceId}`);
  return { replayed: events.length, lastCursor };
}

// ── Stale Detection ──────────────────────────────────────────────────────────

const _lastPings = new Map(); // deviceId → Date.now()

/**
 * Detect stale WebSocket connection (no ping within maxAge ms)
 */
export function detectStaleConnection(deviceId, maxAge = 30000) {
  const lastPing = _lastPings.get(deviceId);
  if (!lastPing) return false;
  return Date.now() - lastPing > maxAge;
}

/**
 * Record a ping from a device
 */
export function recordPing(deviceId) {
  _lastPings.set(deviceId, Date.now());
}

/**
 * Return realtime health metrics
 */
export function getRealtimeHealth() {
  ensureMigration();
  const db = getDb();

  const connectedDevices = db.prepare(
    `SELECT COUNT(DISTINCT device_id) FROM realtime_cursors WHERE updated_at > datetime('now', '-5 minutes')`
  ).get().count;

  const staleCount = db.prepare('SELECT COUNT(*) as cnt FROM stale_connections').get().cnt;

  const missedTotal = db.prepare(
    `SELECT COUNT(*) as cnt FROM realtime_events WHERE delivered = 0`
  ).get().cnt;

  return {
    connected_devices: connectedDevices,
    stale_connections: staleCount,
    missed_event_count: missedTotal,
  };
}