/**
 * smarthome/mqtt.js
 * Bridges ESP32 / IoT devices via MQTT to the Rafiq backend
 *
 * Topic conventions:
 *   rafiq/smarthome/{room}/{device}/state   → device publishes state
 *   rafiq/smarthome/{room}/{device}/cmd     → backend publishes commands
 *   rafiq/alerts/{patient_id}               → device publishes emergency alerts
 *   rafiq/sensor/{room}/{sensor}            → sensor readings (JSON)
 */

import mqtt from 'mqtt';
import {
  updateSmartDeviceState,
  upsertSmartDevice,
  createAlert,
  createEmergencyEvent,
  createFallDetectionEvent,
  createGasAlert,
  recordMqttEvent,
  recordSensorReading,
} from '../db/index.js';

let client = null;
let _alertCallback = null;  // called when a new alert is created (for SSE push)

export function onAlert(cb) { _alertCallback = cb; }

export function initMqtt(brokerUrl = 'mqtt://localhost:1883') {
  if (!brokerUrl) {
    console.warn('[mqtt] MQTT_BROKER not set — smart home bridge disabled');
    return null;
  }

  client = mqtt.connect(brokerUrl, {
    clientId: `rafiq-backend-${Date.now()}`,
    reconnectPeriod: 5000,
    connectTimeout: 10_000,
  });

  client.on('connect', () => {
    console.log('[mqtt] Connected to broker:', brokerUrl);
    client.subscribe('rafiq/#', { qos: 1 });
  });

  client.on('error', err => console.error('[mqtt]', err.message));

  client.on('message', (topic, payload) => {
    try {
      handleMessage(topic, payload.toString());
    } catch (e) {
      console.error('[mqtt] handler error:', e.message);
    }
  });

  return client;
}

function handleMessage(topic, raw) {
  const parts = topic.split('/');
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch {}
  recordMqttEvent({
    topic,
    direction: 'inbound',
    payload: parsed ?? { raw },
    payload_text: raw,
  });
  // e.g. ['rafiq', 'smarthome', 'room1', 'relay1', 'state']
  //      ['rafiq', 'alerts', '1']
  //      ['rafiq', 'sensor', 'room1', 'temperature']

  if (parts[1] === 'smarthome' && parts.length >= 5) {
    const [, , room, device, event] = parts;
    const mqttId = `${room}/${device}`;

    upsertSmartDevice(mqttId, device, room, guessType(device));

    if (event === 'state') {
      // payload can be "on"/"off" or a JSON with val
      let state = raw.trim().toLowerCase();
      let lastVal = null;
      try { lastVal = parsed ?? JSON.parse(raw); state = lastVal.state ?? state; } catch {}
      updateSmartDeviceState(mqttId, state, lastVal);
    }
  }

  if (parts[1] === 'alerts') {
    // rafiq/alerts/{patient_id}  payload: { type, message, severity, source }
    const patientId = parts[2] || null;
    const data = parsed ?? { message: raw };

    if (data.type === 'gas' || data.type === 'gas_alert') {
      createGasAlert({
        patient_id: patientId,
        level: data.level ?? data.severity ?? 'warning',
        concentration_ppm: data.concentration_ppm ?? data.concentration,
        location: data.location,
        raw_payload: data,
      });
    }

    if (data.type === 'fall' || data.type === 'fall_detection') {
      createFallDetectionEvent({
        patient_id: patientId,
        severity: data.severity ?? 'critical',
        confidence: data.confidence,
        location: data.location,
        raw_payload: data,
      });
    }

    const alert = createAlert({
      patient_id: patientId,
      type:       data.type     || 'smarthome',
      message:    data.message  || raw,
      severity:   data.severity || 'high',
      source:     data.source   || topic,
      data,
    });
    if (alert.severity === 'critical' || alert.type === 'fall' || alert.type === 'gas') {
      createEmergencyEvent({
        patient_id: patientId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        source: topic,
        data,
      });
    }
    _alertCallback?.(alert);
  }

  if (parts[1] === 'sensor') {
    // rafiq/sensor/{room}/{sensor}  payload: JSON { value, unit }
    const [, , room, sensor] = parts;
    const mqttId = `${room}/${sensor}`;
    const val = parsed ?? { raw };
    upsertSmartDevice(mqttId, sensor, room, 'sensor');
    updateSmartDeviceState(mqttId, 'online', val);
    recordSensorReading({
      sensor_type: sensor,
      value: typeof val.value === 'number' ? val.value : Number(val.value) || null,
      unit: val.unit ?? null,
      room,
      raw_payload: val,
    });
  }
}

function guessType(name) {
  if (/relay|switch|lamp|light/i.test(name)) return 'relay';
  if (/sensor|temp|hum|gas|motion/i.test(name)) return 'sensor';
  if (/cam|camera/i.test(name)) return 'camera';
  if (/lock|door/i.test(name)) return 'lock';
  return 'device';
}

// ── Command publisher ─────────────────────────────────────────────────────────

export function publishCommand(room, device, command) {
  if (!client?.connected) throw new Error('MQTT not connected');
  const topic = `rafiq/smarthome/${room}/${device}/cmd`;
  client.publish(topic, JSON.stringify(command), { qos: 1 });
  recordMqttEvent({ topic, direction: 'outbound', payload: command, payload_text: JSON.stringify(command) });
  updateSmartDeviceState(`${room}/${device}`, command.state ?? 'cmd', command);
}

export function getMqttClient() { return client; }
