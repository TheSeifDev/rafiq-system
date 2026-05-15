-- rafiq-backend/src/db/migrations/003_device_registry.sql
-- Device Registry System: devices, sessions, sync state, capabilities

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Device Registry ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  device_uuid       TEXT UNIQUE NOT NULL,
  device_type       TEXT NOT NULL CHECK (device_type IN ('mobile', 'watch', 'rover', 'esp32', 'caregiver', 'dashboard')),
  patient_id        INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown')),
  last_seen         TEXT,
  firmware_version  TEXT,
  app_version       TEXT,
  sync_cursor       INTEGER NOT NULL DEFAULT 0,
  trusted           INTEGER NOT NULL DEFAULT 0,
  capabilities      TEXT,                   -- JSON array of capability strings
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

-- ── Device Sessions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id       INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  session_token   TEXT UNIQUE NOT NULL,
  started_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  last_activity   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  ip_address      TEXT,
  user_agent      TEXT
);

-- ── Device Sync State (per-table cursor tracking) ─────────────────────────────
CREATE TABLE IF NOT EXISTS device_sync_state (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id       INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  table_name      TEXT NOT NULL,
  last_sync_at    TEXT,
  cursor_position INTEGER NOT NULL DEFAULT 0,
  pending_count   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (device_id, table_name)
);

-- ── Device Capabilities (capability → device lookup) ───────────────────────────
CREATE TABLE IF NOT EXISTS device_capabilities (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id       INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  capability      TEXT NOT NULL CHECK (capability IN ('sensors', 'gps', 'camera', 'speaker', 'emergency', 'mqtt')),
  UNIQUE (device_id, capability)
);

-- ── Add device_id to sync queue ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _sync_queue_new (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id       INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  table_name      TEXT NOT NULL,
  operation       TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id       INTEGER NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 5,
  payload         TEXT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  next_retry_at   TEXT
);

-- Migrate existing rows
INSERT INTO _sync_queue_new (id, device_id, table_name, operation, record_id, priority, payload, attempts, created_at)
SELECT id, NULL, table_name, operation, record_id, 5, payload, attempts, created_at FROM _sync_queue;

DROP TABLE _sync_queue;
ALTER TABLE _sync_queue_new RENAME TO _sync_queue;

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_devices_uuid        ON devices(device_uuid);
CREATE INDEX IF NOT EXISTS idx_devices_patient     ON devices(patient_id);
CREATE INDEX IF NOT EXISTS idx_devices_status       ON devices(status);
CREATE INDEX IF NOT EXISTS idx_device_sessions_token ON device_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sync_state_device ON device_sync_state(device_id);
CREATE INDEX IF NOT EXISTS idx_device_capabilities_device ON device_capabilities(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority  ON _sync_queue(priority, id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_device    ON _sync_queue(device_id);