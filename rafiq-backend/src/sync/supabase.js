/**
 * sync/supabase.js
 * Background sync: SQLite _sync_queue → Supabase
 * Runs every 30s, handles INSERT / UPDATE / DELETE
 */

import { createClient } from '@supabase/supabase-js';
import { getDb, popSyncQueue, deleteSyncItems, incrementSyncAttempts } from '../db/index.js';

// Tables allowed to push to Supabase (not smarthome_devices — local only)
const PUSH_TABLES = new Set(['patients', 'alerts', 'reminders', 'emergency_contacts', 'locations', 'devices']);

let supabase = null;

export function initSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.warn('[sync] SUPABASE_URL/KEY not set — sync disabled');
    return false;
  }
  supabase = createClient(url, key);
  console.log('[sync] Supabase client ready');
  return true;
}

export async function flushQueue() {
  if (!supabase) return { pushed: 0, dropped: 0, failed: 0 };

  const db = getDb();
  const items = popSyncQueue(db, 50);
  if (!items.length) return { pushed: 0, dropped: 0, failed: 0 };

  const pushed = [], dropped = [], failed = [];

  for (const item of items) {
    if (!PUSH_TABLES.has(item.table_name)) {
      dropped.push(item.id);
      continue;
    }

    let payload;
    try { payload = JSON.parse(item.payload); } catch {
      dropped.push(item.id);
      continue;
    }

    try {
      if (item.operation === 'DELETE') {
        const { error } = await supabase
          .from(item.table_name)
          .delete()
          .eq('id', item.record_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(item.table_name)
          .upsert(payload, { onConflict: 'id' });
        if (error) throw error;
      }
      pushed.push(item.id);
    } catch (err) {
      console.error(`[sync] Failed ${item.table_name}#${item.record_id}:`, err.message);
      if (item.attempts >= 5) {
        dropped.push(item.id);  // give up after 5 tries
      } else {
        failed.push(item.id);
      }
    }
  }

  deleteSyncItems(db, [...pushed, ...dropped]);
  incrementSyncAttempts(db, failed);

  return { pushed: pushed.length, dropped: dropped.length, failed: failed.length };
}

export function startSyncLoop(intervalMs = 30_000) {
  if (!supabase) return;
  setInterval(async () => {
    const r = await flushQueue().catch(e => ({ error: e.message }));
    if (r.pushed > 0 || r.failed > 0) {
      console.log('[sync]', JSON.stringify(r));
    }
  }, intervalMs);
}

// ── Pull (Supabase → local) ───────────────────────────────────────────────────
const PULL_TABLES = ['patients', 'emergency_contacts', 'reminders'];

export async function pullFromSupabase(db) {
  if (!supabase) return { pulled: 0 };
  let total = 0;

  for (const table of PULL_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true });
    if (error) { console.error('[sync pull]', table, error.message); continue; }

    for (const row of data ?? []) {
      const cols  = Object.keys(row).join(', ');
      const marks = Object.keys(row).map(() => '?').join(', ');
      const vals  = Object.values(row);
      const upd   = Object.keys(row)
        .filter(k => k !== 'id')
        .map(k => `${k} = excluded.${k}`)
        .join(', ');
      db.prepare(
        `INSERT INTO ${table} (${cols}) VALUES (${marks})
         ON CONFLICT(id) DO UPDATE SET ${upd}`
      ).run(...vals);
      total++;
    }
  }

  return { pulled: total };
}
