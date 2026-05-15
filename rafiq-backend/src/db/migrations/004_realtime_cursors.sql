-- 004_realtime_cursors.sql
-- Realtime cursors and missed event tracking for SSE/WebSocket recovery

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Track last seen cursor per device per channel
CREATE TABLE IF NOT EXISTS realtime_cursors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  channel     TEXT NOT NULL,
  last_cursor TEXT NOT NULL DEFAULT '',
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  UNIQUE(device_id, channel)
);

-- Store missed events for later replay
CREATE TABLE IF NOT EXISTS realtime_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  payload     TEXT NOT NULL,       -- JSON
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  delivered   INTEGER NOT NULL DEFAULT 0
);

-- Detect stale WebSocket connections
CREATE TABLE IF NOT EXISTS stale_connections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL UNIQUE,
  detected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours')),
  last_ping   TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_realtime_cursors_device  ON realtime_cursors(device_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_device  ON realtime_events(device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_realtime_events_delivered ON realtime_events(delivered, created_at);
CREATE INDEX IF NOT EXISTS idx_stale_connections_device ON stale_connections(device_id);