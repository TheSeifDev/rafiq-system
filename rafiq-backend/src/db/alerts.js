/**
 * db/alerts.js - UUID-first alert and emergency event queries
 */

import { getDb } from './index.js';
import { createUuid, enqueueSync, isoNow, json } from './utils.js';

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
  const id = data.id ?? createUuid();
  db.prepare(
    `INSERT INTO alerts
      (id, patient_id, user_id, emergency_event_id, type, message, severity, source, data)
     VALUES
      (@id, @patient_id, @user_id, @emergency_event_id, @type, @message, @severity, @source, @data)`
  ).run({
    id,
    patient_id: data.patient_id ?? null,
    user_id: data.user_id ?? null,
    emergency_event_id: data.emergency_event_id ?? null,
    type: data.type || 'general',
    message: data.message,
    severity: data.severity || 'medium',
    source: data.source ?? null,
    data: json(data.data),
  });
  const row = getAlert(id);
  enqueueSync(db, 'alerts', 'upsert', id, row, { user_id: row.user_id, priority: row.severity === 'critical' ? 'critical' : 'normal' });
  return row;
}

export function resolveAlert(id) {
  const db = getDb();
  db.prepare('UPDATE alerts SET resolved = 1, updated_at = ? WHERE id = ?').run(isoNow(), id);
  const row = getAlert(id);
  enqueueSync(db, 'alerts', 'update', id, row, { user_id: row?.user_id });
  return row;
}

export function deleteAlert(id) {
  const db = getDb();
  const row = getAlert(id);
  enqueueSync(db, 'alerts', 'delete', id, { id }, { user_id: row?.user_id });
  db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
}

export function listEmergencyEvents({ patientId, status } = {}) {
  let q = 'SELECT * FROM emergency_events WHERE 1=1';
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (status !== undefined) { q += ' AND status = ?'; params.push(status); }
  q += ' ORDER BY triggered_at DESC';
  return getDb().prepare(q).all(...params);
}

export function createEmergencyEvent(data) {
  const db = getDb();
  const id = data.id ?? createUuid();
  db.prepare(
    `INSERT INTO emergency_events
      (id, patient_id, user_id, type, severity, status, message, latitude, longitude,
       location_name, source, source_event_id, data)
     VALUES
      (@id, @patient_id, @user_id, @type, @severity, @status, @message, @latitude, @longitude,
       @location_name, @source, @source_event_id, @data)`
  ).run({
    id,
    patient_id: data.patient_id ?? null,
    user_id: data.user_id ?? null,
    type: data.type || 'general',
    severity: data.severity || 'high',
    status: data.status || 'active',
    message: data.message ?? null,
    latitude: data.latitude ?? data.location?.lat ?? null,
    longitude: data.longitude ?? data.location?.lng ?? null,
    location_name: data.location_name ?? data.location ?? null,
    source: data.source ?? 'backend',
    source_event_id: data.source_event_id ?? null,
    data: json(data.data),
  });
  const row = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(id);
  enqueueSync(db, 'emergency_events', 'upsert', id, row, { user_id: row.user_id, priority: 'critical' });
  return row;
}

export function resolveEmergencyEvent(id) {
  const db = getDb();
  db.prepare(
    `UPDATE emergency_events
     SET status = 'resolved', resolved = 1, resolved_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(isoNow(), isoNow(), id);
  const row = db.prepare('SELECT * FROM emergency_events WHERE id = ?').get(id);
  enqueueSync(db, 'emergency_events', 'update', id, row, { user_id: row?.user_id, priority: 'critical' });
  return row;
}

export function createGasAlert(data) {
  const db = getDb();
  const id = data.id ?? createUuid();
  db.prepare(
    `INSERT INTO gas_alerts
      (id, patient_id, user_id, device_id, level, concentration_ppm, location, raw_payload)
     VALUES
      (@id, @patient_id, @user_id, @device_id, @level, @concentration_ppm, @location, @raw_payload)`
  ).run({
    id,
    patient_id: data.patient_id ?? null,
    user_id: data.user_id ?? null,
    device_id: data.device_id ?? null,
    level: data.level ?? 'warning',
    concentration_ppm: data.concentration_ppm ?? data.concentration ?? null,
    location: data.location ?? null,
    raw_payload: json(data.raw_payload ?? data),
  });
  const row = db.prepare('SELECT * FROM gas_alerts WHERE id = ?').get(id);
  enqueueSync(db, 'gas_alerts', 'upsert', id, row, { user_id: row.user_id, priority: row.level === 'critical' ? 'critical' : 'high' });
  return row;
}

export function createFallDetectionEvent(data) {
  const db = getDb();
  const id = data.id ?? createUuid();
  db.prepare(
    `INSERT INTO fall_detection_events
      (id, patient_id, user_id, device_id, severity, confidence, location_name, emergency_triggered, raw_payload)
     VALUES
      (@id, @patient_id, @user_id, @device_id, @severity, @confidence, @location_name, @emergency_triggered, @raw_payload)`
  ).run({
    id,
    patient_id: data.patient_id ?? null,
    user_id: data.user_id ?? null,
    device_id: data.device_id ?? null,
    severity: data.severity ?? 'critical',
    confidence: data.confidence ?? null,
    location_name: data.location_name ?? data.location ?? null,
    emergency_triggered: data.emergency_triggered === false ? 0 : 1,
    raw_payload: json(data.raw_payload ?? data),
  });
  const row = db.prepare('SELECT * FROM fall_detection_events WHERE id = ?').get(id);
  enqueueSync(db, 'fall_detection_events', 'upsert', id, row, { user_id: row.user_id, priority: 'critical' });
  return row;
}
