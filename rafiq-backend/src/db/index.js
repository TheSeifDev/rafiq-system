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

  const schema = readFileSync(join(__dir, 'schema.sql'), 'utf8');
  _db.exec(schema);

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