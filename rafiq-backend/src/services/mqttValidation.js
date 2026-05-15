/**
 * services/mqttValidation.js
 * Validate incoming MQTT packets: structure, schema, auth, timestamp, rate limiting
 */

import { getDb } from '../db/index.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(__dir, '..', 'db', 'migrations', '004_realtime_cursors.sql');

let _migrationApplied = false;
function ensureMigration() {
  if (_migrationApplied) return;
  const db = getDb();
  if (existsSync(MIGRATION)) {
    const sql = readFileSync(MIGRATION, 'utf8');
    db.exec(sql);
  }
  _migrationApplied = true;
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────

const _packetCounts = new Map(); // deviceId → { count, windowStart }

/**
 * Rate limiter: max 100 packets/min per device
 */
export function checkRateLimit(deviceId) {
  const now = Date.now();
  const entry = _packetCounts.get(deviceId);

  if (!entry || now - entry.windowStart > 60_000) {
    _packetCounts.set(deviceId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= 100) {
    console.warn(`[mqtt-validate] Rate limited: ${deviceId}`);
    return false;
  }

  entry.count++;
  return true;
}

// ── Packet Validation ─────────────────────────────────────────────────────────

/**
 * Validate MQTT packet structure
 */
export function validatePacket(packet) {
  const errors = [];

  if (!packet) {
    errors.push('packet is null/undefined');
    return { valid: false, errors };
  }

  if (!packet.topic || typeof packet.topic !== 'string') {
    errors.push('missing or invalid topic');
  }

  if (!Buffer.isBuffer(packet.payload) && typeof packet.payload !== 'string') {
    errors.push('payload must be Buffer or string');
  }

  if (!packet.qos || ![0, 1, 2].includes(packet.qos)) {
    errors.push('qos must be 0, 1, or 2');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate JSON schema of MQTT payload
 */
export function validateSchema(payload) {
  const errors = [];

  let data;
  try {
    data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());
  } catch {
    errors.push('payload is not valid JSON');
    return { valid: false, errors };
  }

  // Check for required fields based on topic
  if (!data || typeof data !== 'object') {
    errors.push('payload must be an object');
  }

  return { valid: errors.length === 0, errors, parsed: data };
}

/**
 * Validate device auth (deviceId + token)
 */
export function validateAuth(deviceId, token) {
  const errors = [];

  if (!deviceId || typeof deviceId !== 'string') {
    errors.push('invalid device_id');
  }

  if (!token || typeof token !== 'string') {
    errors.push('missing token');
  }

  // Check if device exists in DB
  if (deviceId) {
    ensureMigration();
    const db = getDb();
    const device = db.prepare(
      `SELECT id FROM devices WHERE name = ? OR id = ?`
    ).get(deviceId, deviceId);

    if (!device) {
      // Allow unknown devices for smart home (they auto-register)
      if (!deviceId.includes('/')) {
        errors.push('device not registered');
      }
    }
  }

  // Validate token format (basic check)
  if (token && (token.length < 8 || token.length > 256)) {
    errors.push('token length invalid');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Reject timestamps with >5 min drift from server time
 */
export function validateTimestamp(timestamp) {
  if (!timestamp) return { valid: true, drift_ms: 0 };

  const clientTime = new Date(timestamp).getTime();
  if (isNaN(clientTime)) {
    return { valid: false, drift_ms: 0, error: 'invalid timestamp format' };
  }

  const drift = Math.abs(Date.now() - clientTime);
  const maxDrift = 5 * 60 * 1000; // 5 minutes

  return {
    valid: drift <= maxDrift,
    drift_ms: drift,
    error: drift > maxDrift ? `timestamp drift ${drift}ms exceeds 5 min` : null,
  };
}

// ── Event Mapping ─────────────────────────────────────────────────────────────

/**
 * Map MQTT packet to internal event
 */
export function mapToEvent(packet, parsedData) {
  const topic = packet.topic;
  const parts = topic.split('/');
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    topic,
    device_id: parts.slice(2, 4).join('/'),
    timestamp: new Date().toISOString(),
    type: 'unknown',
    data: parsedData,
  };

  if (parts[1] === 'smarthome') {
    event.type = 'smarthome';
    event.room = parts[2];
    event.device = parts[3];
    event.subtype = parts[4]; // state | cmd
  } else if (parts[1] === 'alerts') {
    event.type = 'alert';
    event.patient_id = parseInt(parts[2], 10) || null;
  } else if (parts[1] === 'sensor') {
    event.type = 'sensor';
    event.room = parts[2];
    event.sensor = parts[3];
  } else if (parts[1] === 'location') {
    event.type = 'location';
    event.patient_id = parseInt(parts[2], 10) || null;
  }

  return event;
}

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Persist validated MQTT packet as a realtime event
 */
export function persistIncomingMQTT(packet) {
  ensureMigration();
  const db = getDb();
  const parts = packet.topic.split('/');
  const deviceId = parts.slice(2, 4).join('/');

  db.prepare(
    `INSERT INTO realtime_events (device_id, event_type, payload, created_at, delivered)
     VALUES (?, ?, ?, ?, 0)`
  ).run(
    deviceId,
    parts[1] || 'mqtt',
    JSON.stringify({ topic: packet.topic, payload: packet.payload.toString() }),
    new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' }).replace(' ', 'T') + '+02:00'
  );
}

/**
 * Get MQTT validation stats
 */
export function getMqttValidationStats() {
  const total = Array.from(_packetCounts.values()).reduce((s, e) => s + e.count, 0);
  return {
    tracked_devices: _packetCounts.size,
    total_packets_minute: total,
  };
}