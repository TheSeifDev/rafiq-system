-- rafiq-backend/schema.sql
-- Main local database schema (mirrors Supabase schema)
-- All timestamps in ISO 8601 with Cairo timezone

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS patients (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  age             INTEGER,
  medical_history TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,        -- fall | high_pulse | sos | smarthome
  message     TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'medium',  -- low | medium | high | critical
  source      TEXT,                 -- device id or sensor name
  resolved    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

CREATE TABLE IF NOT EXISTS devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,        -- wearable | esp32 | relay | sensor
  status      TEXT NOT NULL DEFAULT 'offline',  -- online | offline | error
  last_seen   TEXT,
  metadata    TEXT                  -- JSON blob for extra device data
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  relation    TEXT
);

CREATE TABLE IF NOT EXISTS locations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  accuracy    REAL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  time        TEXT NOT NULL,        -- ISO 8601 with explicit TZ (+02:00)
  repeat      TEXT DEFAULT 'none',  -- none | daily | weekly
  done        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

-- Smart home state table (local only, not synced)
CREATE TABLE IF NOT EXISTS smarthome_devices (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  mqtt_id   TEXT UNIQUE NOT NULL,   -- e.g. "esp32/room1/relay1"
  label     TEXT NOT NULL,
  room      TEXT,
  type      TEXT NOT NULL,          -- relay | sensor | camera | lock
  state     TEXT NOT NULL DEFAULT 'off',
  last_val  TEXT,                   -- last sensor reading (JSON)
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

-- Sync queue (outbound to Supabase)
CREATE TABLE IF NOT EXISTS _sync_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name  TEXT NOT NULL,
  operation   TEXT NOT NULL,        -- INSERT | UPDATE | DELETE
  record_id   INTEGER NOT NULL,
  payload     TEXT NOT NULL,        -- JSON
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

-- Emergency events table
CREATE TABLE IF NOT EXISTS emergency_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  alert_id      INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  location      TEXT,
  response_time INTEGER,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  resolved_at   TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_patient   ON alerts(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_time   ON reminders(time);
CREATE INDEX IF NOT EXISTS idx_locations_patient ON locations(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table  ON _sync_queue(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_emergency_events_patient ON emergency_events(patient_id, created_at DESC);
