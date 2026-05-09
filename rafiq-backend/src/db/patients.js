/**
 * db/patients.js - Patient queries
 */

import { getDb } from './index.js';
import { cairoNow, enqueueSync } from './utils.js';

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
  const { lastInsertRowid } = stmt.run({
    name: data.name,
    age: data.age ?? null,
    medical_history: data.medical_history ?? null,
    notes: data.notes ?? null,
  });
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

  if (!fields) return getPatient(id);

  const params = { ...data, updated_at: cairoNow(), id };
  db.prepare(`UPDATE patients SET ${fields}, updated_at = @updated_at WHERE id = @id`).run(params);
  const row = getPatient(id);
  enqueueSync(db, 'patients', 'UPDATE', id, row);
  return row;
}

export function deletePatient(id) {
  const db = getDb();
  enqueueSync(db, 'patients', 'DELETE', id, { id });
  db.prepare('DELETE FROM patients WHERE id = ?').run(id);
}

export function listReminders({ patientId, done } = {}) {
  let q = 'SELECT * FROM reminders WHERE 1=1';
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (done !== undefined) { q += ' AND done = ?'; params.push(done ? 1 : 0); }
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
  ).run({
    patient_id: data.patient_id,
    title: data.title,
    description: data.description ?? null,
    time: data.time,
    repeat: data.repeat ?? 'none',
  });
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

export function listContacts(patientId) {
  return getDb().prepare('SELECT * FROM emergency_contacts WHERE patient_id = ?').all(patientId);
}