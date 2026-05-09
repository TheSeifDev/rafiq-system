/**
 * api/routes/ai.js - AI chat routes
 */

import { chat, isAiConfigured, classifyIntent } from '../../services/ai.js';
import { getPatient, listReminders, listAlerts, listContacts } from '../../db/index.js';

export async function registerAiRoutes(app) {
  // Health check for AI service
  app.get('/ai/health', async () => ({
    success: true,
    configured: isAiConfigured(),
  }));

  // Intent classification
  app.post('/ai/intent', async (req, reply) => {
    const { message } = req.body;
    if (!message?.trim()) {
      return reply.code(422).send({
        success: false,
        error: { code: 'validation_error', message: 'message is required' },
      });
    }

    return { success: true, intent: classifyIntent(message) };
  });

  // Main chat endpoint
  app.post('/ai/chat', async (req, reply) => {
    if (!isAiConfigured()) {
      return reply.code(503).send({
        success: false,
        error: { code: 'ai_not_configured', message: 'No AI provider available (set OLLAMA_URL or ANTHROPIC_API_KEY)' },
      });
    }

    const { message, patient_id, model } = req.body;

    if (!message?.trim()) {
      return reply.code(422).send({
        success: false,
        error: { code: 'validation_error', message: 'message is required' },
      });
    }

    // Build patient context
    let patientContext = null;
    if (patient_id) {
      const patient = getPatient(Number(patient_id));
      if (patient) {
        patientContext = {
          name: patient.name,
          age: patient.age,
          medical_history: patient.medical_history,
          notes: patient.notes,
        };

        const reminders = listReminders({ patientId: Number(patient_id), done: false });
        if (reminders.length) {
          patientContext.reminders = reminders.slice(0, 3).map(r => r.title);
        }

        const recentAlerts = listAlerts({ patientId: Number(patient_id), limit: 2, resolved: false });
        if (recentAlerts.length) {
          patientContext.alerts = recentAlerts.map(a => a.message);
        }

        const contacts = listContacts(Number(patient_id));
        if (contacts.length) {
          patientContext.contacts = contacts.map(c => c.name);
        }
      }
    }

    try {
      const response = await chat(message, { patientContext, model });
      return { success: true, response };
    } catch (err) {
      return reply.code(502).send({
        success: false,
        error: { code: 'ai_error', message: err.message },
      });
    }
  });
}