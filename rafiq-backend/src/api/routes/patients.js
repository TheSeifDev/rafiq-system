/**
 * api/routes/patients.js - Patient CRUD routes
 */

import {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  listReminders,
  createReminder,
  markReminderDone,
  listContacts,
} from '../../db/index.js';

export async function registerPatientRoutes(app) {
  // List all patients
  app.get('/patients', async () => ({ success: true, data: listPatients() }));

  // Get single patient
  app.get('/patients/:id', async (req, reply) => {
    const p = getPatient(Number(req.params.id));
    if (!p) {
      return reply.code(404).send({ success: false, error: { code: 'not_found', message: 'Patient not found' } });
    }
    return { success: true, data: p };
  });

  // Create patient
  app.post('/patients', async (req, reply) => {
    const { name } = req.body;
    if (!name?.trim()) {
      return reply.code(422).send({ success: false, error: { code: 'validation_error', message: 'name is required' } });
    }
    const p = createPatient(req.body);
    return { success: true, data: p };
  });

  // Update patient
  app.put('/patients/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const existing = getPatient(id);
    if (!existing) {
      return reply.code(404).send({ success: false, error: { code: 'not_found', message: 'Patient not found' } });
    }
    if (req.body.name === null) {
      return reply.code(422).send({ success: false, error: { code: 'invalid_update', message: 'name cannot be null' } });
    }
    const p = updatePatient(id, req.body);
    return { success: true, data: p };
  });

  // Delete patient
  app.delete('/patients/:id', async (req) => {
    deletePatient(Number(req.params.id));
    return { success: true };
  });

  // Reminders
  app.get('/reminders', async (req) => {
    const { patient_id, done } = req.query;
    return {
      success: true,
      data: listReminders({
        patientId: patient_id ? Number(patient_id) : undefined,
        done: done !== undefined ? done === 'true' : undefined,
      }),
    };
  });

  app.post('/reminders', async (req, reply) => {
    const { patient_id, title, time } = req.body;
    if (!patient_id || !title || !time) {
      return reply.code(422).send({ success: false, error: { code: 'validation_error', message: 'patient_id, title, and time are required' } });
    }
    try {
      const r = createReminder(req.body);
      return { success: true, data: r };
    } catch (err) {
      return reply.code(422).send({ success: false, error: { code: 'validation_error', message: err.message } });
    }
  });

  app.patch('/reminders/:id/done', async (req) => {
    const r = markReminderDone(Number(req.params.id));
    return { success: true, data: r };
  });

  // Emergency contacts
  app.get('/emergency-contacts', async (req) => {
    const { patient_id } = req.query;
    if (!patient_id) {
      return { success: true, data: [] };
    }
    return { success: true, data: listContacts(Number(patient_id)) };
  });
}