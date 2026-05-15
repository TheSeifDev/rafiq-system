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

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dir, '..', '..', 'data', 'rafiq.db');

let _db = null;

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

  // Run schema
  const schema = readFileSync(join(__dir, 'schema.sql'), 'utf8');
  _db.exec(schema);

  // Run migrations
  runMigrations(_db);

  console.log('[db] Database initialized at:', DB_PATH);
  return _db;
}

/**
 * Apply pending migrations
 * Tracks applied migrations in _migrations table
 */
function runMigrations(db) {
  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+02:00', 'now', '+2 hours'))
    )
  `);

  // Get list of applied migrations
  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map(r => r.name)
  );

  // Find and apply pending migrations in migrations folder
  const migrationsDir = join(__dir, 'migrations');
  if (!existsSync(migrationsDir)) return;

  const migrationFiles = require('fs').readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    if (!applied.has(file)) {
      console.log(`[db] Applying migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      console.log(`[db] Migration ${file} applied successfully`);
    }
  }
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

// Re-export audit and versioning
export { log_action, getAuditTrail, getAuditByActor, getRecentAudit } from './audit.js';
export { increment_version, get_version, get_conflict_check, getRowWithVersion } from './versions.js';
export { record_sync, get_pending_syncs, mark_synced, get_sync_history, clear_synced_before } from './sync_state.js';

// Re-export sync utilities (legacy, prefer syncPriorities.js)
export { popSyncQueue, deleteSyncItems, incrementSyncAttempts } from './utils.js';

// Re-export device registry service
export * from '../services/deviceRegistry.js';

// Re-export sync priorities service
export * from '../services/syncPriorities.js';

// Re-export connection manager service
export * from '../services/connectionManager.js';