/**
 * api/routes/alerts.js - Alert and emergency routes
 */

import {
  listAlerts,
  getAlert,
  createAlert,
  resolveAlert,
  deleteAlert,
  listEmergencyEvents,
  createEmergencyEvent,
  resolveEmergencyEvent,
} from '../../db/index.js';

import { broadcastAlert, broadcastEmergency } from '../../sockets/sse.js';

export async function registerAlertRoutes(app) {
  // List alerts
  app.get('/alerts', async (req) => {
    const { patient_id, limit, resolved } = req.query;
    return {
      success: true,
      data: listAlerts({
        patientId: patient_id ? Number(patient_id) : undefined,
        limit: limit ? Number(limit) : 20,
        resolved: resolved !== undefined ? resolved === 'true' : undefined,
      }),
    };
  });

  // Get single alert
  app.get('/alerts/:id', async (req, reply) => {
    const alert = getAlert(Number(req.params.id));
    if (!alert) {
      return reply.code(404).send({ success: false, error: { code: 'not_found', message: 'Alert not found' } });
    }
    return { success: true, data: alert };
  });

  // Create alert
  app.post('/alerts', async (req, reply) => {
    const { message } = req.body;
    if (!message?.trim()) {
      return reply.code(422).send({ success: false, error: { code: 'validation_error', message: 'message is required' } });
    }
    const alert = createAlert(req.body);
    broadcastAlert(alert); // Push to SSE clients
    return { success: true, data: alert };
  });

  // Resolve alert
  app.patch('/alerts/:id/resolve', async (req) => {
    const alert = resolveAlert(Number(req.params.id));
    return { success: true, data: alert };
  });

  // Delete alert
  app.delete('/alerts/:id', async (req) => {
    deleteAlert(Number(req.params.id));
    return { success: true };
  });

  // Emergency events
  app.get('/emergency-events', async (req) => {
    const { patient_id, status } = req.query;
    return {
      success: true,
      data: listEmergencyEvents({
        patientId: patient_id ? Number(patient_id) : undefined,
        status,
      }),
    };
  });

  // Create emergency event
  app.post('/emergency', async (req, reply) => {
    const { patient_id, type, location } = req.body;
    const event = createEmergencyEvent({
      patient_id: patient_id ?? null,
      type: type || 'general',
      location: location ?? null,
    });
    broadcastEmergency(event); // Push to all connected clients
    return { success: true, data: event };
  });

  // Resolve emergency event
  app.patch('/emergency/:id/resolve', async (req, reply) => {
    const event = resolveEmergencyEvent(Number(req.params.id));
    broadcastEmergency(event);
    return { success: true, data: event };
  });

  // Broadcast emergency to all
  app.post('/emergency/broadcast', async (req, reply) => {
    const { message, patient_id, severity } = req.body;
    // Create alert
    const alert = createAlert({
      patient_id: patient_id ?? null,
      type: 'emergency',
      message: message || 'Emergency broadcast',
      severity: severity || 'critical',
      source: 'broadcast',
    });
    broadcastAlert(alert);
    broadcastEmergency(alert);
    return { success: true, data: alert };
  });
}