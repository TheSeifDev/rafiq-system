/**
 * db/audit.js - Append-only audit logging service
 * All mutations MUST go through this to maintain audit trail
 */

import { getDb } from './index.js';
import { cairoNow } from './utils.js';

/**
 * Log an action to the append-only audit log
 * @param {string} actor - Who/what caused the action (device id, user id, or 'system')
 * @param {string|null} device - Device that performed the action
 * @param {string} action - INSERT | UPDATE | DELETE | SOFT_DELETE | RESTORE | RESOLVE
 * @param {string} entity_type - Table name (patients, alerts, reminders, etc.)
 * @param {number} entity_id - Primary key of the affected row
 * @param {object|null} before - State before the change (null for INSERT)
 * @param {object|null} after - State after the change (null for DELETE)
 */
export function log_action(actor, device, action, entity_type, entity_id, before, after) {
  const db = getDb();
  db.prepare(
    `INSERT INTO _audit_log (actor, device, action, entity_type, entity_id, before, after, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    actor || 'system',
    device || null,
    action,
    entity_type,
    entity_id,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
    cairoNow()
  );
}

/**
 * Get audit trail for a specific entity
 * @param {string} entity_type - Table name
 * @param {number} entity_id - Primary key
 * @returns {Array} Audit entries ordered oldest to newest
 */
export function getAuditTrail(entity_type, entity_id) {
  return getDb().prepare(
    `SELECT * FROM _audit_log
     WHERE entity_type = ? AND entity_id = ?
     ORDER BY created_at ASC`
  ).all(entity_type, entity_id);
}

/**
 * Get audit entries by actor
 * @param {string} actor - Actor to filter by
 * @param {object} opts - { limit, since }
 * @returns {Array} Audit entries
 */
export function getAuditByActor(actor, { limit = 100, since = null } = {}) {
  let q = 'SELECT * FROM _audit_log WHERE actor = ?';
  const params = [actor];
  if (since) { q += ' AND created_at >= ?'; params.push(since); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(q).all(...params);
}

/**
 * Get recent audit entries across all entities
 * @param {object} opts - { limit, entity_type, action }
 * @returns {Array} Audit entries
 */
export function getRecentAudit({ limit = 100, entity_type = null, action = null } = {}) {
  let q = 'SELECT * FROM _audit_log WHERE 1=1';
  const params = [];
  if (entity_type) { q += ' AND entity_type = ?'; params.push(entity_type); }
  if (action) { q += ' AND action = ?'; params.push(action); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(q).all(...params);
}

// Prevent direct UPDATE/DELETE on audit_log at application level
// (SQLite does not support prevention rules, so this is enforced in code only)
// Always use log_action() instead of direct table access