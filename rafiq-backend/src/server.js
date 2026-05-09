/**
 * server.js — RAFIQ Backend v3 (Node.js + Fastify)
 * Modular architecture for Edge AI healthcare system
 *
 * Start:  node src/server.js
 * Dev:    node --watch src/server.js
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { initDb, createAlert } from './db/index.js';
import { registerAllRoutes, setMqttClient } from './api/index.js';
import { initSupabase, startSyncLoop } from './sync/supabase.js';
import { initMqtt, onAlert, publishCommand, getMqttClient } from './smarthome/mqtt.js';
import { broadcastAlert } from './sockets/sse.js';

// ── Config ───────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const API_KEY = process.env.RAFIQ_API_KEY || process.env.API_KEY;
const DEV_MODE = process.env.NODE_ENV !== 'production';

if (!API_KEY && !process.env.ALLOW_INSECURE_DEV_API_KEY) {
  console.error('❌  RAFIQ_API_KEY not set. Add to .env or set ALLOW_INSECURE_DEV_API_KEY=1');
  process.exit(1);
}

// ── Fastify app ───────────────────────────────────────────────────────────────
const app = Fastify({
  logger: DEV_MODE
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : true,
  disableRequestLogging: !DEV_MODE,
});

await app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
});

// ── Init Database ───────────────────────────────────────────────────────────────
initDb();
console.log('✅  SQLite ready at ./data/rafiq.db');

// ── Init Supabase sync ─────────────────────────────────────────────────────────
const syncReady = initSupabase();
if (syncReady) {
  startSyncLoop(30_000);
  console.log('✅  Supabase sync enabled');
}

// ── Init MQTT (smart home) ─────────────────────────────────────────────────────
const mqttBroker = process.env.MQTT_BROKER;
if (mqttBroker) {
  initMqtt(mqttBroker);
  onAlert((alert) => {
    broadcastAlert(alert);
  });
  setMqttClient(getMqttClient(), publishCommand);
  console.log('✅  MQTT bridge ready');
} else {
  console.warn('⚠️   MQTT_BROKER not set — smart home disabled');
}

// ── Register API routes ─────────────────────────────────────────────────────────
await registerAllRoutes(app);

// ── Start server ────────────────────────────────────────────────────────────────
try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n🚀  RAFIQ backend running at http://${HOST}:${PORT}`);
  console.log(`📋  Health:               GET  /health`);
  console.log(`🤖  AI Chat:              POST /ai/chat`);
  console.log(`👥  Patients:             GET/POST /patients`);
  console.log(`🚨  Alerts:               GET/POST /alerts`);
  console.log(`🏠  Smart Home:           GET/POST /smarthome`);
  console.log(`📡  Real-time events:     GET  /events`);
  console.log(`☁️  Supabase sync:         POST /sync/push\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}