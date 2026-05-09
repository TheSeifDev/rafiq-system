-- Run this once on your Supabase project (SQL Editor) so the cloud side
-- has the same tables. Column names + types must match local SQLite.
--
-- Two main differences from schema.sql:
--   1. Postgres types instead of SQLite affinities (TIMESTAMPTZ, BOOLEAN, etc.)
--   2. No `_sync_queue` table — that's a local-only concept.

CREATE TABLE IF NOT EXISTS patients (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    age             INTEGER,
    gender          TEXT CHECK (gender IN ('male','female')),
    blood_type      TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    medical_history TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id          BIGSERIAL PRIMARY KEY,
    patient_id  BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    message     TEXT NOT NULL,
    severity    TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    is_read     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id           BIGSERIAL PRIMARY KEY,
    patient_id   BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    device_name  TEXT NOT NULL,
    type         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'offline'
                 CHECK (status IN ('online','offline','error')),
    last_seen    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id            BIGSERIAL PRIMARY KEY,
    patient_id    BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    relationship  TEXT,
    phone_number  TEXT NOT NULL,
    priority      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS locations (
    id          BIGSERIAL PRIMARY KEY,
    patient_id  BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
    id           BIGSERIAL PRIMARY KEY,
    patient_id   BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT,
    time         TIMESTAMPTZ NOT NULL,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Hot-path indexes (mirror schema.sql).
CREATE INDEX IF NOT EXISTS idx_alerts_patient    ON alerts(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread     ON alerts(patient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_severity   ON alerts(severity, is_read);
CREATE INDEX IF NOT EXISTS idx_devices_patient   ON devices(patient_id);
CREATE INDEX IF NOT EXISTS idx_locations_patient ON locations(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_active  ON reminders(patient_id, is_active, time);
CREATE INDEX IF NOT EXISTS idx_contacts_patient  ON emergency_contacts(patient_id, priority);
