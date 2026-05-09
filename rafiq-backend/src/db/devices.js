/**
 * db/devices.js - Device and smart home queries
 */

import { getDb } from './index.js';
import { cairoNow, enqueueSync } from './utils.js';

export function listDevices(patientId) {
  if (patientId) {
    return getDb().prepare('SELECT * FROM devices WHERE patient_id = ?').all(patientId);
  }
  return getDb().prepare('SELECT * FROM devices').all();
}

export function getDevice(id) {
  return getDb().prepare('SELECT * FROM devices WHERE id = ?').get(id);
}

export function createDevice(data) {
  const db = getDb();
  const { lastInsertRowid } = db.prepare(
    `INSERT INTO devices (patient_id, name, type, status, metadata)
     VALUES (@patient_id, @name, @type, @status, @metadata)`
  ).run({
    patient_id: data.patient_id ?? null,
    name: data.name,
    type: data.type,
    status: data.status || 'offline',
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  });
  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(lastInsertRowid);
  enqueueSync(db, 'devices', 'INSERT', lastInsertRowid, row);
  return row;
}

export function updateDeviceStatus(id, status, metadata = null) {
  const db = getDb();
  const last_seen = cairoNow();
  db.prepare('UPDATE devices SET status = ?, last_seen = ?, metadata = ? WHERE id = ?')
    .run(status, last_seen, metadata ? JSON.stringify(metadata) : null, id);
  return getDevice(id);
}

export function deleteDevice(id) {
  const db = getDb();
  enqueueSync(db, 'devices', 'DELETE', id, { id });
  db.prepare('DELETE FROM devices WHERE id = ?').run(id);
}

// Smart home devices (local only)
export function listSmartDevices(room) {
  if (room) {
    return getDb().prepare('SELECT * FROM smarthome_devices WHERE room = ?').all(room);
  }
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