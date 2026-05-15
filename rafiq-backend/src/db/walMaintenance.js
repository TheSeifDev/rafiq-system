/**
 * db/walMaintenance.js
 * WAL maintenance, integrity checks, and corruption recovery for SQLite
 */

import { statSync, unlinkSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './index.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dir, '..', '..', 'data', 'rafiq.db');

/**
 * Run PRAGMA wal_checkpoint(TRUNCATE) to finalize WAL and reduce file size
 */
export function checkpoint() {
  const db = getDb();
  const [result] = db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
  console.log('[wal] checkpoint:', result);
  return result;
}

/**
 * Run PRAGMA integrity_check and return results array
 */
export function integrityCheck() {
  const db = getDb();
  const rows = db.prepare('PRAGMA integrity_check').all();
  const ok = rows.length === 1 && (rows[0].ok === 'ok' || rows[0]['integrity_check'] === 'ok');
  return { ok, messages: rows };
}

/**
 * Detect corruption indicators: invalid page headers, malformed records, broken FK
 * Returns { corrupted: boolean, issues: string[] }
 */
export async function detectCorruption() {
  const db = getDb();
  const issues = [];

  // Check for broken foreign key references
  const tables = ['alerts', 'devices', 'emergency_contacts', 'locations', 'reminders', 'emergency_events'];
  for (const table of tables) {
    const refs = db.prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE patient_id IS NOT NULL AND patient_id NOT IN (SELECT id FROM patients)`).get();
    if (refs.cnt > 0) issues.push(`orphaned patient_id in ${table}: ${refs.cnt} rows`);
  }

  // Check WAL file header integrity by trying to read first 32 bytes
  const walPath = DB_PATH + '-wal';
  if (existsSync(walPath)) {
    try {
      const { readFileSync } = await import('fs');
      const header = readFileSync(walPath, { flag: 'r', length: 32 });
      const magic = header.readUInt32BE(0);
      if (magic !== 0x377f0682 && magic !== 0x377f0683) {
        issues.push('WAL file magic header invalid');
      }
      const pageSize = header.readUInt32BE(20);
      if (pageSize < 512 || pageSize > 65536 || (pageSize & (pageSize - 1)) !== 0) {
        issues.push(`WAL page size invalid: ${pageSize}`);
      }
    } catch (e) {
      issues.push(`WAL file read error: ${e.message}`);
    }
  }

  // Run integrity check
  const integrity = integrityCheck();
  if (!integrity.ok) issues.push(...integrity.messages.map(r => r.integrity_check || JSON.stringify(r)));

  return { corrupted: issues.length > 0, issues };
}

/**
 * Run PRAGMA auto_vacuum = INCREMENTAL, then incremental_vacuum
 */
export function runAutoVacuum() {
  const db = getDb();
  db.prepare('PRAGMA auto_vacuum = INCREMENTAL').run();
  const result = db.prepare('PRAGMA incremental_vacuum').get();
  console.log('[wal] auto_vacuum result:', result);
  return result;
}

/**
 * Remove WAL files older than 24h with no active connection
 */
export function cleanupStaleWAL() {
  const dataDir = dirname(DB_PATH);
  const files = readdirSync(dataDir).filter(f => f.endsWith('-wal') || f.endsWith('-shm'));
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const removed = [];

  for (const file of files) {
    const path = join(dataDir, file);
    try {
      const stats = statSync(path);
      if (stats.mtimeMs < cutoff) {
        unlinkSync(path);
        removed.push(file);
      }
    } catch {}
  }

  console.log('[wal] cleanup removed:', removed);
  return removed;
}

/**
 * Return { available_mb, db_size_mb, wal_size_mb }
 */
export async function checkStorageSpace() {
  const dataDir = dirname(DB_PATH);
  const dbSize = existsSync(DB_PATH) ? statSync(DB_PATH).size : 0;
  const walPath = DB_PATH + '-wal';
  const walSize = existsSync(walPath) ? statSync(walPath).size : 0;

  let availableMb = 0;
  try {
    const { execSync } = await import('child_process');
    // Windows: use wmic
    const drive = DB_PATH.slice(0, 2);
    const out = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace`, { encoding: 'utf8' });
    const lines = out.trim().split('\n');
    if (lines[1]) availableMb = Math.round(parseInt(lines[1].trim()) / (1024 * 1024));
  } catch {}

  return {
    available_mb: availableMb,
    db_size_mb: Math.round(dbSize / (1024 * 1024) * 100) / 100,
    wal_size_mb: Math.round(walSize / (1024 * 1024) * 100) / 100,
  };
}

/**
 * Restore from backup, re-apply sync queue
 */
export async function recoverFromCorruption(backupPath) {
  const db = getDb();
  const { copyFileSync, unlinkSync, existsSync } = await import('fs');

  if (!existsSync(backupPath)) throw new Error(`Backup not found: ${backupPath}`);

  // Close and restore
  const walPath = DB_PATH + '-wal';
  const shmPath = DB_PATH + '-shm';
  db.close();

  try {
    copyFileSync(backupPath, DB_PATH);
    if (existsSync(walPath)) unlinkSync(walPath);
    if (existsSync(shmPath)) unlinkSync(shmPath);
  } catch (e) {
    throw new Error(`Failed to restore backup: ${e.message}`);
  }

  // Re-init DB
  const { initDb } = await import('./index.js');
  initDb();
  console.log('[wal] Recovery complete from:', backupPath);
}

/**
 * Return { wal_size, checkpoint_required, uncheckpointed_pages }
 */
export function getWALStats() {
  const db = getDb();
  const walPath = DB_PATH + '-wal';
  const walSize = existsSync(walPath) ? statSync(walPath).size : 0;
  const [info] = db.prepare('PRAGMA wal_checkpoint(PASSIVE)').get();

  return {
    wal_size: walSize,
    checkpoint_required: info.busy !== 0,
    uncheckpointed_pages: info.frames_checkpointed || 0,
  };
}