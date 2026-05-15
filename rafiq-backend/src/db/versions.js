/**
 * db/versions.js - Optimistic locking and version tracking
 * Provides version increment, retrieval, and conflict detection
 */

import { getDb } from './index.js';
import { cairoNow } from './utils.js';

/**
 * Increment version for a table row after an update
 * @param {string} table - Table name
 * @param {number} row_id - Primary key
 * @returns {number} New version number
 */
export function increment_version(table, row_id) {
  const db = getDb();
  const now = cairoNow();
  db.prepare(
    `UPDATE ${table} SET version = version + 1, updated_at = ? WHERE id = ?`
  ).run(now, row_id);
  return db.prepare(`SELECT version FROM ${table} WHERE id = ?`).get(row_id).version;
}

/**
 * Get current version for a table row
 * @param {string} table - Table name
 * @param {number} row_id - Primary key
 * @returns {number|null} Version or null if not found
 */
export function get_version(table, row_id) {
  const row = getDb().prepare(`SELECT version FROM ${table} WHERE id = ?`).get(row_id);
  return row ? row.version : null;
}

/**
 * Conflict check for optimistic locking
 * If expected_version matches current, no conflict
 * If expected_version is null, skip check (assume new record)
 * @param {string} table - Table name
 * @param {number} row_id - Primary key
 * @param {number|null} expected_version - Version the client believes is current
 * @returns {{ has_conflict: boolean, current_version: number|null, message: string }}
 */
export function get_conflict_check(table, row_id, expected_version) {
  if (expected_version === null || expected_version === undefined) {
    return { has_conflict: false, current_version: null, message: 'skip' };
  }

  const row = getDb().prepare(`SELECT version, is_deleted FROM ${table} WHERE id = ?`).get(row_id);

  if (!row) {
    return { has_conflict: true, current_version: null, message: 'Record not found' };
  }

  if (row.is_deleted !== undefined && row.is_deleted === 1) {
    return { has_conflict: true, current_version: row.version, message: 'Record was deleted' };
  }

  if (row.version !== expected_version) {
    return {
      has_conflict: true,
      current_version: row.version,
      message: `Version conflict: expected ${expected_version}, found ${row.version}`
    };
  }

  return { has_conflict: false, current_version: row.version, message: 'ok' };
}

/**
 * Get row data with version for sync payload
 * @param {string} table - Table name
 * @param {number} row_id - Primary key
 * @returns {object|null} Row data including version and is_deleted
 */
export function getRowWithVersion(table, row_id) {
  return getDb().prepare(`SELECT *, version, sync_version FROM ${table} WHERE id = ?`).get(row_id);
}