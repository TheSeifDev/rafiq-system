/**
 * api/index.js - Register all API routes
 */

import { registerAiRoutes } from './routes/ai.js';
import { registerPatientRoutes } from './routes/patients.js';
import { registerAlertRoutes } from './routes/alerts.js';
import { registerSmartHomeRoutes, setMqttClient } from './routes/smarthome.js';
import { registerTestRoutes } from './routes/test.js';
import { registerNotificationRoutes } from '../services/notifications.js';

import { registerSSE } from '../sockets/sse.js';
import { flushQueue, pullFromSupabase } from '../sync/supabase.js';
import { getDb } from '../db/index.js';

const API_KEY = process.env.RAFIQ_API_KEY || process.env.API_KEY;

export async function registerAllRoutes(app) {
  // Auth hook for all routes except health, events, and test routes
  app.addHook('onRequest', async (req, reply) => {
    const skipAuth = [
      '/health',
      '/events',
      '/ai/health',
      '/smarthome/status',
      '/test/'
    ];
    if (skipAuth.some(path => req.url.startsWith(path))) return;

    const key = req.headers['x-api-key'];
    if (!key || key !== API_KEY) {
      reply.code(401).send({ success: false, error: { code: 'unauthorized', message: 'Invalid API key' } });
    }
  });

  // Health endpoint (no auth required)
  app.get('/health', async () => ({
    success: true,
    service: 'rafiq-backend',
    version: '3.0.0',
    db: 'sqlite',
    time: new Date().toISOString(),
  }));

  // SSE endpoint (no auth required)
  registerSSE(app);

  // Register route groups
  await registerAiRoutes(app);
  await registerPatientRoutes(app);
  await registerAlertRoutes(app);
  await registerSmartHomeRoutes(app);
  await registerNotificationRoutes(app);

  // Test routes for GUI development
  await registerTestRoutes(app);

  // Sync endpoints
  app.post('/sync/push', async () => {
    const r = await flushQueue();
    return { success: true, data: r };
  });

  app.post('/sync/pull', async () => {
    const r = await pullFromSupabase(getDb());
    return { success: true, data: r };
  });
}

export { setMqttClient };
