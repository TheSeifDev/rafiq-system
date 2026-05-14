/**
 * api/routes/smarthome.js - Smart home device routes
 */

import { getSmartDevice, listSmartDevices, listDevices } from '../../db/index.js';

let mqttClient = null;
let publishCommandFn = null;

export function setMqttClient(client, publishFn) {
  mqttClient = client;
  publishCommandFn = publishFn;
}

export async function registerSmartHomeRoutes(app) {
  // List all smart home devices
  app.get('/smarthome', async (req) => {
    const { room } = req.query;
    return { success: true, data: listSmartDevices(room) };
  });

  // Get smart home device by ID
  app.get('/smarthome/:id', async (req, reply) => {
    const device = getSmartDevice(req.params.id);
    if (!device) {
      return reply.code(404).send({ success: false, error: { code: 'not_found', message: 'Device not found' } });
    }
    return { success: true, data: device };
  });

  // Send command to smart home device
  app.post('/smarthome/cmd', async (req, reply) => {
    const { room, device, command } = req.body;

    if (!room || !device || !command) {
      return reply.code(422).send({ success: false, error: { code: 'validation_error', message: 'room, device, and command are required' } });
    }

    if (!publishCommandFn) {
      return reply.code(503).send({ success: false, error: { code: 'mqtt_not_available', message: 'MQTT not configured' } });
    }

    try {
      publishCommandFn(room, device, command);
      return { success: true };
    } catch (err) {
      return reply.code(503).send({ success: false, error: { code: 'mqtt_error', message: err.message } });
    }
  });

  // Send bulk commands
  app.post('/smarthome/batch', async (req, reply) => {
    const { commands } = req.body;

    if (!Array.isArray(commands) || !commands.length) {
      return reply.code(422).send({ success: false, error: { code: 'validation_error', message: 'commands array is required' } });
    }

    if (!publishCommandFn) {
      return reply.code(503).send({ success: false, error: { code: 'mqtt_not_available', message: 'MQTT not configured' } });
    }

    const results = [];
    for (const cmd of commands) {
      try {
        publishCommandFn(cmd.room, cmd.device, cmd.command);
        results.push({ room: cmd.room, device: cmd.device, success: true });
      } catch (err) {
        results.push({ room: cmd.room, device: cmd.device, success: false, error: err.message });
      }
    }

    return { success: true, data: results };
  });

  // List patient devices
  app.get('/devices', async (req) => {
    const { patient_id } = req.query;
    return { success: true, data: listDevices(patient_id ? String(patient_id) : undefined) };
  });

  // MQTT connection status
  app.get('/smarthome/status', async () => {
    return {
      success: true,
      data: {
        connected: mqttClient?.connected || false,
        broker: process.env.MQTT_BROKER || null,
      },
    };
  });
}
