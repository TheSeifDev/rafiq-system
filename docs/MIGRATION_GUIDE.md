# RAFIQ Migration Guide

## Supabase

Run the repair migration from:

```bash
cd rafiq-app
supabase migration up
```

Main migration:
- `supabase/migrations/20260514143000_unified_offline_repair.sql`

It creates canonical UUID tables, backfill helper map `rafiq_entity_uuid_map`, RLS policies, indexes, updated-at triggers, realtime publication registration, storage buckets, grants, and PostgREST schema-cache reload.

## Expo SQLite

The app initializes the local runtime database from:

```text
rafiq-app/src/local/schema.ts
```

The migration is idempotent and creates:
- Canonical domain tables
- `pending_sync`, `failed_sync`, `sync_logs`, `realtime_events`
- WAL-safe indexes for patient, alert, reminder, notification, MQTT, and sensor queries

## Backend SQLite

The Node backend initializes from:

```text
rafiq-backend/src/db/schema.sql
```

Startup performs a non-destructive repair:
- incompatible legacy tables are renamed to `*_legacy_YYYYMMDDHHMMSS`
- UUID schema is created
- core legacy rows are backfilled with new UUIDs and `legacy_id`
- legacy tables remain available for manual audit

## Validation

Run:

```bash
cd rafiq-app
npm run typecheck

cd ../rafiq-backend
Get-ChildItem -Path src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Recommended database checks:
- Confirm every queued row has `record_id`, `operation`, and `idempotency_key`
- Confirm Supabase `patients.id` and all foreign keys are `uuid`
- Confirm PostgREST can query `patients`, `vitals_readings`, `notifications`, `gas_alerts`, and `fall_detection_events`
- Confirm RLS denies cross-user reads and allows owner/service-role access

