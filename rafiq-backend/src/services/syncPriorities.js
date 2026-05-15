/**
 * services/syncPriorities.js
 * Deterministic sync priorities with exponential backoff
 */

import { getDb } from '../db/index.js';
import { cairoNow } from '../db/utils.js';

// Priority order: lower number = higher priority (sync first)
export const PRIORITY_ORDER = {
  emergency_events: 1,
  alerts:           2,
  notifications:    3,
  vital_signs:      4,
  sensor_readings:  5,
  medications:      6,
  reminders:        7,
  ai_context:       8,
  analytics:        9,
  logs:             10,
};

// Table → priority mapping
const TABLE_PRIORITY = {
  patients:               PRIORITY_ORDER.ai_context,
  emergency_contacts:     PRIORITY_ORDER.emergency_events,
  alerts:                 PRIORITY_ORDER.alerts,
  notifications:          PRIORITY_ORDER.notifications,
  vitals:                 PRIORITY_ORDER.vital_signs,
  wearables:              PRIORITY_ORDER.vital_signs,
  medication_logs:        PRIORITY_ORDER.medications,
  medications:            PRIORITY_ORDER.medications,
  reminders:              PRIORITY_ORDER.reminders,
  locations:              PRIORITY_ORDER.sensor_readings,
  ai_conversations:       PRIORITY_ORDER.ai_context,
  ai_messages:            PRIORITY_ORDER.ai_context,
  gas_alerts:              PRIORITY_ORDER.emergency_events,
  fall_events:             PRIORITY_ORDER.emergency_events,
  emergency_logs:         PRIORITY_ORDER.emergency_events,
  forbidden_foods:        PRIORITY_ORDER.logs,
  favorite_foods:         PRIORITY_ORDER.logs,
  smart_home_devices:     PRIORITY_ORDER.logs,
  devices:                PRIORITY_ORDER.logs,
};

export { TABLE_PRIORITY };

// ── Enqueue with Priority ──────────────────────────────────────────────────────

export function enqueueWithPriority(table, rowId, priority = null, deviceId = null) {
  const db = getDb();
  const p = priority ?? TABLE_PRIORITY[table] ?? 5;

  db.prepare(`
    INSERT INTO _sync_queue (device_id, table_name, operation, record_id, priority, payload, created_at)
    VALUES (?, ?, 'UPSERT', ?, ?, '{}', ?)
  `).run(deviceId, table, rowId, p, cairoNow());
}

// ── Get Next Sync Item ─────────────────────────────────────────────────────────

export function getNextSyncItem(deviceId = null) {
  const db = getDb();

  if (deviceId != null) {
    const item = db.prepare(`
      SELECT * FROM _sync_queue
      WHERE device_id = ? AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ORDER BY priority ASC, id ASC
      LIMIT 1
    `).get(deviceId, cairoNow());

    if (item) return item;
  }

  return db.prepare(`
    SELECT * FROM _sync_queue
    WHERE next_retry_at IS NULL OR next_retry_at <= ?
    ORDER BY priority ASC, id ASC
    LIMIT 1
  `).get(cairoNow());
}

// ── Record Sync Attempt ────────────────────────────────────────────────────────

export function recordSyncAttempt(table, rowId, success, error = null) {
  const db = getDb();

  const item = db.prepare(`
    SELECT * FROM _sync_queue WHERE table_name = ? AND record_id = ?
  `).get(table, rowId);

  if (!item) return;

  if (success) {
    db.prepare('DELETE FROM _sync_queue WHERE id = ?').run(item.id);
    return;
  }

  const attempts = item.attempts + 1;
  const backoffMs = calculateBackoff(attempts);
  const nextRetry = new Date(Date.now() + backoffMs)
    .toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' })
    .replace(' ', 'T') + '+02:00';

  db.prepare(`
    UPDATE _sync_queue
    SET attempts = ?, last_error = ?, next_retry_at = ?
    WHERE id = ?
  `).run(attempts, error, nextRetry, item.id);
}

// ── Calculate Backoff ────────────────────────────────────────────────────────────

export function calculateBackoff(attemptCount) {
  const baseMs = 1000;
  const maxMs = 5 * 60 * 1000;
  return Math.min(baseMs * Math.pow(2, attemptCount), maxMs);
}

// ── Sync Metrics ────────────────────────────────────────────────────────────────

export function getSyncMetrics() {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as count FROM _sync_queue').get().count;
  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM _sync_queue GROUP BY priority ORDER BY priority ASC
  `).all();
  const failed = db.prepare('SELECT COUNT(*) as count FROM _sync_queue WHERE attempts >= 5').get().count;
  const byTable = db.prepare(`
    SELECT table_name, COUNT(*) as count
    FROM _sync_queue GROUP BY table_name ORDER BY count DESC
  `).all();

  return { total, failed, byPriority, byTable };
}

// ── Priority-aware queue flush ─────────────────────────────────────────────────

export function popSyncQueue(limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM _sync_queue
    WHERE next_retry_at IS NULL OR next_retry_at <= ?
    ORDER BY priority ASC, id ASC
    LIMIT ?
  `).all(cairoNow(), limit);
}

export function deleteSyncItems(ids) {
  if (!ids.length) return;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM _sync_queue WHERE id IN (${placeholders})`).run(...ids);
}

export function incrementSyncAttempts(ids) {
  if (!ids.length) return;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE _sync_queue SET attempts = attempts + 1 WHERE id IN (${placeholders})`).run(...ids);
}