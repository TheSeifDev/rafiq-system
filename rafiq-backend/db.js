/**
 * db.js — SQLite data access layer
 * Uses better-sqlite3 (sync, very fast, perfect for edge nodes)
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dir, '..', 'rafiq.db');

let _db = null;

export function getDb() {
  if (!_db) throw new Error('DB not initialised — call initDb() first');
  return _db;
}

export function initDb() {
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  const schema = readFileSync(join(__dir, '..', 'schema.sql'), 'utf8');
  _db.exec(schema);
  return _db;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function cairoNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' })
    .replace(' ', 'T') + '+02:00';
}

function enqueueSync(db, table, op, id, payload) {
  db.prepare(
    `INSERT INTO _sync_queue (table_name, operation, record_id, payload)
     VALUES (?, ?, ?, ?)`
  ).run(table, op, id, JSON.stringify(payload));
}

// ── Patients ──────────────────────────────────────────────────────────────────

export function listPatients() {
  return getDb().prepare('SELECT * FROM patients ORDER BY id').all();
}

export function getPatient(id) {
  return getDb().prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

export function createPatient(data) {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO patients (name, age, medical_history, notes)
     VALUES (@name, @age, @medical_history, @notes)`
  );
  const { lastInsertRowid } = stmt.run(data);
  const row = getPatient(lastInsertRowid);
  enqueueSync(db, 'patients', 'INSERT', lastInsertRowid, row);
  return row;
}

export function updatePatient(id, data) {
  const db = getDb();
  const fields = Object.keys(data)
    .filter(k => !['id', 'created_at'].includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ');
  db.prepare(`UPDATE patients SET ${fields}, updated_at = ? WHERE id = ?`)
    .run(...Object.values(data), cairoNow(), id);
  const row = getPatient(id);
  enqueueSync(db, 'patients', 'UPDATE', id, row);
  return row;
}

export function deletePatient(id) {
  const db = getDb();
  enqueueSync(db, 'patients', 'DELETE', id, { id });
  db.prepare('DELETE FROM patients WHERE id = ?').run(id);
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export function listAlerts({ patientId, limit = 20, resolved } = {}) {
  let q = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (resolved  !== undefined) { q += ' AND resolved = ?';   params.push(resolved ? 1 : 0); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return getDb().prepare(q).all(...params);
}

export function createAlert(data) {
  const db = getDb();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO alerts (patient_id, type, message, severity, source)
     VALUES (@patient_id, @type, @message, @severity, @source)`
  ).run(data);
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

// ── Reminders ─────────────────────────────────────────────────────────────────

export function listReminders({ patientId, done } = {}) {
  let q = 'SELECT * FROM reminders WHERE 1=1';
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (done      !== undefined) { q += ' AND done = ?';       params.push(done ? 1 : 0); }
  q += ' ORDER BY time ASC';
  return getDb().prepare(q).all(...params);
}

export function createReminder(data) {
  if (!data.time?.match(/[+-]\d{2}:\d{2}$|Z$/)) {
    throw new Error('time must include explicit timezone (+02:00 or Z)');
  }
  const db = getDb();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO reminders (patient_id, title, description, time, repeat)
     VALUES (@patient_id, @title, @description, @time, @repeat)`
  ).run(data);
  const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(lastInsertRowid);
  enqueueSync(db, 'reminders', 'INSERT', lastInsertRowid, row);
  return row;
}

export function markReminderDone(id) {
  const db = getDb();
  db.prepare('UPDATE reminders SET done = 1 WHERE id = ?').run(id);
  const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  enqueueSync(db, 'reminders', 'UPDATE', id, row);
  return row;
}

// ── Devices ───────────────────────────────────────────────────────────────────

export function listDevices(patientId) {
  if (patientId) {
    return getDb().prepare('SELECT * FROM devices WHERE patient_id = ?').all(patientId);
  }
  return getDb().prepare('SELECT * FROM devices').all();
}

export function upsertDevice(data) {
  const db = getDb();
  db.prepare(
    `INSERT INTO devices (patient_id, name, type, status, last_seen, metadata)
     VALUES (@patient_id, @name, @type, @status, @last_seen, @metadata)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       last_seen = excluded.last_seen,
       metadata = excluded.metadata`
  ).run(data);
}

// ── Emergency contacts ────────────────────────────────────────────────────────

export function listContacts(patientId) {
  return getDb().prepare('SELECT * FROM emergency_contacts WHERE patient_id = ?').all(patientId);
}

// ── Smart Home ────────────────────────────────────────────────────────────────

export function listSmartDevices(room) {
  if (room) return getDb().prepare('SELECT * FROM smarthome_devices WHERE room = ?').all(room);
  return getDb().prepare('SELECT * FROM smarthome_devices').all();
}

export function upsertSmartDevice(mqttId, label, room, type) {
  getDb().prepare(
    `INSERT INTO smarthome_devices (mqtt_id, label, room, type)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(mqtt_id) DO NOTHING`
  ).run(mqttId, label, room, type);
}

export function updateSmartDeviceState(mqttId, state, lastVal) {
  const now = cairoNow();
  getDb().prepare(
    `UPDATE smarthome_devices SET state = ?, last_val = ?, updated_at = ? WHERE mqtt_id = ?`
  ).run(state, lastVal ? JSON.stringify(lastVal) : null, now, mqttId);
}

// ── Sync queue ────────────────────────────────────────────────────────────────

export function popSyncQueue(limit = 50) {
  return getDb().prepare(
    'SELECT * FROM _sync_queue ORDER BY id ASC LIMIT ?'
  ).all(limit);
}

export function deleteSyncItems(ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  getDb().prepare(`DELETE FROM _sync_queue WHERE id IN (${placeholders})`).run(...ids);
}

export function incrementSyncAttempts(ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  getDb().prepare(`UPDATE _sync_queue SET attempts = attempts + 1 WHERE id IN (${placeholders})`).run(...ids);
}
