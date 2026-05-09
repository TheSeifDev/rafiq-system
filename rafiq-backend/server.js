/**
 * server.js — Rafiq Backend v2 (Node.js + Fastify)
 * Replaces Python FastAPI for better speed on Mini PC
 *
 * Start:  node src/server.js
 * Dev:    node --watch src/server.js
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { initDb } from './db.js';
import { registerRoutes, onNewAlert } from './routes.js';
import { initSupabase, startSyncLoop } from './sync/supabase.js';
import { initMqtt, onAlert } from './smarthome/mqtt.js';

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT     = Number(process.env.PORT)     || 3001;
const HOST     = process.env.HOST             || '0.0.0.0';  // expose to LAN
const API_KEY  = process.env.RAFIQ_API_KEY    || process.env.API_KEY;
const DEV_MODE = process.env.NODE_ENV !== 'production';

if (!API_KEY && !process.env.ALLOW_INSECURE_DEV_API_KEY) {
  console.error('❌  RAFIQ_API_KEY not set. Add it to .env or set ALLOW_INSECURE_DEV_API_KEY=1');
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
  origin: true,         // allow all origins on local network
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
});

// ── Init DB ───────────────────────────────────────────────────────────────────
initDb();
console.log('✅  SQLite ready');

// ── Init Supabase sync ────────────────────────────────────────────────────────
const syncReady = initSupabase();
if (syncReady) startSyncLoop(30_000);

// ── Init MQTT (smart home) ────────────────────────────────────────────────────
const mqttBroker = process.env.MQTT_BROKER;
if (mqttBroker) {
  initMqtt(mqttBroker);
  onAlert(onNewAlert);   // pipe MQTT alerts → SSE clients
  console.log('✅  MQTT bridge ready');
} else {
  console.warn('⚠️   MQTT_BROKER not set — smart home bridge disabled');
}

// ── Register routes ───────────────────────────────────────────────────────────
await registerRoutes(app);

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n🚀  Rafiq backend running at http://${HOST}:${PORT}`);
  console.log(`📋  Swagger-like routes: GET /health`);
  console.log(`🤖  AI chat:             POST /ai/chat`);
  console.log(`☁️   Supabase sync:       POST /sync/push`);
  console.log(`📡  SSE alerts:          GET  /events\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
