/**
 * db/utils.js - Database helper utilities
 */

export function cairoNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Cairo' })
    .replace(' ', 'T') + '+02:00';
}

export function enqueueSync(db, table, op, id, payload) {
  db.prepare(
    `INSERT INTO _sync_queue (table_name, operation, record_id, payload)
     VALUES (?, ?, ?, ?)`
  ).run(table, op, id, JSON.stringify(payload));
}

// Sync queue operations - require db instance to be passed
export function popSyncQueue(db, limit = 50) {
  return db.prepare('SELECT * FROM _sync_queue ORDER BY id ASC LIMIT ?').all(limit);
}

export function deleteSyncItems(db, ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM _sync_queue WHERE id IN (${placeholders})`).run(...ids);
}

export function incrementSyncAttempts(db, ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE _sync_queue SET attempts = attempts + 1 WHERE id IN (${placeholders})`).run(...ids);
}