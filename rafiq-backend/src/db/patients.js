/**
 * db/patients.js - Patient queries with soft-delete, audit, and versioning
 */

import { getDb } from './index.js';
import { cairoNow, enqueueSync } from './utils.js';
import { log_action } from './audit.js';
import { increment_version } from './versions.js';
import { record_sync } from './sync_state.js';

const DEFAULT_ACTOR = 'system';

export function listPatients({ includeDeleted = false } = {}) {
  const q = includeDeleted
    ? 'SELECT * FROM patients ORDER BY id'
    : 'SELECT * FROM patients WHERE is_deleted = 0 ORDER BY id';
  return getDb().prepare(q).all();
}

export function getPatient(id, { includeDeleted = false } = {}) {
  const q = includeDeleted
    ? 'SELECT * FROM patients WHERE id = ?'
    : 'SELECT * FROM patients WHERE id = ? AND is_deleted = 0';
  return getDb().prepare(q).get(id);
}

export function createPatient(data, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const now = cairoNow();
  const stmt = db.prepare(
    `INSERT INTO patients (name, age, medical_history, notes, created_at, updated_at, version)
     VALUES (@name, @age, @medical_history, @notes, @created_at, @updated_at, 1)`
  );
  const { lastInsertRowid } = stmt.run({
    name: data.name,
    age: data.age ?? null,
    medical_history: data.medical_history ?? null,
    notes: data.notes ?? null,
    created_at: now,
    updated_at: now,
  });

  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(lastInsertRowid);
  log_action(actor, device, 'INSERT', 'patients', lastInsertRowid, null, row);
  record_sync('patients', lastInsertRowid, 'push');
  return row;
}

export function updatePatient(id, data, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getPatient(id, { includeDeleted: true });
  if (!before) return null;

  const allowed = ['name', 'age', 'medical_history', 'notes', 'updated_by_device'];
  const fields = Object.keys(data)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ');

  if (!fields) return getPatient(id);

  const now = cairoNow();
  const params = { ...data, updated_at: now, id };
  db.prepare(`UPDATE patients SET ${fields}, updated_at = @updated_at, updated_by_device = @updated_by_device WHERE id = @id`).run(params);

  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  increment_version('patients', id);
  log_action(actor, device, 'UPDATE', 'patients', id, before, row);
  record_sync('patients', id, 'push');
  return row;
}

/**
 * Soft-delete a patient instead of hard delete
 * Cascades to related records via foreign key constraints
 */
export function deletePatient(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getPatient(id, { includeDeleted: true });
  if (!before || before.is_deleted) return false;

  const now = cairoNow();
  db.prepare(
    `UPDATE patients SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?`
  ).run(now, actor, id);

  const after = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  increment_version('patients', id);
  log_action(actor, device, 'SOFT_DELETE', 'patients', id, before, after);
  record_sync('patients', id, 'push');

  return true;
}

/**
 * Restore a soft-deleted patient
 */
export function restorePatient(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getPatient(id, { includeDeleted: true });
  if (!before || !before.is_deleted) return false;

  const now = cairoNow();
  db.prepare(
    `UPDATE patients SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?`
  ).run(id);

  const after = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  increment_version('patients', id);
  log_action(actor, device, 'RESTORE', 'patients', id, before, after);
  record_sync('patients', id, 'push');

  return after;
}

// Reminders with soft-delete
export function listReminders({ patientId, done, includeDeleted = false } = {}) {
  let q = includeDeleted
    ? 'SELECT * FROM reminders WHERE 1=1'
    : 'SELECT * FROM reminders WHERE is_deleted = 0';
  const params = [];
  if (patientId !== undefined) { q += ' AND patient_id = ?'; params.push(patientId); }
  if (done !== undefined) { q += ' AND done = ?'; params.push(done ? 1 : 0); }
  q += ' ORDER BY time ASC';
  return getDb().prepare(q).all(...params);
}

export function getReminder(id, { includeDeleted = false } = {}) {
  const q = includeDeleted
    ? 'SELECT * FROM reminders WHERE id = ?'
    : 'SELECT * FROM reminders WHERE id = ? AND is_deleted = 0';
  return getDb().prepare(q).get(id);
}

export function createReminder(data, { actor = DEFAULT_ACTOR, device = null } = {}) {
  if (!data.time?.match(/[+-]\d{2}:\d{2}$|Z$/)) {
    throw new Error('time must include explicit timezone (+02:00 or Z)');
  }
  const db = getDb();
  const now = cairoNow();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO reminders (patient_id, title, description, time, repeat, created_at, version)
     VALUES (@patient_id, @title, @description, @time, @repeat, @created_at, 1)`
  ).run({
    patient_id: data.patient_id,
    title: data.title,
    description: data.description ?? null,
    time: data.time,
    repeat: data.repeat ?? 'none',
    created_at: now,
  });

  const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(lastInsertRowid);
  log_action(actor, device, 'INSERT', 'reminders', lastInsertRowid, null, row);
  record_sync('reminders', lastInsertRowid, 'push');
  return row;
}

export function updateReminder(id, data, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getReminder(id, { includeDeleted: true });
  if (!before) return null;

  const allowed = ['title', 'description', 'time', 'repeat', 'done'];
  const fields = Object.keys(data)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ');

  if (!fields) return getReminder(id);

  const params = { ...data, id };
  db.prepare(`UPDATE reminders SET ${fields} WHERE id = @id`).run(params);

  const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  increment_version('reminders', id);
  log_action(actor, device, 'UPDATE', 'reminders', id, before, row);
  record_sync('reminders', id, 'push');
  return row;
}

export function markReminderDone(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  return updateReminder(id, { done: true }, { actor, device });
}

/**
 * Soft-delete a reminder
 */
export function deleteReminder(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getReminder(id, { includeDeleted: true });
  if (!before || before.is_deleted) return false;

  const now = cairoNow();
  db.prepare(
    `UPDATE reminders SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?`
  ).run(now, actor, id);

  const after = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  increment_version('reminders', id);
  log_action(actor, device, 'SOFT_DELETE', 'reminders', id, before, after);
  record_sync('reminders', id, 'push');

  return true;
}

export function restoreReminder(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getReminder(id, { includeDeleted: true });
  if (!before || !before.is_deleted) return false;

  db.prepare(
    `UPDATE reminders SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?`
  ).run(id);

  const after = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  increment_version('reminders', id);
  log_action(actor, device, 'RESTORE', 'reminders', id, before, after);
  record_sync('reminders', id, 'push');

  return after;
}

// Emergency contacts with soft-delete
export function listContacts(patientId, { includeDeleted = false } = {}) {
  const q = includeDeleted
    ? 'SELECT * FROM emergency_contacts WHERE patient_id = ?'
    : 'SELECT * FROM emergency_contacts WHERE patient_id = ? AND is_deleted = 0';
  return getDb().prepare(q).all(patientId);
}

export function getContact(id, { includeDeleted = false } = {}) {
  const q = includeDeleted
    ? 'SELECT * FROM emergency_contacts WHERE id = ?'
    : 'SELECT * FROM emergency_contacts WHERE id = ? AND is_deleted = 0';
  return getDb().prepare(q).get(id);
}

export function createContact(data, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const now = cairoNow();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO emergency_contacts (patient_id, name, phone, relation, created_at, version)
     VALUES (@patient_id, @name, @phone, @relation, @created_at, 1)`
  ).run({
    patient_id: data.patient_id,
    name: data.name,
    phone: data.phone,
    relation: data.relation ?? null,
    created_at: now,
  });

  const row = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(lastInsertRowid);
  log_action(actor, device, 'INSERT', 'emergency_contacts', lastInsertRowid, null, row);
  record_sync('emergency_contacts', lastInsertRowid, 'push');
  return row;
}

export function updateContact(id, data, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getContact(id, { includeDeleted: true });
  if (!before) return null;

  const allowed = ['name', 'phone', 'relation'];
  const fields = Object.keys(data)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ');

  if (!fields) return getContact(id);

  const params = { ...data, id };
  db.prepare(`UPDATE emergency_contacts SET ${fields} WHERE id = @id`).run(params);

  const row = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(id);
  increment_version('emergency_contacts', id);
  log_action(actor, device, 'UPDATE', 'emergency_contacts', id, before, row);
  record_sync('emergency_contacts', id, 'push');
  return row;
}

/**
 * Soft-delete a contact
 */
export function deleteContact(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getContact(id, { includeDeleted: true });
  if (!before || before.is_deleted) return false;

  const now = cairoNow();
  db.prepare(
    `UPDATE emergency_contacts SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?`
  ).run(now, actor, id);

  const after = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(id);
  increment_version('emergency_contacts', id);
  log_action(actor, device, 'SOFT_DELETE', 'emergency_contacts', id, before, after);
  record_sync('emergency_contacts', id, 'push');

  return true;
}

export function restoreContact(id, { actor = DEFAULT_ACTOR, device = null } = {}) {
  const db = getDb();
  const before = getContact(id, { includeDeleted: true });
  if (!before || !before.is_deleted) return false;

  db.prepare(
    `UPDATE emergency_contacts SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?`
  ).run(id);

  const after = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(id);
  increment_version('emergency_contacts', id);
  log_action(actor, device, 'RESTORE', 'emergency_contacts', id, before, after);
  record_sync('emergency_contacts', id, 'push');

  return after;
}