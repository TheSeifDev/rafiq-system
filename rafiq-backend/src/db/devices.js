/**
 * db/devices.js - Device, smart-home, MQTT, and sensor queries
 */

import { getDb } from './index.js';
import { createUuid, enqueueSync, isoNow, json } from './utils.js';

export function listDevices(patientId) {
  if (patientId) {
    return getDb().prepare('SELECT * FROM devices WHERE patient_id = ? ORDER BY last_seen DESC').all(patientId);
  }
  return getDb().prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
}

export function getDevice(id) {
  return getDb().prepare('SELECT * FROM devices WHERE id = ?').get(id);
}

export function createDevice(data) {
  const db = getDb();
  const id = data.id ?? createUuid();
  const name = data.device_name ?? data.name;
  db.prepare(
    `INSERT INTO devices
      (id, patient_id, user_id, device_name, name, device_type, type, mac_address, ip_address,
       firmware_version, status, location, mqtt_topic, config, metadata)
     VALUES
      (@id, @patient_id, @user_id, @device_name, @name, @device_type, @type, @mac_address, @ip_address,
       @firmware_version, @status, @location, @mqtt_topic, @config, @metadata)`
  ).run({
    id,
    patient_id: data.patient_id ?? null,
    user_id: data.user_id ?? null,
    device_name: name,
    name,
    device_type: data.device_type ?? data.type ?? 'other',
    type: data.type ?? data.device_type ?? 'other',
    mac_address: data.mac_address ?? null,
    ip_address: data.ip_address ?? null,
    firmware_version: data.firmware_version ?? null,
    status: data.status || 'offline',
    location: data.location ?? null,
    mqtt_topic: data.mqtt_topic ?? null,
    config: json(data.config),
    metadata: json(data.metadata),
  });
  const row = getDevice(id);
  enqueueSync(db, 'devices', 'upsert', id, row, { user_id: row.user_id });
  return row;
}

export function updateDeviceStatus(id, status, metadata = null) {
  const db = getDb();
  db.prepare('UPDATE devices SET status = ?, last_seen = ?, metadata = ?, updated_at = ? WHERE id = ?')
    .run(status, isoNow(), metadata ? json(metadata) : '{}', isoNow(), id);
  const row = getDevice(id);
  if (row) enqueueSync(db, 'devices', 'update', id, row, { user_id: row.user_id });
  return row;
}

export function deleteDevice(id) {
  const db = getDb();
  const row = getDevice(id);
  enqueueSync(db, 'devices', 'delete', id, { id }, { user_id: row?.user_id });
  db.prepare('DELETE FROM devices WHERE id = ?').run(id);
}

export function listSmartDevices(room) {
  if (room) {
    return getDb().prepare('SELECT * FROM smart_home_devices WHERE room = ? ORDER BY device_name').all(room);
  }
  return getDb().prepare('SELECT * FROM smart_home_devices ORDER BY room, device_name').all();
}

export function getSmartDevice(id) {
  return getDb().prepare('SELECT * FROM smart_home_devices WHERE id = ? OR mqtt_topic = ?').get(id, id);
}

export function upsertSmartDevice(mqttTopic, label, room, type, extra = {}) {
  const db = getDb();
  const existing = getSmartDevice(mqttTopic);
  const id = existing?.id ?? extra.id ?? createUuid();
  db.prepare(
    `INSERT INTO smart_home_devices
      (id, patient_id, user_id, device_name, device_type, room, mqtt_topic, status, state, config)
     VALUES
      (@id, @patient_id, @user_id, @device_name, @device_type, @room, @mqtt_topic, @status, @state, @config)
     ON CONFLICT(mqtt_topic) DO UPDATE SET
      device_name = excluded.device_name,
      device_type = excluded.device_type,
      room = excluded.room,
      status = excluded.status,
      updated_at = datetime('now')`
  ).run({
    id,
    patient_id: extra.patient_id ?? existing?.patient_id ?? null,
    user_id: extra.user_id ?? existing?.user_id ?? null,
    device_name: label,
    device_type: type ?? 'device',
    room: room ?? null,
    mqtt_topic: mqttTopic,
    status: extra.status ?? existing?.status ?? 'online',
    state: json(extra.state),
    config: json(extra.config),
  });
  const row = getSmartDevice(mqttTopic);
  enqueueSync(db, 'smart_home_devices', 'upsert', row.id, row, { user_id: row.user_id });
  return row;
}

export function updateSmartDeviceState(mqttTopic, state, lastVal) {
  const db = getDb();
  const row = getSmartDevice(mqttTopic) ?? upsertSmartDevice(mqttTopic, mqttTopic.split('/').pop(), null, 'device');
  db.prepare(
    `UPDATE smart_home_devices
     SET status = ?, state = ?, updated_at = ?
     WHERE id = ?`
  ).run(state, json(lastVal ?? { state }), isoNow(), row.id);
  const updated = getSmartDevice(row.id);
  enqueueSync(db, 'smart_home_devices', 'update', updated.id, updated, { user_id: updated.user_id });
  return updated;
}

export function recordMqttEvent(data) {
  const db = getDb();
  const id = data.id ?? createUuid();
  db.prepare(
    `INSERT INTO mqtt_events
      (id, patient_id, device_id, topic, qos, retain, direction, payload, payload_text)
     VALUES
      (@id, @patient_id, @device_id, @topic, @qos, @retain, @direction, @payload, @payload_text)`
  ).run({
    id,
    patient_id: data.patient_id ?? null,
    device_id: data.device_id ?? null,
    topic: data.topic,
    qos: data.qos ?? 0,
    retain: data.retain ? 1 : 0,
    direction: data.direction ?? 'inbound',
    payload: json(data.payload),
    payload_text: data.payload_text ?? null,
  });
  const row = db.prepare('SELECT * FROM mqtt_events WHERE id = ?').get(id);
  enqueueSync(db, 'mqtt_events', 'upsert', id, row, { priority: 'low' });
  return row;
}

export function recordSensorReading(data) {
  const db = getDb();
  const id = data.id ?? createUuid();
  db.prepare(
    `INSERT INTO sensor_readings
      (id, patient_id, device_id, sensor_type, value, unit, room, raw_payload)
     VALUES
      (@id, @patient_id, @device_id, @sensor_type, @value, @unit, @room, @raw_payload)`
  ).run({
    id,
    patient_id: data.patient_id ?? null,
    device_id: data.device_id ?? null,
    sensor_type: data.sensor_type,
    value: data.value ?? null,
    unit: data.unit ?? null,
    room: data.room ?? null,
    raw_payload: json(data.raw_payload ?? data),
  });
  const row = db.prepare('SELECT * FROM sensor_readings WHERE id = ?').get(id);
  enqueueSync(db, 'sensor_readings', 'upsert', id, row, { priority: 'low' });
  return row;
}
