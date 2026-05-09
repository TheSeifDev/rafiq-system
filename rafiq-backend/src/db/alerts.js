/**
 * db/alerts.js - Alert queries
 */

import { getDb } from './index.js';
import { enqueueSync } from './utils.js';

export function listAlerts({ patientId, limit = 20, resolved } = {}) {
  let q = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (resolved !== undefined) { q += ' AND resolved = ?'; params.push(resolved ? 1 : 0); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(q).all(...params);
}

export function getAlert(id) {
  return getDb().prepare('SELECT * FROM alerts WHERE id = ?').get(id);
}

export function createAlert(data) {
  const db = getDb();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO alerts (patient_id, type, message, severity, source)
     VALUES (@patient_id, @type, @message, @severity, @source)`
  ).run({
    patient_id: data.patient_id ?? null,
    type: data.type || 'general',
    message: data.message,
    severity: data.severity || 'medium',
    source: data.source ?? null,
  });
  const row = db.prepare('SELECT * FROM alerts WHERE id = ?').get(lastInsertRowid);
  enqueueSync(db, 'alerts', 'INSERT', lastInsertRowid, row);
  return row;
}

export function resolveAlert(id) {
  const db = getDb();
  db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?').run(id);
  const row = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  enqueueSync(db, 'alerts', 'UPDATE', id, row);
  return row;
}

export function deleteAlert(id) {
  const db = getDb();
  enqueueSync(db, 'alerts', 'DELETE', id, { id });
  db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
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

export function createEmergencyEvent(data) {
  const db = getDb();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO emergency_events (patient_id, alert_id, type, status, location)
     VALUES (@patient_id, @alert_id, @type, @status, @location)`
  ).run({
    patient_id: data.patient_id ?? null,
    alert_id: data.alert_id ?? null,
    type: data.type || 'general',
    status: data.status || 'active',
    location: data.location ?? null,
  });
  const row = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(lastInsertRowid);
  enqueueSync(db, 'emergency_events', 'INSERT', lastInsertRowid, row);
  return row;
}

export function resolveEmergencyEvent(id) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE emergency_events SET status = ?, resolved_at = ? WHERE id = ?')
    .run('resolved', now, id);
  return db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(id);
}