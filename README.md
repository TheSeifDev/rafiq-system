# RAFIQ

RAFIQ is an offline-first healthcare, AI, emergency, and smart-home system. The ecosystem is built around local SQLite runtime databases, a Node/Fastify orchestration backend, an Expo mobile app, MQTT/ESP32 device ingestion, Supabase Auth/Postgres/Realtime for cloud sync, and SSE for local GUI/mobile wake-up events.

## Current Architecture

```text
rafiq-app (Expo / React Native)
  SQLite runtime DB + durable sync queue
  Supabase Auth + background cloud sync

rafiq-backend (Node / Fastify)
  SQLite runtime DB + MQTT + SSE + AI orchestration
  Supabase sync worker

Supabase
  Postgres schema + RLS + realtime publication + storage buckets

ESP32 / MQTT
  gas, fall, relay, radar, sensor, smart-home events

rafiq-gui
  Electron local dashboard consuming backend SSE
```

Python/FastAPI files in `rafiq-backend` are legacy. Production database and API work should target `rafiq-backend/src`.

## Database Model

RAFIQ now standardizes on UUID primary keys everywhere:
- Expo SQLite
- Backend SQLite
- Supabase Postgres
- API route params and DTOs
- MQTT/SSE payloads
- TypeScript types
- Sync queues

Canonical schema groups:
- Patients: `patients`, `patient_conditions`, `emergency_contacts`
- Medical: `vitals`, `vitals_readings`, `medications`, `medication_logs`, `reminders`
- Safety: `emergency_events`, `alerts`, `fall_detection_events`, `gas_alerts`, `oxygen_alerts`, `heart_rate_alerts`, `respiratory_alerts`
- Notifications: `notifications`, `notification_receipts`
- IoT: `devices`, `esp32_devices`, `wearables`, `mqtt_events`, `sensor_readings`, `smart_home_devices`, `smart_home_commands`, `automation_logs`, `relay_logs`, `radar_presence_logs`
- AI: `ai_conversations`, `ai_messages`, `ai_memory`, `ai_context`, `ai_personality`, `ai_voice_sessions`, `ai_emotion_logs`, `ai_reminders`
- Sync: `pending_sync`, `failed_sync`, `sync_logs`, `realtime_events`

See [docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md).

## Offline-First Sync

SQLite is the primary runtime database. Supabase is cloud sync, backup, Auth, and realtime wake-up.

Write flow:
1. App/backend creates a UUID locally.
2. Data is saved to SQLite.
3. A durable `pending_sync` row is queued with an idempotency key.
4. Background sync pushes batches to Supabase.
5. Failures retry with backoff, then move to `failed_sync`.
6. Supabase Realtime wakes clients, but pull sync recovers missed events.

Conflict policy:
- Emergency events, alerts, notifications, MQTT events, sensor readings, and logs are append-only/idempotent.
- Patients, reminders, medications, devices, and AI context use versioned last-write-wins.
- JSON fields are structured for future field merge.

## Setup

### Requirements

- Node.js 20+
- npm
- Expo CLI or `npx expo`
- Supabase CLI
- MQTT broker such as Mosquitto
- Optional Ollama or external LLM provider for AI flows

### Backend

```bash
cd rafiq-backend
npm install
copy .env.example .env
npm start
```

Important backend env:

```env
PORT=3001
HOST=0.0.0.0
RAFIQ_API_KEY=replace-me
DB_PATH=./data/rafiq.db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MQTT_BROKER=mqtt://localhost:1883
```

Backend SQLite initializes from `rafiq-backend/src/db/schema.sql`. If old integer-ID tables are detected, startup preserves them as `*_legacy_YYYYMMDDHHMMSS`, creates the UUID schema, and backfills core rows with `legacy_id`.

### App

```bash
cd rafiq-app
npm install
npm run typecheck
npm start
```

App runtime SQLite initializes from `rafiq-app/src/local/schema.ts`. Domain feature writes should go through local repositories and queue sync; Supabase Auth remains cloud-backed.

### Supabase

```bash
cd rafiq-app
supabase login
supabase link --project-ref <project-ref>
supabase migration up
```

Main repair migration:

```text
rafiq-app/supabase/migrations/20260514143000_unified_offline_repair.sql
```

It creates canonical UUID tables, RLS policies, indexes, triggers, realtime publication setup, storage buckets, grants, and `NOTIFY pgrst, 'reload schema'`.

### MQTT

Backend subscribes to:

```text
rafiq/#
```

Supported topics:
- `rafiq/smarthome/{room}/{device}/state`
- `rafiq/smarthome/{room}/{device}/cmd`
- `rafiq/alerts/{patient_id}`
- `rafiq/sensor/{room}/{sensor}`

Gas/fall alerts create canonical alert subtype rows, emergency events where critical, SSE broadcasts, and queued sync.

### AI

AI route orchestration lives in `rafiq-backend/src/api/routes/ai.js` and `rafiq-backend/src/services/ai.js`. AI memory and context tables are available locally and in Supabase for durable patient context.

## API

Backend endpoints use UUID strings:
- `GET /health`
- `GET /events`
- `GET|POST /patients`
- `GET|POST|PATCH /reminders`
- `GET|POST|PATCH|DELETE /alerts`
- `GET|POST|PATCH /emergency`
- `GET|POST|PATCH /notifications`
- `GET /devices`
- `GET|POST /smarthome`
- `POST /sync/push`
- `POST /sync/pull`

See [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md).

## Validation

```bash
cd rafiq-app
npm run typecheck

cd ../rafiq-backend
Get-ChildItem -Path src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Recommended integration checks:
- Supabase migration on a fresh project
- Supabase repair migration on a schema copy
- App offline create/update of vitals, medications, reminders, notifications, and emergency events
- Reconnect and confirm `pending_sync` drains without duplicate writes
- Cross-user RLS denial and owner access success
- MQTT gas, fall, sensor, and relay command simulation

## Troubleshooting

- PGRST204/PGRST205: run the latest Supabase migration or execute `NOTIFY pgrst, 'reload schema';`
- Missing table or column in the app: confirm `rafiq-app/src/local/schema.ts` and the Supabase migration both include the table.
- Backend IDs look numeric: check for an old DB path; startup should preserve incompatible tables and create UUID tables.
- Notifications do not arrive: confirm local row exists, `pending_sync` has a queued row, SSE `/events` is connected, and MQTT broker is reachable for critical alerts.
- Realtime missed an event: run pull sync; realtime is not treated as guaranteed delivery.

## Documentation

- [Database architecture](docs/DATABASE_ARCHITECTURE.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Migration guide](docs/MIGRATION_GUIDE.md)
- [Reference ORM schemas](docs/REFERENCE_SCHEMAS.md)

## Deployment Notes

- Keep service-role keys only on the backend or trusted sync workers.
- Keep mobile clients on anon key plus RLS.
- Run SQLite with WAL enabled.
- Back up SQLite before production repair migrations.
- Apply Supabase migrations before releasing app builds that depend on new columns.
- Use backend `/sync/push` and `/sync/pull` as operational repair endpoints, not as a replacement for app background sync.
