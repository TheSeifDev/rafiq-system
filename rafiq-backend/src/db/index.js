/**
 * db/index.js - Database initialization and exports
 * Uses better-sqlite3 for fast synchronous operations (edge-optimized)
 *
 * IMPORTANT: Requires Visual Studio Build Tools to compile native module.
 * On Windows: Install "Desktop development with C++" workload.
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dir, '..', '..', 'data', 'rafiq.db');

let _db = null;

function tableExists(db, table) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name = ?").get(table));
}

function columns(db, table) {
  if (!tableExists(db, table)) return [];
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function hasColumn(db, table, column) {
  return columns(db, table).some(c => c.name === column);
}

function needsCanonicalRepair(db, table, requiredColumns = []) {
  if (!tableExists(db, table)) return false;
  const info = columns(db, table);
  const id = info.find(c => c.name === 'id');
  if (id && !String(id.type || '').toUpperCase().includes('TEXT')) return true;
  return requiredColumns.some(column => !info.some(c => c.name === column));
}

function renameLegacyTables(db) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const candidates = [
    ['patients', ['full_name', 'user_id']],
    ['emergency_contacts', ['patient_id', 'phone']],
    ['devices', ['device_name', 'device_type']],
    ['smarthome_devices', []],
    ['reminders', ['patient_id', 'title']],
    ['alerts', ['message', 'severity']],
    ['emergency_events', ['type', 'status']],
    ['_sync_queue', []],
  ];
  const renamed = {};

  for (const [table, required] of candidates) {
    if (!needsCanonicalRepair(db, table, required)) continue;
    const legacy = `${table}_legacy_${stamp}`;
    db.prepare(`ALTER TABLE ${table} RENAME TO ${legacy}`).run();
    renamed[table] = legacy;
    console.warn(`[db] Preserved incompatible ${table} as ${legacy}`);
  }

  return renamed;
}

function backfillLegacyData(db, renamed) {
  const patientMap = new Map();
  if (renamed.patients) {
    const rows = db.prepare(`SELECT * FROM ${renamed.patients}`).all();
    const insert = db.prepare(
      `INSERT OR IGNORE INTO patients
        (id, legacy_id, full_name, name, age, medical_history, notes, created_at, updated_at)
       VALUES
        (@id, @legacy_id, @full_name, @name, @age, @medical_history, @notes, COALESCE(@created_at, datetime('now')), COALESCE(@updated_at, datetime('now')))`
    );
    for (const row of rows) {
      const id = randomUUID();
      patientMap.set(String(row.id), id);
      const fullName = row.full_name ?? row.name ?? `Legacy Patient ${row.id}`;
      insert.run({
        id,
        legacy_id: String(row.id),
        full_name: fullName,
        name: row.name ?? fullName,
        age: row.age ?? null,
        medical_history: row.medical_history ?? null,
        notes: row.notes ?? null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      });
    }
  }

  if (renamed.reminders) {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO reminders
        (id, legacy_id, patient_id, title, description, time, datetime, repeat, done, created_at, updated_at)
       VALUES
        (@id, @legacy_id, @patient_id, @title, @description, @time, @datetime, @repeat, @done, COALESCE(@created_at, datetime('now')), COALESCE(@updated_at, datetime('now')))`
    );
    for (const row of db.prepare(`SELECT * FROM ${renamed.reminders}`).all()) {
      const when = row.datetime ?? row.time ?? row.created_at ?? new Date().toISOString();
      insert.run({
        id: randomUUID(),
        legacy_id: String(row.id),
        patient_id: row.patient_id ? patientMap.get(String(row.patient_id)) ?? String(row.patient_id) : null,
        title: row.title ?? row.message ?? 'Legacy reminder',
        description: row.description ?? null,
        time: when,
        datetime: when,
        repeat: row.repeat ?? 'none',
        done: row.done ?? row.completed ?? 0,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      });
    }
  }

  if (renamed.alerts) {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO alerts
        (id, legacy_id, patient_id, type, message, severity, source, resolved, created_at, updated_at)
       VALUES
        (@id, @legacy_id, @patient_id, @type, @message, @severity, @source, @resolved, COALESCE(@created_at, datetime('now')), COALESCE(@updated_at, datetime('now')))`
    );
    for (const row of db.prepare(`SELECT * FROM ${renamed.alerts}`).all()) {
      insert.run({
        id: randomUUID(),
        legacy_id: String(row.id),
        patient_id: row.patient_id ? patientMap.get(String(row.patient_id)) ?? String(row.patient_id) : null,
        type: row.type ?? 'general',
        message: row.message ?? 'Legacy alert',
        severity: row.severity ?? 'medium',
        source: row.source ?? 'legacy',
        resolved: row.resolved ?? 0,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      });
    }
  }

  if (renamed.devices) {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO devices
        (id, legacy_id, patient_id, device_name, name, device_type, type, status, metadata, created_at, updated_at)
       VALUES
        (@id, @legacy_id, @patient_id, @device_name, @name, @device_type, @type, @status, @metadata, COALESCE(@created_at, datetime('now')), COALESCE(@updated_at, datetime('now')))`
    );
    for (const row of db.prepare(`SELECT * FROM ${renamed.devices}`).all()) {
      const name = row.device_name ?? row.name ?? `Legacy device ${row.id}`;
      insert.run({
        id: randomUUID(),
        legacy_id: String(row.id),
        patient_id: row.patient_id ? patientMap.get(String(row.patient_id)) ?? String(row.patient_id) : null,
        device_name: name,
        name,
        device_type: row.device_type ?? row.type ?? 'other',
        type: row.type ?? row.device_type ?? 'other',
        status: row.status ?? 'offline',
        metadata: row.metadata ?? '{}',
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
      });
    }
  }

  if (renamed.smarthome_devices && hasColumn(db, renamed.smarthome_devices, 'mqtt_id')) {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO smart_home_devices
        (id, device_name, device_type, room, mqtt_topic, status, state)
       VALUES
        (@id, @device_name, @device_type, @room, @mqtt_topic, @status, @state)`
    );
    for (const row of db.prepare(`SELECT * FROM ${renamed.smarthome_devices}`).all()) {
      insert.run({
        id: randomUUID(),
        device_name: row.label ?? row.device_name ?? row.mqtt_id,
        device_type: row.type ?? 'device',
        room: row.room ?? null,
        mqtt_topic: row.mqtt_id,
        status: row.state ?? row.status ?? 'offline',
        state: row.last_val ?? '{}',
      });
    }
  }
}

export function getDb() {
  if (!_db) throw new Error('DB not initialized — call initDb() first');
  return _db;
}

export function initDb() {
  // Ensure data directory exists
  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Use require for better-sqlite3 (native module)
  const Database = require('better-sqlite3');
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  const renamed = renameLegacyTables(_db);
  const schema = readFileSync(join(__dir, 'schema.sql'), 'utf8');
  _db.exec(schema);
  backfillLegacyData(_db, renamed);

  console.log('[db] Database initialized at:', DB_PATH);
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// Re-export domain queries
export * from './patients.js';
export * from './alerts.js';
export * from './devices.js';

// Re-export sync utilities
export { popSyncQueue, deleteSyncItems, incrementSyncAttempts } from './utils.js';
