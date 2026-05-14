# RAFIQ Unified Database Architecture

## Decision Record

RAFIQ now uses UUID primary keys across Expo SQLite, backend SQLite, Supabase Postgres, API DTOs, MQTT events, realtime payloads, and sync queues. The production backend is the Node/Fastify service in `rafiq-backend/src`; Python/FastAPI files are legacy and should not receive new database work unless explicitly revived.

SQLite is the runtime source of truth on devices and the Mini-PC. Supabase is the cloud sync, backup, auth, realtime wake-up, and Data API layer.

## Database Layers

| Layer | Role | Primary Files |
| --- | --- | --- |
| Expo SQLite | Mobile runtime database and offline queue | `rafiq-app/src/local/schema.ts`, `rafiq-app/src/local/repository.ts`, `rafiq-app/src/local/syncEngine.ts` |
| Backend SQLite | Mini-PC runtime database, MQTT ingestion, SSE events | `rafiq-backend/src/db/schema.sql`, `rafiq-backend/src/db/*.js` |
| Supabase Postgres | Cloud sync, RLS, realtime publication, storage buckets | `rafiq-app/supabase/migrations/20260514143000_unified_offline_repair.sql` |
| Shared contracts | API and sync payload shapes | `docs/API_CONTRACTS.md`, `rafiq-app/src/types/database.ts`, `rafiq-app/src/types/offline.ts` |

## Canonical Entity Groups

Medical and patient:
- `profiles`, `patients`, `patient_conditions`
- `vitals`, `vitals_readings`
- `medications`, `medication_logs`, `reminders`
- `emergency_contacts`, `emergency_events`
- `alerts`, `fall_detection_events`, `gas_alerts`, `oxygen_alerts`, `heart_rate_alerts`, `respiratory_alerts`

Notifications and sync:
- `notifications`, `notification_receipts`
- `pending_sync`, `failed_sync`, `sync_logs`, `realtime_events`

Smart home and IoT:
- `devices`, `esp32_devices`, `wearables`
- `mqtt_events`, `sensor_readings`
- `smart_home_devices`, `smart_home_commands`
- `automation_logs`, `relay_logs`, `radar_presence_logs`

AI:
- `ai_conversations`, `ai_messages`, `ai_memory`, `ai_context`
- `ai_personality`, `ai_voice_sessions`, `ai_emotion_logs`, `ai_reminders`

## Offline-First Write Path

1. App or backend creates a UUID locally.
2. The row is inserted or updated in SQLite inside the local repository.
3. A durable row is added to `pending_sync` with an idempotency key.
4. Background sync pushes batches to Supabase with `upsert(..., onConflict: 'id')`.
5. Failed rows back off and eventually move to `failed_sync`.
6. Realtime events are recorded as wake-up hints, then pull sync reconciles missed rows.

## Conflict Policy

Append-only/idempotent:
- `emergency_events`, `alerts`, `notifications`, alert subtype tables, `mqtt_events`, `sensor_readings`, `medication_logs`, `sync_logs`, `realtime_events`

Versioned last-write-wins:
- `patients`, `medications`, `reminders`, `devices`, `smart_home_devices`, AI context/memory

Structured field merge:
- JSON columns such as `address_data`, `reporter_data`, `hospital_data`, `config`, `metadata`, `data`, `state`, and `raw_payload` can be field-merged during a future reconciliation service. Current implementation stores conflict metadata and uses timestamp/version order.

## Supabase Security

Every exposed public table has RLS enabled in the repair migration. Policies use authenticated access plus direct `user_id`, patient ownership joins, or service-role bypass. Policies do not authorize through editable user metadata.

The migration ends with `NOTIFY pgrst, 'reload schema'` to refresh PostgREST schema cache and prevent PGRST204/PGRST205 drift after schema changes.

