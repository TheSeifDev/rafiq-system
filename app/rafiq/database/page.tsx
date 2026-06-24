'use client';

import { motion } from 'framer-motion';
import { Database, RefreshCw, Cloud, HardDrive, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';
import StatusPulse from '@/src/features/rafiq/shared/components/StatusPulse';
import DatabaseMissionControl from '@/src/features/rafiq/database/components/DatabaseMissionControl';

const TABLES = [
  { table: 'patients',          columns: 'id, name, dob, conditions[], medications[]',  sync: '↑↓ Bidirectional',  priority: 'Critical' },
  { table: 'wearable_metrics',  columns: 'id, patient_id, bpm, spo2, steps, ts',        sync: '↑ Push-only',       priority: 'High'     },
  { table: 'alerts',            columns: 'id, type, severity, source, status, ts',       sync: '↑↓ Bidirectional',  priority: 'Critical' },
  { table: 'reminders',         columns: 'id, patient_id, type, scheduled_at, done',     sync: '↑↓ Bidirectional',  priority: 'High'     },
  { table: 'ai_logs',           columns: 'id, model, input, output, latency_ms, ts',     sync: '↑ Push-only',       priority: 'Medium'   },
  { table: 'ai_memory',         columns: 'id, patient_id, context_json, updated_at',     sync: '↑↓ Bidirectional',  priority: 'High'     },
  { table: 'sync_queue',        columns: 'id, table_name, op, payload, status, retries', sync: '⊘ Local-only',      priority: 'System'   },
  { table: 'mqtt_logs',         columns: 'id, topic, payload, qos, ts',                  sync: '⊘ Local-only',      priority: 'Low'      },
  { table: 'system_events',     columns: 'id, service, event, data, ts',                 sync: '⊘ Local-only',      priority: 'Low'      },
  { table: 'emergency_states',  columns: 'id, type, severity, active, resolved_at',      sync: '↑↓ Bidirectional',  priority: 'Critical' },
  { table: 'automation_rules',  columns: 'id, trigger_json, action_json, enabled',       sync: '↑↓ Bidirectional',  priority: 'High'     },
  { table: 'device_status',     columns: 'id, device_id, room, state, last_seen',        sync: '↑ Push-only',       priority: 'Medium'   },
];

const ACCESS_MATRIX = [
  { service: 'Core Engine',       patients: 'R/W', wearable_metrics: 'R/W', alerts: 'R/W', ai_logs: 'R',   sync_queue: 'R/W', emergency_states: 'R/W' },
  { service: 'AI Orchestrator',   patients: 'R',   wearable_metrics: 'R',   alerts: 'R',   ai_logs: 'R/W', sync_queue: '—',   emergency_states: 'R'   },
  { service: 'Sync Engine',       patients: 'R',   wearable_metrics: 'R',   alerts: 'R',   ai_logs: 'R',   sync_queue: 'R/W', emergency_states: 'R'   },
  { service: 'Emergency Engine',  patients: 'R',   wearable_metrics: 'R',   alerts: 'R/W', ai_logs: '—',   sync_queue: '—',   emergency_states: 'R/W' },
  { service: 'HA Bridge',         patients: '—',   wearable_metrics: '—',   alerts: 'R',   ai_logs: '—',   sync_queue: '—',   emergency_states: 'R'   },
  { service: 'FastAPI (REST)',     patients: 'R/W', wearable_metrics: 'R',   alerts: 'R/W', ai_logs: 'R',   sync_queue: 'R',   emergency_states: 'R'   },
];

const SQLITE_INIT = `-- SQLite initialization with WAL mode
PRAGMA journal_mode = WAL;        -- Write-Ahead Logging
PRAGMA synchronous = NORMAL;      -- fsync on WAL checkpoints
PRAGMA cache_size = -65536;       -- 64MB page cache
PRAGMA foreign_keys = ON;         -- Referential integrity
PRAGMA auto_vacuum = INCREMENTAL; -- Reclaim space incrementally
PRAGMA wal_autocheckpoint = 1000; -- Checkpoint every 1000 pages

-- Sync queue table (core of offline-first architecture)
CREATE TABLE IF NOT EXISTS sync_queue (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  table_name  TEXT NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  row_id      TEXT NOT NULL,
  payload     JSON NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  retries     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);`;

const SYNC_TRIGGER = `-- Auto-queue writes for sync (example: wearable_metrics)
CREATE TRIGGER wearable_metrics_sync_insert
AFTER INSERT ON wearable_metrics
BEGIN
  INSERT INTO sync_queue (table_name, operation, row_id, payload)
  VALUES (
    'wearable_metrics', 'INSERT', NEW.id,
    json_object('id', NEW.id, 'patient_id', NEW.patient_id,
                'bpm', NEW.bpm, 'spo2', NEW.spo2, 'ts', NEW.ts)
  );
END;`;

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = {
    Critical: 'bg-[#FF3B3B]/15 text-[#FF3B3B]/80 border-[#FF3B3B]/20',
    High:     'bg-amber-400/12 text-amber-400/80 border-amber-400/20',
    Medium:   'bg-blue-400/12  text-blue-400/80  border-blue-400/20',
    Low:      'bg-white/5     text-white/30     border-white/10',
    System:   'bg-emerald-400/10 text-emerald-400/60 border-emerald-400/15',
  }[priority] ?? 'text-white/40 border-white/10';

  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${cfg}`}>
      {priority}
    </span>
  );
}

export default function DatabasePage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        <SectionHeader
          eyebrow="Data Layer"
          title="Database Architecture"
          description="RAFIQ uses a dual-database architecture: SQLite as the always-available local store and Supabase as the cloud replica. All writes succeed locally first. Cloud sync is a background best-effort operation — never a blocker."
          status="online"
          layer="Data Layer"
          version="v3.0"
          metrics={[
            { label: 'Tables', value: '12' },
            { label: 'Strategy', value: 'LWW' },
            { label: 'Mode', value: 'Offline-first' },
          ]}
        />

        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <HardDrive size={15} strokeWidth={1.5} />, title: 'SQLite', sublabel: 'WAL · FTS5 · JSON1', description: 'Primary local store. Always writable. WAL mode for concurrent reads.', status: 'online' as const, accent: 'red' as const, tags: ['SQLite 3.44', 'WAL', 'in-process'] },
            { icon: <Cloud size={15} strokeWidth={1.5} />, title: 'Supabase', sublabel: 'PostgreSQL · RLS · Realtime', description: 'Cloud replica. Receives sync pushes. Provides multi-device access.', status: 'online' as const, accent: 'blue' as const, tags: ['PostgreSQL 15', 'RLS', 'Realtime'] },
            { icon: <RefreshCw size={15} strokeWidth={1.5} />, title: 'Sync Engine', sublabel: '30s cycle · Retry queue', description: 'Background service. Reads sync_queue, pushes to Supabase, pulls remote changes.', status: 'syncing' as const, accent: 'red' as const, tags: ['async', 'exponential-backoff'] },
            { icon: <AlertTriangle size={15} strokeWidth={1.5} />, title: 'Conflict Resolver', sublabel: 'LWW · Vector clocks', description: 'Last-Write-Wins by updated_at. Vector clocks for emergency_states.', status: 'online' as const, accent: 'blue' as const, tags: ['LWW', 'Vector Clock', 'idempotent'] },
          ].map((card, i) => (
            <ArchCard key={card.title} {...card} delay={i * 0.05} />
          ))}
        </div>

        
        <InfraPanel title="Offline-First Sync Flow" subtitle="All writes local → background push" glow="red">
          <div className="overflow-x-auto p-5">
            <div className="flex min-w-max items-center gap-0">
              {[
                { label: 'App Write', sub: 'any service', color: 'border-white/15 text-white/60' },
                { label: '→', color: 'border-0 text-white/20', arrow: true },
                { label: 'SQLite', sub: 'instant, offline-safe', color: 'border-emerald-400/25 text-emerald-400' },
                { label: '→', color: 'border-0 text-white/20', arrow: true },
                { label: 'Trigger → sync_queue', sub: 'auto-enqueued', color: 'border-amber-400/25 text-amber-400' },
                { label: '→', color: 'border-0 text-white/20', arrow: true },
                { label: 'Sync Engine', sub: '30s cycle', color: 'border-blue-400/25 text-blue-400' },
                { label: '→', color: 'border-0 text-white/20', arrow: true },
                { label: 'Supabase', sub: 'if online', color: 'border-[#FF3B3B]/25 text-[#FF3B3B]/80' },
              ].map((step, i) => (
                <div key={i} className={`rounded-xl font-mono whitespace-nowrap ${step.arrow ? 'px-2 text-sm' : 'border px-3 py-2'} ${step.color}`}>
                  {!step.arrow && (
                    <>
                      <div className="text-[11px] font-bold">{step.label}</div>
                      {'sub' in step && <div className="text-[9px] opacity-60">{step.sub}</div>}
                    </>
                  )}
                  {step.arrow && step.label}
                </div>
              ))}
            </div>
          </div>
        </InfraPanel>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Table Schema · 12 tables
          </h2>
          <DataTable
            columns={[
              { key: 'table', label: 'Table', className: 'min-w-[160px]' },
              { key: 'columns', label: 'Key Columns', className: 'min-w-[280px]' },
              { key: 'sync', label: 'Sync Direction' },
              { key: 'priority', label: 'Priority', align: 'center', render: (row) => <PriorityBadge priority={String(row.priority)} /> },
            ]}
            data={TABLES}
            subtitle="SQLite primary · Supabase replica · sync_queue-driven push"
          />
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Service Read/Write Access Matrix
          </h2>
          <DataTable
            columns={[
              { key: 'service', label: 'Service', className: 'min-w-[160px]' },
              { key: 'patients', label: 'patients', align: 'center' },
              { key: 'wearable_metrics', label: 'wearable', align: 'center' },
              { key: 'alerts', label: 'alerts', align: 'center' },
              { key: 'ai_logs', label: 'ai_logs', align: 'center' },
              { key: 'sync_queue', label: 'sync_queue', align: 'center' },
              { key: 'emergency_states', label: 'emergency', align: 'center' },
            ]}
            data={ACCESS_MATRIX}
            compact
          />
        </div>

        
        {/* ── Database Mission Control ── */}
        <DatabaseMissionControl />

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">SQLite Init + Sync Queue</h2>
            <CodeBlock code={SQLITE_INIT} language="sql" title="db/init.sql" />
          </div>
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Auto-Queue Trigger</h2>
            <CodeBlock code={SYNC_TRIGGER} language="sql" title="db/triggers.sql" />
          </div>
        </div>

        
        <InfraPanel title="Conflict Resolution Strategy" glow="blue">
          <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                <h3 className="text-[12px] font-bold text-white">Last-Write-Wins (default)</h3>
              </div>
              <p className="text-[11px] leading-relaxed text-white/40">Applied to all non-critical tables. The row with the highest <code className="text-white/60">updated_at</code> timestamp wins. Simple, predictable, and fast to resolve. Works well for wearable metrics, device states, and AI logs.</p>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Clock size={14} className="text-amber-400" />
                <h3 className="text-[12px] font-bold text-white">Vector Clocks (emergency data)</h3>
              </div>
              <p className="text-[11px] leading-relaxed text-white/40">Applied to <code className="text-white/60">emergency_states</code> and <code className="text-white/60">alerts</code>. Tracks causality — if an emergency was resolved locally but the cloud still shows active, the resolution wins. Prevents false-clear scenarios.</p>
            </div>
          </div>
        </InfraPanel>

      </div>
    </div>
  );
}
