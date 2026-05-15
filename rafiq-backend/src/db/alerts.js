/**
 * db/alerts.js - Alert queries with soft-delete support
 */

import { getDb } from './index.js';
import { cairoNow, enqueueSync } from './utils.js';
import { log_action } from './audit.js';
import { increment_version } from './versions.js';
import { record_sync } from './sync_state.js';

const DEFAULT_ACTOR = 'system';
const TABLE_NAME = 'alerts';

// Base query helper - filters soft-deleted by default
function baseQuery(where = '1=1', params = []) {
  return `SELECT * FROM ${TABLE_NAME} WHERE is_deleted = 0 AND ${where}`;
}

export function listAlerts({ patientId, limit = 20, resolved, includeDeleted = false } = {}) {
  let q = includeDeleted
    ? `SELECT * FROM ${TABLE_NAME} WHERE 1=1`
    : baseQuery();
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (resolved !== undefined) { q += ' AND resolved = ?'; params.push(resolved ? 1 : 0); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(q).all(...params);
}

export function getAlert(id, { includeDeleted = false } = {}) {
  const q = includeDeleted
    ? `SELECT * FROM ${TABLE_NAME} WHERE id = ?`
    : baseQuery('id = ?', [id]);
  return getDb().prepare(q).get(id);
}

export function createAlert(data, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const now = cairoNow();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO alerts (patient_id, type, message, severity, source, created_at)
     VALUES (@patient_id, @type, @message, @severity, @source, @created_at)`
  ).run({
    patient_id: data.patient_id ?? null,
    type: data.type || 'general',
    message: data.message,
    severity: data.severity || 'medium',
    source: data.source ?? null,
    created_at: now,
  });

  const after = db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`).get(lastInsertRowid);
  log_action(actor, device, 'INSERT', TABLE_NAME, lastInsertRowid, null, after);
  record_sync(TABLE_NAME, lastInsertRowid, 'push');
  return after;
}

export function resolveAlert(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getAlert(id, { includeDeleted: true });
  if (!before) return null;

  const now = cairoNow();
  db.prepare(`UPDATE ${TABLE_NAME} SET resolved = 1 WHERE id = ?`).run(id);
  const after = db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`).get(id);

  increment_version(TABLE_NAME, id);
  log_action(actor, device, 'UPDATE', TABLE_NAME, id, before, after);
  record_sync(TABLE_NAME, id, 'push');

  return after;
}

/**
 * Soft-delete an alert instead of hard delete
 * @param {number} id - Alert id
 * @param {object} opts - { actor, device }
 */
export function deleteAlert(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getAlert(id, { includeDeleted: true });
  if (!before || before.is_deleted) return false;

  const now = cairoNow();
  db.prepare(
    `UPDATE ${TABLE_NAME} SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?`
  ).run(now, actor, id);

  const after = db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`).get(id);
  increment_version(TABLE_NAME, id);
  log_action(actor, device, 'SOFT_DELETE', TABLE_NAME, id, before, after);
  record_sync(TABLE_NAME, id, 'push');

  return true;
}

/**
 * Restore a soft-deleted alert
 * @param {number} id - Alert id
 * @param {object} opts - { actor, device }
 */
export function restoreAlert(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getAlert(id, { includeDeleted: true });
  if (!before || !before.is_deleted) return false;

  const now = cairoNow();
  db.prepare(
    `UPDATE ${TABLE_NAME} SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?`
  ).run(id);

  const after = db.prepare(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`).get(id);
  increment_version(TABLE_NAME, id);
  log_action(actor, device, 'RESTORE', TABLE_NAME, id, before, after);
  record_sync(TABLE_NAME, id, 'push');

  return after;
}

// Emergency events
export function listEmergencyEvents({ patientId, status } = {}) {
  let q = 'SELECT * FROM emergency_events WHERE 1=1';
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (status !== undefined) { q += ' AND status = ?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  return getDb().prepare(q).all(...params);
}

export function createEmergencyEvent(data, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const now = cairoNow();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO emergency_events (patient_id, alert_id, type, status, location, created_at)
     VALUES (@patient_id, @alert_id, @type, @status, @location, @created_at)`
  ).run({
    patient_id: data.patient_id ?? null,
    alert_id: data.alert_id ?? null,
    type: data.type || 'general',
    status: data.status || 'active',
    location: data.location ?? null,
    created_at: now,
  });

  const row = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(lastInsertRowid);
  log_action(actor, device, 'INSERT', 'emergency_events', lastInsertRowid, null, row);
  enqueueSync(db, 'emergency_events', 'INSERT', lastInsertRowid, row);
  return row;
}

export function resolveEmergencyEvent(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const now = cairoNow();
  const before = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(id);
  if (!before) return null;

  db.prepare('UPDATE emergency_events SET status = ?, resolved_at = ? WHERE id = ?')
    .run('resolved', now, id);

  const after = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(id);
  log_action(actor, device, 'UPDATE', 'emergency_events', id, before, after);
  return after;
}