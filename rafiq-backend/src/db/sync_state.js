/**
 * db/sync_state.js - Sync state tracking with retry logic
 * Tracks pending syncs with priority, backoff, and attempt counts
 */

import { getDb } from './index.js';
import { cairoNow } from './utils.js';

/**
 * Record a sync operation for a table row
 * @param {string} table - Table name
 * @param {number} row_id - Primary key
 * @param {string} direction - push | pull
 * @param {string} synced_at - Timestamp when synced (null = pending)
 * @param {object} opts - { priority, retry_backoff_ms }
 */
export function record_sync(table, row_id, direction, synced_at = null, { priority = 0, retry_backoff_ms = 1000 } = {}) {
  const db = getDb();
  const now = cairoNow();

  // Check if already exists
  const existing = db.prepare(
    `SELECT id, attempt_count FROM _sync_state WHERE table_name = ? AND row_id = ? AND synced_at IS NULL`
  ).get(table, row_id);

  if (existing) {
    // Update existing pending sync
    db.prepare(
      `UPDATE _sync_state SET attempt_count = attempt_count + 1, retry_backoff_ms = ? WHERE id = ?`
    ).run(retry_backoff_ms, existing.id);
    return existing.id;
  }

  // Calculate next_retry_at with backoff
  const backoffMs = Math.min(retry_backoff_ms * Math.pow(2, existing?.attempt_count || 0), 300000); // max 5 min
  const nextRetry = new Date(Date.now() + backoffMs).toISOString();

  const { lastInsertRowid } = db.prepare(
    `INSERT INTO _sync_state (table_name, row_id, direction, sync_priority, retry_backoff_ms, attempt_count, synced_at, next_retry_at, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
  ).run(table, row_id, direction, priority, retry_backoff_ms, synced_at, synced_at ? null : nextRetry, now);

  return lastInsertRowid;
}

/**
 * Get items needing sync (pending, sorted by priority then retry time)
 * @param {object} opts - { table, limit, max_attempts }
 * @returns {Array} Pending sync items
 */
export function get_pending_syncs({ table = null, limit = 50, max_attempts = 10 } = {}) {
  let q = `SELECT * FROM _sync_state WHERE synced_at IS NULL AND attempt_count < ?`;
  const params = [max_attempts];

  if (table) { q += ' AND table_name = ?'; params.push(table); }

  q += ` ORDER BY sync_priority DESC, next_retry_at ASC LIMIT ?`;
  params.push(limit);

  return getDb().prepare(q).all(...params);
}

/**
 * Mark items as synced by their ids
 * @param {number[]} ids - Array of sync state record ids
 */
export function mark_synced(ids) {
  if (!ids.length) return;
  const db = getDb();
  const now = cairoNow();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(
    `UPDATE _sync_state SET synced_at = ?, attempt_count = 0 WHERE id IN (${placeholders})`
  ).run(now, ...ids);
}

/**
 * Get sync history for a row
 * @param {string} table - Table name
 * @param {number} row_id - Primary key
 * @returns {Array} Sync history entries
 */
export function get_sync_history(table, row_id) {
  return getDb().prepare(
    `SELECT * FROM _sync_state WHERE table_name = ? AND row_id = ? ORDER BY created_at DESC`
  ).all(table, row_id);
}

/**
 * Clear old synced entries (cleanup)
 * @param {number} olderThanDays - Delete synced entries older than this many days
 */
export function clear_synced_before(olderThanDays = 7) {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  return db.prepare(`DELETE FROM _sync_state WHERE synced_at IS NOT NULL AND synced_at < ?`).run(cutoff);
}