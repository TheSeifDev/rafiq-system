/**
 * services/startupRecovery.js
 * Run on startup: check WAL, detect corruption, recover if needed, verify sync queue
 */

import { getDb } from '../db/index.js';
import { checkpoint, integrityCheck, detectCorruption, getWALStats, checkStorageSpace, recoverFromCorruption, cleanupStaleWAL } from '../db/walMaintenance.js';
import { popSyncQueue, deleteSyncItems } from '../db/utils.js';
import { join } from 'path';

let _startupRan = false;

/**
 * Run full startup recovery sequence
 */
export async function runStartupRecovery() {
  if (_startupRan) {
    console.log('[startup] Already ran, skipping');
    return;
  }
  _startupRan = true;

  console.log('[startup] Running recovery sequence...');

  // 1. Check WAL integrity
  console.log('[startup] Step 1: Checking WAL integrity...');
  const integrity = integrityCheck();
  if (!integrity.ok) {
    console.error('[startup] WAL integrity failed:', integrity.messages);
    await _attemptRecovery();
  } else {
    console.log('[startup] WAL integrity OK');
  }

  // 2. Run checkpoint if needed
  console.log('[startup] Step 2: Running checkpoint if needed...');
  const stats = getWALStats();
  if (stats.wal_size > 10 * 1024 * 1024) { // >10MB
    console.log('[startup] Large WAL detected, checkpointing...');
    checkpoint();
  } else {
    console.log(`[startup] WAL size OK (${stats.wal_size} bytes)`);
  }

  // 3. Detect corruption
  console.log('[startup] Step 3: Detecting corruption...');
  const corruption = detectCorruption();
  if (corruption.corrupted) {
    console.error('[startup] Corruption detected:', corruption.issues);
    await _attemptRecovery();
  } else {
    console.log('[startup] No corruption detected');
  }

  // 4. Check storage space
  console.log('[startup] Step 4: Checking storage...');
  const storage = checkStorageSpace();
  console.log('[startup] Storage:', storage);
  if (storage.available_mb < 100) {
    console.warn('[startup] Low storage! Consider cleanup or backup');
  }

  // 5. Cleanup stale WAL
  console.log('[startup] Step 5: Cleanup stale WAL files...');
  cleanupStaleWAL();

  // 6. Verify sync queue consistency
  console.log('[startup] Step 6: Verifying sync queue...');
  await _verifySyncQueue();

  // 7. Reconcile stuck sync items
  console.log('[startup] Step 7: Reconcile stuck sync items...');
  await _reconcileStuckSync();

  console.log('[startup] Recovery sequence complete');
}

/**
 * Attempt to recover from corruption using backup
 */
async function _attemptRecovery() {
  const db = getDb();
  // Look for backup in data directory
  const { existsSync, readdirSync } = await import('fs');
  const { dirname } = await import('path');
  const dataDir = dirname(db.name);

  const candidates = readdirSync(dataDir)
    .filter(f => f.includes('backup') || f.includes('.backup'))
    .map(f => join(dataDir, f))
    .filter(f => existsSync(f));

  if (candidates.length > 0) {
    // Use most recent backup
    const backupPath = candidates.sort().pop();
    console.log('[startup] Attempting recovery from:', backupPath);
    try {
      await recoverFromCorruption(backupPath);
      console.log('[startup] Recovery successful');
    } catch (e) {
      console.error('[startup] Recovery failed:', e.message);
    }
  } else {
    console.error('[startup] No backup found for recovery!');
  }
}

/**
 * Verify sync queue for consistency
 */
async function _verifySyncQueue() {
  const db = getDb();

  // Check for orphaned sync items (record no longer exists)
  const queue = popSyncQueue(db, 1000);
  const orphans = [];

  for (const item of queue) {
    let exists = false;
    const table = item.table_name;
    const id = item.record_id;

    if (table === 'patients') {
      exists = db.prepare('SELECT 1 FROM patients WHERE id = ?').get(id) !== undefined;
    } else if (table === 'alerts') {
      exists = db.prepare('SELECT 1 FROM alerts WHERE id = ?').get(id) !== undefined;
    } else if (table === 'devices') {
      exists = db.prepare('SELECT 1 FROM devices WHERE id = ?').get(id) !== undefined;
    } else if (table === 'emergency_contacts') {
      exists = db.prepare('SELECT 1 FROM emergency_contacts WHERE id = ?').get(id) !== undefined;
    } else if (table === 'locations') {
      exists = db.prepare('SELECT 1 FROM locations WHERE id = ?').get(id) !== undefined;
    } else if (table === 'reminders') {
      exists = db.prepare('SELECT 1 FROM reminders WHERE id = ?').get(id) !== undefined;
    }

    if (!exists) orphans.push(item.id);
  }

  if (orphans.length > 0) {
    console.log(`[startup] Removing ${orphans.length} orphaned sync items`);
    deleteSyncItems(db, orphans);
  } else {
    console.log('[startup] Sync queue OK');
  }
}

/**
 * Reconcile stuck sync items (high attempt count)
 */
async function _reconcileStuckSync() {
  const db = getDb();

  // Items that have failed too many times
  const stuck = db.prepare(
    `SELECT * FROM _sync_queue WHERE attempts >= 5 ORDER BY created_at ASC LIMIT 50`
  ).all();

  if (stuck.length > 0) {
    console.log(`[startup] Found ${stuck.length} stuck sync items`);

    for (const item of stuck) {
      // Reset attempts if old (>24h) — give it another chance
      const created = new Date(item.created_at);
      if (Date.now() - created.getTime() > 24 * 60 * 60 * 1000) {
        db.prepare('UPDATE _sync_queue SET attempts = 0 WHERE id = ?').run(item.id);
        console.log(`[startup] Reset stuck sync item: ${item.id}`);
      } else {
        // Otherwise archive it
        const archive = db.prepare('SELECT 1 FROM _sync_queue_archive').get();
        if (!archive) {
          db.exec('CREATE TABLE IF NOT EXISTS _sync_queue_archive AS SELECT * FROM _sync_queue WHERE 1=0');
        }
        db.prepare('INSERT INTO _sync_queue_archive SELECT * FROM _sync_queue WHERE id = ?').run(item.id);
        deleteSyncItems(db, [item.id]);
        console.log(`[startup] Archived stuck sync item: ${item.id}`);
      }
    }
  } else {
    console.log('[startup] No stuck sync items');
  }
}

/**
 * Get startup recovery status
 */
export function getStartupRecoveryStatus() {
  return {
    ran: _startupRan,
    wal_stats: getWALStats(),
    storage: checkStorageSpace(),
  };
}