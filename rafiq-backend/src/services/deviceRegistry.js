/**
 * services/deviceRegistry.js
 * Device registration, heartbeat, capability tracking
 */

import { getDb } from '../db/index.js';
import { cairoNow } from '../db/utils.js';

// ── Register Device ────────────────────────────────────────────────────────────

export function registerDevice(data) {
  const db = getDb();
  const now = cairoNow();

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO devices (
      device_uuid, device_type, patient_id, name, status,
      firmware_version, app_version, sync_cursor, trusted, capabilities, created_at, updated_at
    ) VALUES (
      @device_uuid, @device_type, @patient_id, @name, @status,
      @firmware_version, @app_version, 0, @trusted, @capabilities, @now, @now
    )
  `).run({
    device_uuid:      data.device_uuid,
    device_type:      data.device_type,
    patient_id:       data.patient_id ?? null,
    name:             data.name,
    status:           data.status || 'unknown',
    firmware_version: data.firmware_version ?? null,
    app_version:      data.app_version ?? null,
    trusted:          data.trusted ? 1 : 0,
    capabilities:     data.capabilities ? JSON.stringify(data.capabilities) : null,
    now,
  });

  return getDb().prepare('SELECT * FROM devices WHERE id = ?').get(lastInsertRowid);
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

export function updateHeartbeat(deviceId) {
  const db = getDb();
  const now = cairoNow();
  db.prepare(`
    UPDATE devices SET status = 'online', last_seen = ?, updated_at = ? WHERE id = ?
  `).run(now, now, deviceId);

  // Update all active sessions
  db.prepare(`
    UPDATE device_sessions SET last_activity = ? WHERE device_id = ?
  `).run(now, deviceId);

  return getDevice(deviceId);
}

// ── Mark Offline ───────────────────────────────────────────────────────────────

export function markOffline(deviceId) {
  const db = getDb();
  const now = cairoNow();
  db.prepare(`
    UPDATE devices SET status = 'offline', updated_at = ? WHERE id = ?
  `).run(now, deviceId);

  return getDevice(deviceId);
}

// ── Get Device ─────────────────────────────────────────────────────────────────

export function getDevice(deviceId) {
  return getDb().prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
}

export function getDeviceByUuid(deviceUuid) {
  return getDb().prepare('SELECT * FROM devices WHERE device_uuid = ?').get(deviceUuid);
}

// ── List Devices ───────────────────────────────────────────────────────────────

export function listDevices(patientId) {
  if (patientId != null) {
    return getDb().prepare('SELECT * FROM devices WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
  }
  return getDb().prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
}

// ── Validate Device ───────────────────────────────────────────────────────────

export function validateDevice(deviceId, sessionToken) {
  const device = getDb().prepare(`
    SELECT d.* FROM devices d
    LEFT JOIN device_sessions s ON s.device_id = d.id
    WHERE d.id = ? AND (d.trusted = 1 OR s.session_token = ?)
  `).get(deviceId, sessionToken);

  if (!device) return null;

  // Update session activity
  if (sessionToken) {
    const now = cairoNow();
    getDb().prepare(`
      UPDATE device_sessions SET last_activity = ? WHERE session_token = ?
    `).run(now, sessionToken);
  }

  return device;
}

// ── Update Capabilities ───────────────────────────────────────────────────────

export function updateCapabilities(deviceId, capabilities) {
  const db = getDb();
  const now = cairoNow();

  // Update device capabilities JSON
  db.prepare(`
    UPDATE devices SET capabilities = ?, updated_at = ? WHERE id = ?
  `).run(JSON.stringify(capabilities), now, deviceId);

  // Replace device_capabilities entries
  db.prepare('DELETE FROM device_capabilities WHERE device_id = ?').run(deviceId);

  const insertCap = db.prepare(`
    INSERT INTO device_capabilities (device_id, capability) VALUES (?, ?)
  `);

  for (const cap of capabilities) {
    insertCap.run(deviceId, cap);
  }

  return getDevice(deviceId);
}

// ── Session Management ────────────────────────────────────────────────────────

export function createSession(deviceId, sessionToken, ipAddress = null, userAgent = null) {
  const db = getDb();
  const now = cairoNow();

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO device_sessions (device_id, session_token, started_at, last_activity, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(deviceId, sessionToken, now, now, ipAddress, userAgent);

  return db.prepare('SELECT * FROM device_sessions WHERE id = ?').get(lastInsertRowid);
}

export function getSessionByToken(sessionToken) {
  return getDb().prepare('SELECT * FROM device_sessions WHERE session_token = ?').get(sessionToken);
}

export function deleteSession(sessionToken) {
  getDb().prepare('DELETE FROM device_sessions WHERE session_token = ?').run(sessionToken);
}

// ── Sync State ─────────────────────────────────────────────────────────────────

export function updateSyncState(deviceId, tableName, cursorPosition) {
  const db = getDb();
  const now = cairoNow();

  db.prepare(`
    INSERT INTO device_sync_state (device_id, table_name, cursor_position, last_sync_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(device_id, table_name) DO UPDATE SET
      cursor_position = excluded.cursor_position,
      last_sync_at = excluded.last_sync_at
  `).run(deviceId, tableName, cursorPosition, now);
}

export function getSyncState(deviceId, tableName) {
  return getDb().prepare(`
    SELECT * FROM device_sync_state WHERE device_id = ? AND table_name = ?
  `).get(deviceId, tableName);
}

export function getAllSyncStates(deviceId) {
  return getDb().prepare('SELECT * FROM device_sync_state WHERE device_id = ?').all(deviceId);
}