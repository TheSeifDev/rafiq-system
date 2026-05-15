-- rafiq-backend/src/db/migrations/002_soft_delete_versioning.sql
-- Migration: Soft-delete and versioned mutations system

-- Add soft-delete columns to mutable tables
ALTER TABLE patients ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE patients ADD COLUMN deleted_at TEXT;
ALTER TABLE patients ADD COLUMN deleted_by TEXT;
ALTER TABLE patients ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE patients ADD COLUMN updated_by_device TEXT;
ALTER TABLE patients ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE emergency_contacts ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE emergency_contacts ADD COLUMN deleted_at TEXT;
ALTER TABLE emergency_contacts ADD COLUMN deleted_by TEXT;
ALTER TABLE emergency_contacts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE emergency_contacts ADD COLUMN updated_by_device TEXT;
ALTER TABLE emergency_contacts ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE reminders ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reminders ADD COLUMN deleted_at TEXT;
ALTER TABLE reminders ADD COLUMN deleted_by TEXT;
ALTER TABLE reminders ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE reminders ADD COLUMN updated_by_device TEXT;
ALTER TABLE reminders ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;

-- medications table (referenced in task but not in schema - creating for completeness)
CREATE TABLE IF NOT EXISTS medications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id      INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  dosage          TEXT,
  frequency       TEXT,
  start_date      TEXT,
  end_date        TEXT,
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at      TEXT,
  deleted_by      TEXT,
  version         INTEGER NOT NULL DEFAULT 1,
  updated_at      TEXT,
  updated_by_device TEXT,
  sync_version    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

-- Append-only audit log table
CREATE TABLE IF NOT EXISTS _audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  actor           TEXT NOT NULL,          -- device id, user id, or 'system'
  device          TEXT,                   -- device that performed the action
  action          TEXT NOT NULL,           -- INSERT | UPDATE | DELETE | SOFT_DELETE | RESTORE
  entity_type     TEXT NOT NULL,          -- patients | alerts | reminders | etc.
  entity_id       INTEGER NOT NULL,
  before          TEXT,                    -- JSON snapshot before change
  after           TEXT,                    -- JSON snapshot after change
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

-- Sync state tracking table for sync engine
CREATE TABLE IF NOT EXISTS _sync_state (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name      TEXT NOT NULL,
  row_id          INTEGER NOT NULL,
  direction       TEXT NOT NULL,           -- push | pull
  sync_priority   INTEGER NOT NULL DEFAULT 0,
  next_retry_at   TEXT,
  retry_backoff_ms INTEGER NOT NULL DEFAULT 1000,
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  synced_at       TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
);

-- Indexes for audit log and sync state
CREATE INDEX IF NOT EXISTS idx_audit_entity   ON _audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON _audit_log(actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_state_pending ON _sync_state(table_name, next_retry_at) WHERE synced_at IS NULL;