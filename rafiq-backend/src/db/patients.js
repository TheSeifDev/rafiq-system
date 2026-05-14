/**
 * db/patients.js - UUID-first patient, reminder, and contact queries
 */

import { getDb } from './index.js';
import { createUuid, enqueueSync, isoNow, json } from './utils.js';

const PATIENT_UPDATE_FIELDS = new Set([
  'user_id', 'full_name', 'name', 'age', 'gender', 'blood_type', 'phone', 'birth_date',
  'medical_history', 'notes', 'address_data', 'reporter_data', 'hospital_data',
  'latitude', 'longitude', 'geocoded_address', 'version', 'deleted_at',
]);

export function listPatients() {
  return getDb().prepare('SELECT * FROM patients WHERE deleted_at IS NULL ORDER BY updated_at DESC').all();
}

export function getPatient(id) {
  return getDb().prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

export function createPatient(data) {
  const db = getDb();
  const id = data.id ?? createUuid();
  const fullName = data.full_name ?? data.name;
  if (!fullName?.trim()) throw new Error('full_name or name is required');

  db.prepare(
    `INSERT INTO patients
      (id, legacy_id, user_id, full_name, name, age, gender, blood_type, phone, birth_date,
       medical_history, notes, address_data, reporter_data, hospital_data, latitude, longitude,
       geocoded_address, version)
     VALUES
      (@id, @legacy_id, @user_id, @full_name, @name, @age, @gender, @blood_type, @phone, @birth_date,
       @medical_history, @notes, @address_data, @reporter_data, @hospital_data, @latitude, @longitude,
       @geocoded_address, @version)`
  ).run({
    id,
    legacy_id: data.legacy_id ?? null,
    user_id: data.user_id ?? null,
    full_name: fullName,
    name: data.name ?? fullName,
    age: data.age ?? null,
    gender: data.gender ?? null,
    blood_type: data.blood_type ?? null,
    phone: data.phone ?? null,
    birth_date: data.birth_date ?? null,
    medical_history: data.medical_history ?? null,
    notes: data.notes ?? null,
    address_data: json(data.address_data),
    reporter_data: json(data.reporter_data),
    hospital_data: json(data.hospital_data),
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    geocoded_address: data.geocoded_address ?? null,
    version: data.version ?? 1,
  });

  const row = getPatient(id);
  enqueueSync(db, 'patients', 'upsert', id, row, { user_id: row.user_id, priority: 'high' });
  return row;
}

export function updatePatient(id, data) {
  const db = getDb();
  const patch = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (PATIENT_UPDATE_FIELDS.has(key)) patch[key] = ['address_data', 'reporter_data', 'hospital_data'].includes(key) ? json(value) : value;
  }

  const keys = Object.keys(patch);
  if (!keys.length) return getPatient(id);

  patch.updated_at = isoNow();
  patch.version = data.version ?? db.prepare('SELECT COALESCE(version, 0) + 1 AS v FROM patients WHERE id = ?').get(id)?.v ?? 1;
  if (!keys.includes('version')) keys.push('version');
  keys.push('updated_at');

  db.prepare(`UPDATE patients SET ${keys.map(k => `${k} = @${k}`).join(', ')} WHERE id = @id`)
    .run({ ...patch, id });
  const row = getPatient(id);
  enqueueSync(db, 'patients', 'update', id, row, { user_id: row?.user_id, priority: 'high' });
  return row;
}

export function deletePatient(id) {
  const db = getDb();
  const row = getPatient(id);
  db.prepare('UPDATE patients SET deleted_at = ?, updated_at = ? WHERE id = ?').run(isoNow(), isoNow(), id);
  enqueueSync(db, 'patients', 'delete', id, { id }, { user_id: row?.user_id, priority: 'high' });
}

export function listReminders({ patientId, done } = {}) {
  let q = 'SELECT * FROM reminders WHERE deleted_at IS NULL';
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (done !== undefined) { q += ' AND done = ?'; params.push(done ? 1 : 0); }
  q += ' ORDER BY COALESCE(datetime, time), created_at ASC';
  return getDb().prepare(q).all(...params);
}

export function createReminder(data) {
  const when = data.datetime ?? data.time;
  if (!when?.match(/[+-]\d{2}:\d{2}$|Z$/)) {
    throw new Error('time/datetime must include explicit timezone (+02:00 or Z)');
  }

  const db = getDb();
  const id = data.id ?? createUuid();
  db.prepare(
    `INSERT INTO reminders
      (id, patient_id, user_id, title, description, type, time, datetime, repeat, repeat_pattern, source)
     VALUES
      (@id, @patient_id, @user_id, @title, @description, @type, @time, @datetime, @repeat, @repeat_pattern, @source)`
  ).run({
    id,
    patient_id: data.patient_id,
    user_id: data.user_id ?? null,
    title: data.title,
    description: data.description ?? null,
    type: data.type ?? 'general',
    time: data.time ?? when,
    datetime: data.datetime ?? when,
    repeat: data.repeat ?? 'none',
    repeat_pattern: data.repeat_pattern ?? data.repeat ?? null,
    source: data.source ?? 'backend',
  });
  const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  enqueueSync(db, 'reminders', 'upsert', id, row, { user_id: row.user_id });
  return row;
}

export function markReminderDone(id) {
  const db = getDb();
  db.prepare('UPDATE reminders SET done = 1, completed = 1, completed_at = ?, updated_at = ? WHERE id = ?')
    .run(isoNow(), isoNow(), id);
  const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  enqueueSync(db, 'reminders', 'update', id, row, { user_id: row?.user_id });
  return row;
}

export function listContacts(patientId) {
  return getDb().prepare('SELECT * FROM emergency_contacts WHERE patient_id = ? ORDER BY priority ASC').all(patientId);
}
