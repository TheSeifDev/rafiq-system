-- RAFIQ Node backend canonical local SQLite schema.
-- UUIDs are stored as TEXT. SQLite remains the Mini-PC runtime database;
-- Supabase is cloud sync/realtime/backup.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  user_id TEXT,
  full_name TEXT NOT NULL,
  name TEXT,
  age INTEGER,
  gender TEXT,
  blood_type TEXT,
  phone TEXT,
  birth_date TEXT,
  medical_history TEXT,
  notes TEXT,
  address_data TEXT NOT NULL DEFAULT '{}',
  reporter_data TEXT NOT NULL DEFAULT '{}',
  hospital_data TEXT NOT NULL DEFAULT '{}',
  latitude REAL,
  longitude REAL,
  geocoded_address TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  name TEXT NOT NULL,
  relation TEXT,
  relationship TEXT,
  phone TEXT NOT NULL,
  phone_number TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  device_name TEXT NOT NULL,
  name TEXT,
  device_type TEXT NOT NULL DEFAULT 'other',
  type TEXT,
  mac_address TEXT,
  ip_address TEXT,
  firmware_version TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen TEXT,
  battery_level INTEGER,
  signal_strength INTEGER,
  location TEXT,
  mqtt_topic TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS esp32_devices (
  id TEXT PRIMARY KEY,
  device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  chip_id TEXT UNIQUE,
  mqtt_client_id TEXT,
  board_type TEXT DEFAULT 'esp32',
  firmware_version TEXT,
  ip_address TEXT,
  last_boot_at TEXT,
  last_seen TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vitals_readings (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  source TEXT NOT NULL DEFAULT 'backend',
  heart_rate INTEGER,
  oxygen_level REAL,
  oxygen_saturation REAL,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  temperature REAL,
  respiratory_rate INTEGER,
  blood_glucose REAL,
  weight_kg REAL,
  steps INTEGER,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  device_name TEXT,
  confidence REAL,
  raw_payload TEXT NOT NULL DEFAULT '{}',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  times TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medication_logs (
  id TEXT PRIMARY KEY,
  medication_id TEXT REFERENCES medications(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  scheduled_for TEXT,
  skipped INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'backend',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  time TEXT,
  datetime TEXT,
  repeat TEXT DEFAULT 'none',
  repeat_pattern TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'backend',
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT,
  category TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'medium',
  is_read INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  screen TEXT,
  source TEXT NOT NULL DEFAULT 'backend',
  idempotency_key TEXT,
  delivered_at TEXT,
  read_at TEXT,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS emergency_events (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  status TEXT NOT NULL DEFAULT 'active',
  message TEXT,
  latitude REAL,
  longitude REAL,
  location_name TEXT,
  source TEXT NOT NULL DEFAULT 'backend',
  source_event_id TEXT,
  response_time INTEGER,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  emergency_event_id TEXT REFERENCES emergency_events(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fall_detection_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  confidence REAL,
  location_name TEXT,
  emergency_triggered INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  raw_payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gas_alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  level TEXT NOT NULL,
  concentration_ppm INTEGER,
  location TEXT,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved INTEGER NOT NULL DEFAULT 0,
  raw_payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS oxygen_alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  vitals_reading_id TEXT REFERENCES vitals_readings(id) ON DELETE SET NULL,
  oxygen_saturation REAL,
  threshold REAL DEFAULT 92,
  severity TEXT NOT NULL DEFAULT 'high',
  resolved INTEGER NOT NULL DEFAULT 0,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS heart_rate_alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  vitals_reading_id TEXT REFERENCES vitals_readings(id) ON DELETE SET NULL,
  heart_rate INTEGER,
  threshold_low INTEGER DEFAULT 45,
  threshold_high INTEGER DEFAULT 120,
  severity TEXT NOT NULL DEFAULT 'high',
  resolved INTEGER NOT NULL DEFAULT 0,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS respiratory_alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  vitals_reading_id TEXT REFERENCES vitals_readings(id) ON DELETE SET NULL,
  respiratory_rate INTEGER,
  threshold_low INTEGER DEFAULT 8,
  threshold_high INTEGER DEFAULT 28,
  severity TEXT NOT NULL DEFAULT 'high',
  resolved INTEGER NOT NULL DEFAULT 0,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mqtt_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  qos INTEGER DEFAULT 0,
  retain INTEGER DEFAULT 0,
  direction TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  payload_text TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  sensor_type TEXT NOT NULL,
  value REAL,
  unit TEXT,
  room TEXT,
  raw_payload TEXT NOT NULL DEFAULT '{}',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smart_home_devices (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'other',
  room TEXT,
  mqtt_topic TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'off',
  state TEXT NOT NULL DEFAULT '{}',
  config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smart_home_commands (
  id TEXT PRIMARY KEY,
  smart_home_device_id TEXT REFERENCES smart_home_devices(id) ON DELETE SET NULL,
  user_id TEXT,
  command TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  acknowledged_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  automation_name TEXT,
  trigger_type TEXT,
  action TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS relay_logs (
  id TEXT PRIMARY KEY,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  state TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'mqtt',
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS radar_presence_logs (
  id TEXT PRIMARY KEY,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  presence INTEGER NOT NULL,
  distance_cm REAL,
  zone TEXT,
  raw_payload TEXT NOT NULL DEFAULT '{}',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  title TEXT,
  summary TEXT,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES ai_conversations(id) ON DELETE CASCADE,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  reasoning_details TEXT,
  model TEXT,
  provider TEXT,
  tokens_used INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_memory (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  memory_type TEXT NOT NULL DEFAULT 'general',
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '{}',
  confidence REAL,
  source_message_id TEXT REFERENCES ai_messages(id) ON DELETE SET NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(patient_id, memory_type, key)
);

CREATE TABLE IF NOT EXISTS ai_context (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  context_type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  last_built_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_personality (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  language TEXT NOT NULL DEFAULT 'ar',
  tone TEXT NOT NULL DEFAULT 'warm',
  preferences TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_voice_sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  conversation_id TEXT REFERENCES ai_conversations(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  stt_provider TEXT,
  tts_provider TEXT,
  transcript TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_emotion_logs (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  user_id TEXT,
  conversation_id TEXT REFERENCES ai_conversations(id) ON DELETE SET NULL,
  emotion TEXT NOT NULL,
  confidence REAL,
  source TEXT NOT NULL DEFAULT 'ai',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_reminders (
  id TEXT PRIMARY KEY,
  reminder_id TEXT REFERENCES reminders(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES ai_conversations(id) ON DELETE SET NULL,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT,
  instruction TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pending_sync (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  device_id TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  idempotency_key TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS failed_sync (
  id TEXT PRIMARY KEY,
  pending_sync_id TEXT,
  user_id TEXT,
  device_id TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  error_code TEXT,
  error_message TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  failed_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolution TEXT
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  device_id TEXT,
  direction TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  status TEXT NOT NULL,
  pushed INTEGER NOT NULL DEFAULT 0,
  pulled INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS realtime_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Backward-compatible local smart home state table name.
CREATE VIEW IF NOT EXISTS smarthome_devices AS
  SELECT
    id,
    mqtt_topic AS mqtt_id,
    device_name AS label,
    room,
    device_type AS type,
    status,
    state AS last_val,
    updated_at
  FROM smart_home_devices;

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_patient_priority ON emergency_contacts(patient_id, priority);
CREATE INDEX IF NOT EXISTS idx_devices_patient_status ON devices(patient_id, status, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_readings_patient_time ON vitals_readings(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_medications_patient_active ON medications(patient_id, active, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_active_time ON reminders(patient_id, is_active, COALESCE(datetime, time));
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_time ON alerts(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_events_patient_time ON emergency_events(patient_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_mqtt_events_topic_time ON mqtt_events(topic, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time ON sensor_readings(device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_sync_ready ON pending_sync(status, next_attempt_at, priority);
