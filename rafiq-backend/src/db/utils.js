/**
 * db/utils.js - Database helper utilities
 */

import { randomUUID } from 'crypto';

export function createUuid() {
  return randomUUID();
}

export function isoNow() {
  return new Date().toISOString();
}

export function cairoNow() {
  return isoNow();
}

export function json(value, fallback = {}) {
  if (value === undefined || value === null) return JSON.stringify(fallback);
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify(fallback);
  }
}

export function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function enqueueSync(db, table, op, id, payload, options = {}) {
  const operation = String(op || 'upsert').toLowerCase();
  const userId = options.user_id ?? options.userId ?? payload?.user_id ?? null;
  const deviceId = options.device_id ?? options.deviceId ?? payload?.device_id ?? null;
  const idempotencyKey = options.idempotency_key ?? `${table}:${id}:${operation}`;
  const now = isoNow();

  db.prepare(
    `INSERT INTO pending_sync
      (id, user_id, device_id, table_name, record_id, operation, payload, idempotency_key, priority, status, created_at, updated_at)
     VALUES (@id, @user_id, @device_id, @table_name, @record_id, @operation, @payload, @idempotency_key, @priority, 'pending', @now, @now)
     ON CONFLICT(user_id, idempotency_key) DO UPDATE SET
       payload = excluded.payload,
       operation = excluded.operation,
       priority = excluded.priority,
       status = 'pending',
       last_error = NULL,
       updated_at = excluded.updated_at`
  ).run({
    id: createUuid(),
    user_id: userId,
    device_id: deviceId,
    table_name: table,
    record_id: id,
    operation,
    payload: json(payload),
    idempotency_key: idempotencyKey,
    priority: options.priority ?? 'normal',
    now,
  });
}

export function popSyncQueue(db, limit = 50) {
  return db.prepare(
    `SELECT * FROM pending_sync
     WHERE status = 'pending' AND datetime(next_attempt_at) <= datetime('now')
     ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
       created_at ASC
     LIMIT ?`
  ).all(limit);
}

export function deleteSyncItems(db, ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM pending_sync WHERE id IN (${placeholders})`).run(...ids);
}

export function incrementSyncAttempts(db, ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  const now = isoNow();
  db.prepare(
    `UPDATE pending_sync
     SET attempts = attempts + 1,
         next_attempt_at = datetime('now', '+' || MIN(300, (1 << attempts) * 5) || ' seconds'),
         status = 'pending',
         updated_at = ?
     WHERE id IN (${placeholders})`
  ).run(now, ...ids);
}
