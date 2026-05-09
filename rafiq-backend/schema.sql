-- Rafiq local DB — SQLite schema implementing the 6-table Read/Write mapping
-- from "خريطة العمليات النهائية لنظام رفيق". Designed for offline operation.

PRAGMA foreign_keys = ON;

-- 1. PATIENTS — identity + medical history.
--    Read by AI/LLM, written by the mobile app.
CREATE TABLE IF NOT EXISTS patients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    age             INTEGER,
    gender          TEXT    CHECK (gender IN ('male', 'female')),
    blood_type      TEXT    CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    medical_history TEXT,
    created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- 2. ALERTS — emergencies and risks detected by the system/AI.
--    Read by App + AI, written by System + AI.
CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id  INTEGER NOT NULL,
    type        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    severity    TEXT    NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    is_read     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 3. DEVICES — peripheral sensors + wearables on the mini-PC.
--    Read by System Check, written by ESP32 / Wearable.
CREATE TABLE IF NOT EXISTS devices (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id   INTEGER NOT NULL,
    device_name  TEXT    NOT NULL,
    type         TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'offline'
                         CHECK (status IN ('online','offline','error')),
    last_seen    TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 4. EMERGENCY CONTACTS — people to call in danger.
--    Read by AI, written by App.
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id    INTEGER NOT NULL,
    name          TEXT    NOT NULL,
    relationship  TEXT,
    phone_number  TEXT    NOT NULL,
    priority      INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 5. LOCATIONS — GPS history. Latest row = current location.
--    Read by AI/App, written by GPS module / smart watch.
CREATE TABLE IF NOT EXISTS locations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id  INTEGER NOT NULL,
    latitude    REAL    NOT NULL,
    longitude   REAL    NOT NULL,
    recorded_at TEXT    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 6. REMINDERS — meds, sessions, daily tasks.
--    Read by AI/App, written by App + AI (voice).
CREATE TABLE IF NOT EXISTS reminders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id   INTEGER NOT NULL,
    title        TEXT    NOT NULL,
    description  TEXT,
    time         TEXT    NOT NULL,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Indexes for the hottest queries.
CREATE INDEX IF NOT EXISTS idx_alerts_patient    ON alerts(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread     ON alerts(patient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_severity   ON alerts(severity, is_read);
CREATE INDEX IF NOT EXISTS idx_devices_patient   ON devices(patient_id);
CREATE INDEX IF NOT EXISTS idx_locations_patient ON locations(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_active  ON reminders(patient_id, is_active, time);
CREATE INDEX IF NOT EXISTS idx_contacts_patient  ON emergency_contacts(patient_id, priority);

-- ─── Supabase sync queue ───
-- When Supabase env vars are set, every local write enqueues a row here.
-- A background flusher pushes them up via REST. If offline, they stay queued
-- until reconnect, so nothing is ever lost.
CREATE TABLE IF NOT EXISTS _sync_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name  TEXT    NOT NULL,
    row_id      INTEGER NOT NULL,
    operation   TEXT    NOT NULL CHECK (operation IN ('upsert', 'delete')),
    error_count INTEGER NOT NULL DEFAULT 0,
    queued_at   TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_order ON _sync_queue(id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON _sync_queue(table_name);
