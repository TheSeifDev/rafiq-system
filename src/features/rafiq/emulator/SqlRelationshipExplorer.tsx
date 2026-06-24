'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Bell,
  Brain,
  Cloud,
  Cpu,
  HeartPulse,
  Home,
  KeyRound,
  Link2,
  MapPin,
  RefreshCw,
  Router,
  ShieldAlert,
  Smartphone,
  Table2,
  Watch,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { SyncQueueEntry } from '@/src/features/rafiq/shared/types';

type TableAccent = 'red' | 'blue' | 'emerald' | 'amber' | 'white';

interface SchemaColumn {
  name: string;
  type: string;
  key?: 'PK' | 'FK';
}

interface SchemaTable {
  id: string;
  label: string;
  owner: string;
  role: string;
  x: number;
  y: number;
  accent: TableAccent;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  columns: SchemaColumn[];
}

interface SchemaRelationship {
  from: string;
  to: string;
  label: string;
  tone: TableAccent;
}

const SQL_TABLES: SchemaTable[] = [
  {
    id: 'patients',
    label: 'patients',
    owner: 'Core / App',
    role: 'Identity root for care state',
    x: 92,
    y: 88,
    accent: 'red',
    icon: HeartPulse,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'name', type: 'text' },
      { name: 'conditions', type: 'json' },
      { name: 'updated_at', type: 'ts' },
    ],
  },
  {
    id: 'wearable_metrics',
    label: 'wearable_metrics',
    owner: 'Wearable Gateway',
    role: 'Append-only biometric readings',
    x: 300,
    y: 70,
    accent: 'blue',
    icon: Watch,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'patient_id', type: 'uuid', key: 'FK' },
      { name: 'bpm', type: 'int' },
      { name: 'spo2', type: 'int' },
      { name: 'ts', type: 'ts' },
    ],
  },
  {
    id: 'alerts',
    label: 'alerts',
    owner: 'Decision Engine',
    role: 'Risk and health alert ledger',
    x: 510,
    y: 92,
    accent: 'amber',
    icon: Bell,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'patient_id', type: 'uuid', key: 'FK' },
      { name: 'source_event_id', type: 'uuid', key: 'FK' },
      { name: 'severity', type: 'text' },
      { name: 'status', type: 'text' },
    ],
  },
  {
    id: 'emergency_states',
    label: 'emergency_states',
    owner: 'Emergency Engine',
    role: 'Active emergency truth table',
    x: 730,
    y: 84,
    accent: 'red',
    icon: ShieldAlert,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'alert_id', type: 'uuid', key: 'FK' },
      { name: 'type', type: 'text' },
      { name: 'severity', type: 'text' },
      { name: 'resolved_at', type: 'ts' },
    ],
  },
  {
    id: 'emergency_contacts',
    label: 'emergency_contacts',
    owner: 'App / Safety',
    role: 'Escalation recipients',
    x: 945,
    y: 78,
    accent: 'white',
    icon: Smartphone,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'patient_id', type: 'uuid', key: 'FK' },
      { name: 'phone', type: 'text' },
      { name: 'priority', type: 'int' },
    ],
  },
  {
    id: 'reminders',
    label: 'reminders',
    owner: 'App / AI',
    role: 'Medication and care reminders',
    x: 92,
    y: 275,
    accent: 'white',
    icon: Activity,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'patient_id', type: 'uuid', key: 'FK' },
      { name: 'scheduled_at', type: 'ts' },
      { name: 'done', type: 'bool' },
    ],
  },
  {
    id: 'ai_memory',
    label: 'ai_memory',
    owner: 'AI Router',
    role: 'Patient context and memory',
    x: 300,
    y: 278,
    accent: 'blue',
    icon: Brain,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'patient_id', type: 'uuid', key: 'FK' },
      { name: 'context_json', type: 'json' },
      { name: 'updated_at', type: 'ts' },
    ],
  },
  {
    id: 'ai_logs',
    label: 'ai_logs',
    owner: 'AI Orchestrator',
    role: 'Inference trace and response audit',
    x: 510,
    y: 286,
    accent: 'red',
    icon: Brain,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'memory_id', type: 'uuid', key: 'FK' },
      { name: 'model', type: 'text' },
      { name: 'latency_ms', type: 'int' },
    ],
  },
  {
    id: 'system_events',
    label: 'system_events',
    owner: 'Core Event Engine',
    role: 'Unified operating event ledger',
    x: 730,
    y: 296,
    accent: 'emerald',
    icon: Cpu,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'service', type: 'text' },
      { name: 'event', type: 'text' },
      { name: 'data', type: 'json' },
      { name: 'ts', type: 'ts' },
    ],
  },
  {
    id: 'sync_queue',
    label: 'sync_queue',
    owner: 'Sync Engine',
    role: 'Durable offline cloud queue',
    x: 955,
    y: 298,
    accent: 'amber',
    icon: RefreshCw,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'table_name', type: 'text' },
      { name: 'operation', type: 'text' },
      { name: 'payload', type: 'json' },
      { name: 'retries', type: 'int' },
    ],
  },
  {
    id: 'devices',
    label: 'devices',
    owner: 'Home Assistant Bridge',
    role: 'Automation device registry',
    x: 92,
    y: 500,
    accent: 'emerald',
    icon: Home,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'room', type: 'text' },
      { name: 'protocol', type: 'text' },
      { name: 'critical', type: 'bool' },
    ],
  },
  {
    id: 'mqtt_logs',
    label: 'mqtt_logs',
    owner: 'MQTT Broker',
    role: 'Message transport history',
    x: 300,
    y: 510,
    accent: 'blue',
    icon: Router,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'device_id', type: 'uuid', key: 'FK' },
      { name: 'topic', type: 'text' },
      { name: 'payload', type: 'json' },
      { name: 'qos', type: 'int' },
    ],
  },
  {
    id: 'device_status',
    label: 'device_status',
    owner: 'HA Bridge',
    role: 'Latest device state snapshot',
    x: 510,
    y: 510,
    accent: 'emerald',
    icon: Table2,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'device_id', type: 'uuid', key: 'FK' },
      { name: 'state', type: 'json' },
      { name: 'last_seen', type: 'ts' },
    ],
  },
  {
    id: 'automation_rules',
    label: 'automation_rules',
    owner: 'Automation Engine',
    role: 'Trigger and action definitions',
    x: 730,
    y: 520,
    accent: 'white',
    icon: Link2,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'device_id', type: 'uuid', key: 'FK' },
      { name: 'trigger_json', type: 'json' },
      { name: 'action_json', type: 'json' },
    ],
  },
  {
    id: 'locations',
    label: 'locations',
    owner: 'Wearable / App',
    role: 'GPS and home-zone history',
    x: 955,
    y: 520,
    accent: 'blue',
    icon: MapPin,
    columns: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'patient_id', type: 'uuid', key: 'FK' },
      { name: 'lat', type: 'real' },
      { name: 'lng', type: 'real' },
      { name: 'ts', type: 'ts' },
    ],
  },
  {
    id: 'supabase',
    label: 'Supabase sync',
    owner: 'Cloud Replica',
    role: 'External PostgreSQL mirror',
    x: 1110,
    y: 298,
    accent: 'blue',
    icon: Cloud,
    columns: [
      { name: 'realtime', type: 'channel' },
      { name: 'push', type: 'upsert' },
      { name: 'pull', type: 'subscribe' },
      { name: 'retry', type: 'queue' },
    ],
  },
];

const SQL_RELATIONSHIPS: SchemaRelationship[] = [
  { from: 'patients', to: 'wearable_metrics', label: 'patient_id', tone: 'blue' },
  { from: 'wearable_metrics', to: 'alerts', label: 'anomaly source', tone: 'amber' },
  { from: 'alerts', to: 'emergency_states', label: 'alert_id', tone: 'red' },
  { from: 'patients', to: 'emergency_contacts', label: 'patient_id', tone: 'white' },
  { from: 'patients', to: 'reminders', label: 'patient_id', tone: 'white' },
  { from: 'patients', to: 'ai_memory', label: 'patient_id', tone: 'blue' },
  { from: 'ai_memory', to: 'ai_logs', label: 'memory trace', tone: 'red' },
  { from: 'ai_logs', to: 'system_events', label: 'audit event', tone: 'emerald' },
  { from: 'alerts', to: 'system_events', label: 'alert event', tone: 'amber' },
  { from: 'system_events', to: 'sync_queue', label: 'enqueue', tone: 'amber' },
  { from: 'sync_queue', to: 'supabase', label: 'push / pull / retry', tone: 'blue' },
  { from: 'devices', to: 'mqtt_logs', label: 'device_id', tone: 'blue' },
  { from: 'mqtt_logs', to: 'device_status', label: 'latest state', tone: 'emerald' },
  { from: 'devices', to: 'automation_rules', label: 'device_id', tone: 'white' },
  { from: 'automation_rules', to: 'system_events', label: 'rule fired', tone: 'emerald' },
  { from: 'patients', to: 'locations', label: 'patient_id', tone: 'blue' },
  { from: 'locations', to: 'alerts', label: 'geofence risk', tone: 'amber' },
];

const accentStyles: Record<TableAccent, { border: string; bg: string; icon: string; line: string; stroke: string; faint: string }> = {
  red: {
    border: 'border-[#FF3B3B]/24',
    bg: 'bg-[#FF3B3B]/8',
    icon: 'text-[#FF3B3B]',
    line: 'bg-[#FF3B3B]/55',
    stroke: 'rgba(255,59,59,0.48)',
    faint: 'rgba(255,59,59,0.13)',
  },
  blue: {
    border: 'border-blue-400/20',
    bg: 'bg-blue-400/8',
    icon: 'text-blue-400',
    line: 'bg-blue-400/45',
    stroke: 'rgba(96,165,250,0.40)',
    faint: 'rgba(96,165,250,0.11)',
  },
  emerald: {
    border: 'border-emerald-400/20',
    bg: 'bg-emerald-400/8',
    icon: 'text-emerald-400',
    line: 'bg-emerald-400/45',
    stroke: 'rgba(52,211,153,0.36)',
    faint: 'rgba(52,211,153,0.10)',
  },
  amber: {
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/8',
    icon: 'text-amber-400',
    line: 'bg-amber-400/45',
    stroke: 'rgba(251,191,36,0.40)',
    faint: 'rgba(251,191,36,0.10)',
  },
  white: {
    border: 'border-white/12',
    bg: 'bg-white/6',
    icon: 'text-white/80',
    line: 'bg-white/35',
    stroke: 'rgba(255,255,255,0.31)',
    faint: 'rgba(255,255,255,0.075)',
  },
};

function makePath(from: SchemaTable, to: SchemaTable) {
  const direction = to.x >= from.x ? 1 : -1;
  const spread = Math.min(165, Math.max(70, Math.abs(to.x - from.x) * 0.42));
  return `M ${from.x} ${from.y} C ${from.x + spread * direction} ${from.y}, ${to.x - spread * direction} ${to.y}, ${to.x} ${to.y}`;
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-white/32">
      {label}
    </span>
  );
}

export default function SqlRelationshipExplorer({ syncQueue }: { syncQueue: SyncQueueEntry[] }) {
  const [activeTable, setActiveTable] = useState('patients');
  const tableById = useMemo(() => new Map(SQL_TABLES.map((table) => [table.id, table])), []);
  const active = tableById.get(activeTable) ?? SQL_TABLES[0];
  const related = useMemo(
    () =>
      new Set(
        SQL_RELATIONSHIPS
          .filter((rel) => rel.from === activeTable || rel.to === activeTable)
          .flatMap((rel) => [rel.from, rel.to]),
      ),
    [activeTable],
  );
  const activeQueueTables = new Set(syncQueue.slice(-8).map((entry) => entry.table));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FF3B3B]/65">
            SQL relationship explorer
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Database topology under live simulation.</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="15 tables" />
          <StatusBadge label="PK / FK" />
          <StatusBadge label="sync pulses" />
          <StatusBadge label="offline queue" />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#FF3B3B]/6 blur-[80px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

        <div className="grid gap-0 xl:grid-cols-[1fr_310px]">
          <div className="overflow-x-auto p-4" style={{ scrollbarWidth: 'thin' }}>
            <div className="relative h-[680px] w-[1180px]">
              <div
                className="pointer-events-none absolute inset-0 opacity-65"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: '42px 42px',
                  maskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
                }}
              />

              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1180 680" aria-hidden="true">
                <defs>
                  <filter id="sql-relation-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect x="24" y="28" width="1070" height="590" rx="32" fill="rgba(255,255,255,0.012)" stroke="rgba(255,255,255,0.055)" />
                <rect x="884" y="205" width="270" height="190" rx="26" fill="rgba(96,165,250,0.035)" stroke="rgba(96,165,250,0.12)" />
                <text x="900" y="230" fill="rgba(147,197,253,0.55)" fontSize="10" fontFamily="monospace" letterSpacing="2">
                  CLOUD SYNC BOUNDARY
                </text>

                {SQL_RELATIONSHIPS.map((relationship, index) => {
                  const from = tableById.get(relationship.from)!;
                  const to = tableById.get(relationship.to)!;
                  const isActive = relationship.from === activeTable || relationship.to === activeTable;
                  const tone = accentStyles[relationship.tone];
                  const midX = (from.x + to.x) / 2;
                  const midY = (from.y + to.y) / 2;

                  return (
                    <g key={`${relationship.from}-${relationship.to}`}>
                      <motion.path
                        d={makePath(from, to)}
                        fill="none"
                        stroke={isActive ? tone.stroke : 'rgba(255,255,255,0.105)'}
                        strokeWidth={isActive ? 1.8 : 1}
                        filter={isActive ? 'url(#sql-relation-glow)' : undefined}
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: index * 0.025 }}
                      />
                      <motion.circle
                        cx={midX}
                        cy={midY}
                        r={isActive ? 3 : 2}
                        fill={tone.stroke}
                        animate={{ opacity: [0.15, 0.85, 0.15], scale: [0.75, 1.25, 0.75] }}
                        transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.09 }}
                      />
                      {isActive && (
                        <text x={midX + 8} y={midY - 8} fill="rgba(255,255,255,0.58)" fontSize="9" fontFamily="monospace">
                          {relationship.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {SQL_TABLES.map((table, index) => {
                const Icon = table.icon;
                const accent = accentStyles[table.accent];
                const isActive = activeTable === table.id;
                const isRelated = related.has(table.id);
                const hasQueueActivity = activeQueueTables.has(table.id);

                return (
                  <motion.button
                    key={table.id}
                    type="button"
                    onMouseEnter={() => setActiveTable(table.id)}
                    onFocus={() => setActiveTable(table.id)}
                    initial={{ opacity: 0, scale: 0.94 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.32, delay: index * 0.025 }}
                    style={{ left: table.x, top: table.y, transform: 'translate(-50%, -50%)' }}
                    className={[
                      'absolute z-10 w-[178px] rounded-2xl border p-3 text-left backdrop-blur-xl transition-all duration-300',
                      isActive ? 'bg-black/92 shadow-[0_0_40px_rgba(255,59,59,0.10)]' : 'bg-black/70',
                      isActive || isRelated ? accent.border : 'border-white/[0.07]',
                      isActive ? 'scale-[1.045]' : 'hover:scale-[1.025]',
                    ].join(' ')}
                  >
                    <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/22 to-transparent" />
                    <span className="mb-2 flex items-center justify-between gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.bg} ${accent.icon}`}>
                        <Icon size={15} strokeWidth={1.6} />
                      </span>
                      <span className="flex items-center gap-1.5">
                        {hasQueueActivity && (
                          <motion.span
                            className="h-1.5 w-1.5 rounded-full bg-[#FF3B3B]"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                        <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-white/25">
                          {table.owner}
                        </span>
                      </span>
                    </span>
                    <span className="block font-mono text-[11px] font-black text-white">{table.label}</span>
                    <span className="mt-1 block text-[9px] leading-tight text-white/35">{table.role}</span>
                    <span className={`absolute bottom-0 left-0 h-[1.5px] ${isActive ? 'w-full' : 'w-0'} ${accent.line} transition-all duration-300`} />
                  </motion.button>
                );
              })}
            </div>
          </div>

          <aside className="border-t border-white/[0.06] bg-black/30 p-5 xl:border-l xl:border-t-0">
            <div className="mb-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#FF3B3B]/70">
                Inspecting table
              </p>
              <h3 className="mt-2 font-mono text-xl font-black text-white">{active.label}</h3>
              <p className="mt-2 text-sm leading-6 text-white/42">{active.role}</p>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge label={active.owner} />
              </div>
            </div>

            <div className="space-y-2">
              {active.columns.map((column) => (
                <div key={`${active.id}-${column.name}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {column.key ? <KeyRound size={11} className={column.key === 'PK' ? 'text-[#FF3B3B]' : 'text-blue-400'} /> : <Table2 size={11} className="text-white/22" />}
                    <span className="truncate font-mono text-[10px] text-white/62">{column.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {column.key && (
                      <span className="rounded border border-white/[0.08] px-1.5 py-px font-mono text-[7px] text-white/40">
                        {column.key}
                      </span>
                    )}
                    <span className="font-mono text-[8px] text-white/25">{column.type}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/28">
                  Query activity
                </span>
                <Activity size={13} className="text-[#FF3B3B]/70" />
              </div>
              <div className="space-y-2">
                {syncQueue.slice(-5).reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-mono text-[9px] text-white/42">
                      {entry.operation} {entry.table}
                    </span>
                    <span className="shrink-0 rounded border border-white/[0.07] px-1.5 py-px font-mono text-[7px] uppercase text-white/30">
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-400/12 bg-blue-400/[0.025] p-4">
              <div className="flex items-center gap-2">
                <Cloud size={13} className="text-blue-400/75" />
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-blue-400/60">
                  SQLite to Sync Queue to Supabase to App
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-[#FF3B3B]/70 via-amber-400/70 to-blue-400/70"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                  style={{ width: '55%' }}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
