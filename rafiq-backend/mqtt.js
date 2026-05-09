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
} from '../db.js';

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
      try { lastVal = JSON.parse(raw); state = lastVal.state ?? state; } catch {}
      updateSmartDeviceState(mqttId, state, lastVal);
    }
  }

  if (parts[1] === 'alerts') {
    // rafiq/alerts/{patient_id}  payload: { type, message, severity, source }
    const patientId = parseInt(parts[2], 10) || null;
    let data = {};
    try { data = JSON.parse(raw); } catch { data.message = raw; }

    const alert = createAlert({
      patient_id: patientId,
      type:       data.type     || 'smarthome',
      message:    data.message  || raw,
      severity:   data.severity || 'high',
      source:     data.source   || topic,
    });
    _alertCallback?.(alert);
  }

  if (parts[1] === 'sensor') {
    // rafiq/sensor/{room}/{sensor}  payload: JSON { value, unit }
    const [, , room, sensor] = parts;
    const mqttId = `${room}/${sensor}`;
    let val = {};
    try { val = JSON.parse(raw); } catch { val = { raw }; }
    upsertSmartDevice(mqttId, sensor, room, 'sensor');
    updateSmartDeviceState(mqttId, 'online', val);
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
  updateSmartDeviceState(`${room}/${device}`, command.state ?? 'cmd', command);
}

export function getMqttClient() { return client; }
