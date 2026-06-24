'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Key, Link2, HardDrive, Cloud, RefreshCw,
  Activity, Shield, AlertTriangle, ChevronRight, GitMerge,
  Server, Cpu, ArrowDown, MonitorSpeaker,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════ */
type ColumnDef = {
  name:     string;
  type:     string;
  pk?:      boolean;
  fk?:      { table: string; col: string };
};

type Ownership = 'local' | 'cloud' | 'both';

type NodeMeta = {
  id:        string;
  label:     string;
  owner:     Ownership;
  columns:   ColumnDef[];
  reads:     string[];
  writes:    string[];
  cloudDesc: string;
  relatedTo: string[];
  size:      'lg' | 'md' | 'sm'; // visual weight
};

/* ════════════════════════════════════════════════════════════
   SCHEMA DATA
════════════════════════════════════════════════════════════ */
const NODES: Record<string, NodeMeta> = {
  patients: {
    id: 'patients', label: 'patients', owner: 'both', size: 'lg',
    reads:  ['FastAPI', 'AI Orchestrator', 'Core Engine', 'Sync Engine'],
    writes: ['FastAPI', 'Core Engine', 'Sync Engine'],
    cloudDesc: 'Replicated → Supabase',
    relatedTo: ['alerts', 'devices', 'locations', 'reminders', 'emergency_contacts', 'wearable_metrics'],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'name',       type: 'TEXT' },
      { name: 'age',        type: 'INT' },
      { name: 'blood_type', type: 'TEXT' },
      { name: 'conditions', type: 'JSON' },
      { name: 'created_at', type: 'TS' },
    ],
  },
  alerts: {
    id: 'alerts', label: 'alerts', owner: 'both', size: 'md',
    reads:  ['Core Engine', 'Emergency Engine', 'FastAPI'],
    writes: ['Core Engine', 'Emergency Engine', 'FastAPI'],
    cloudDesc: 'Replicated → Supabase',
    relatedTo: ['patients'],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'patient_id', type: 'UUID', fk: { table: 'patients', col: 'id' } },
      { name: 'type',       type: 'TEXT' },
      { name: 'severity',   type: 'TEXT' },
      { name: 'status',     type: 'TEXT' },
      { name: 'created_at', type: 'TS' },
    ],
  },
  devices: {
    id: 'devices', label: 'devices', owner: 'both', size: 'md',
    reads:  ['Core Engine', 'FastAPI'],
    writes: ['FastAPI', 'Core Engine'],
    cloudDesc: 'Replicated → Supabase',
    relatedTo: ['patients'],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'patient_id', type: 'UUID', fk: { table: 'patients', col: 'id' } },
      { name: 'name',       type: 'TEXT' },
      { name: 'type',       type: 'TEXT' },
      { name: 'last_seen',  type: 'TS' },
    ],
  },
  locations: {
    id: 'locations', label: 'locations', owner: 'both', size: 'md',
    reads:  ['Core Engine', 'FastAPI'],
    writes: ['Core Engine', 'FastAPI'],
    cloudDesc: 'Replicated → Supabase',
    relatedTo: ['patients'],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'patient_id', type: 'UUID', fk: { table: 'patients', col: 'id' } },
      { name: 'lat',        type: 'REAL' },
      { name: 'lng',        type: 'REAL' },
      { name: 'recorded_at',type: 'TS' },
    ],
  },
  reminders: {
    id: 'reminders', label: 'reminders', owner: 'both', size: 'md',
    reads:  ['Core Engine', 'FastAPI'],
    writes: ['FastAPI', 'Core Engine'],
    cloudDesc: 'Replicated → Supabase',
    relatedTo: ['patients'],
    columns: [
      { name: 'id',           type: 'UUID', pk: true },
      { name: 'patient_id',   type: 'UUID', fk: { table: 'patients', col: 'id' } },
      { name: 'type',         type: 'TEXT' },
      { name: 'scheduled_at', type: 'TS' },
      { name: 'done',         type: 'BOOL' },
    ],
  },
  emergency_contacts: {
    id: 'emergency_contacts', label: 'emergency_contacts', owner: 'both', size: 'sm',
    reads:  ['Emergency Engine', 'FastAPI'],
    writes: ['FastAPI'],
    cloudDesc: 'Replicated → Supabase',
    relatedTo: ['patients'],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'patient_id', type: 'UUID', fk: { table: 'patients', col: 'id' } },
      { name: 'name',       type: 'TEXT' },
      { name: 'phone',      type: 'TEXT' },
      { name: 'relation',   type: 'TEXT' },
    ],
  },
  wearable_metrics: {
    id: 'wearable_metrics', label: 'wearable_metrics', owner: 'local', size: 'md',
    reads:  ['Core Engine', 'AI Orchestrator'],
    writes: ['Core Engine'],
    cloudDesc: 'Push-only → Supabase',
    relatedTo: ['patients', 'sync_queue'],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'patient_id', type: 'UUID', fk: { table: 'patients', col: 'id' } },
      { name: 'bpm',        type: 'INT' },
      { name: 'spo2',       type: 'REAL' },
      { name: 'ts',         type: 'TS' },
    ],
  },
  sync_queue: {
    id: 'sync_queue', label: 'sync_queue', owner: 'local', size: 'md',
    reads:  ['Sync Engine'],
    writes: ['SQLite Trigger'],
    cloudDesc: 'Local-only — not synced',
    relatedTo: [],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'table_name', type: 'TEXT' },
      { name: 'operation',  type: 'TEXT' },
      { name: 'payload',    type: 'JSON' },
      { name: 'status',     type: 'TEXT' },
      { name: 'retries',    type: 'INT' },
    ],
  },
  profile_validation: {
    id: 'profile_validation', label: 'profile_validation', owner: 'cloud', size: 'sm',
    reads:  ['FastAPI'],
    writes: ['FastAPI'],
    cloudDesc: 'Cloud-only (Supabase auth)',
    relatedTo: [],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'user_id',    type: 'UUID', fk: { table: 'auth.users', col: 'id' } },
      { name: 'field',      type: 'TEXT' },
      { name: 'valid',      type: 'BOOL' },
      { name: 'checked_at', type: 'TS' },
    ],
  },
  ai_logs: {
    id: 'ai_logs', label: 'ai_logs', owner: 'local', size: 'sm',
    reads:  ['AI Orchestrator'],
    writes: ['AI Orchestrator'],
    cloudDesc: 'Push-only → Supabase',
    relatedTo: [],
    columns: [
      { name: 'id',         type: 'UUID', pk: true },
      { name: 'model',      type: 'TEXT' },
      { name: 'output',     type: 'TEXT' },
      { name: 'latency_ms', type: 'INT' },
      { name: 'ts',         type: 'TS' },
    ],
  },
};

/* ════════════════════════════════════════════════════════════
   RELATIONS  (from → to, meaning FK or data-flow)
════════════════════════════════════════════════════════════ */
type Relation = { from: string; to: string; kind: 'fk' | 'flow' };
const RELATIONS: Relation[] = [
  { from: 'alerts',              to: 'patients',   kind: 'fk' },
  { from: 'devices',             to: 'patients',   kind: 'fk' },
  { from: 'locations',           to: 'patients',   kind: 'fk' },
  { from: 'reminders',           to: 'patients',   kind: 'fk' },
  { from: 'emergency_contacts',  to: 'patients',   kind: 'fk' },
  { from: 'wearable_metrics',    to: 'patients',   kind: 'fk' },
  { from: 'wearable_metrics',    to: 'sync_queue', kind: 'flow' },
];

/* ════════════════════════════════════════════════════════════
   OWNERSHIP THEME
════════════════════════════════════════════════════════════ */
const OWN = {
  local: {
    short: 'LOCAL', label: 'SQLite',
    dot: '#34D399', accentBar: 'linear-gradient(90deg,#34D39966,transparent)',
    badge: 'border-emerald-400/25 bg-emerald-400/8 text-emerald-400',
    border: 'rgba(52,211,153,0.35)', glow: '0 0 28px rgba(52,211,153,0.12)',
    glowHi: '0 0 40px rgba(52,211,153,0.22)',
    dbColor: '#34D399',
  },
  cloud: {
    short: 'CLOUD', label: 'Supabase',
    dot: '#60A5FA', accentBar: 'linear-gradient(90deg,#60A5FA66,transparent)',
    badge: 'border-blue-400/25 bg-blue-400/8 text-blue-400',
    border: 'rgba(96,165,250,0.35)', glow: '0 0 28px rgba(96,165,250,0.12)',
    glowHi: '0 0 40px rgba(96,165,250,0.22)',
    dbColor: '#60A5FA',
  },
  both: {
    short: 'SYNC', label: 'Local+Cloud',
    dot: '#FF3B3B', accentBar: 'linear-gradient(90deg,#FF3B3B66,transparent)',
    badge: 'border-[#FF3B3B]/25 bg-[#FF3B3B]/8 text-[#FF3B3B]',
    border: 'rgba(255,59,59,0.35)', glow: '0 0 28px rgba(255,59,59,0.10)',
    glowHi: '0 0 44px rgba(255,59,59,0.20)',
    dbColor: '#FF3B3B',
  },
};

/* ════════════════════════════════════════════════════════════
   FLOW SCENARIOS
════════════════════════════════════════════════════════════ */
type FlowStep = { label: string; sub: string; cls: string };
type Scenario = { id: string; title: string; icon: React.ReactNode; color: string; steps: FlowStep[] };

const SCENARIOS: Scenario[] = [
  {
    id: 'patient', title: 'Patient Created', color: '#FF3B3B',
    icon: <Server size={10} />,
    steps: [
      { label: 'App',         sub: 'user action',       cls: 'text-white/60  border-white/15' },
      { label: 'FastAPI',     sub: 'POST /patients',    cls: 'text-blue-400  border-blue-400/25' },
      { label: 'SQLite',      sub: 'instant write',     cls: 'text-emerald-400 border-emerald-400/25' },
      { label: 'sync_queue',  sub: 'trigger enqueued',  cls: 'text-amber-400 border-amber-400/25' },
      { label: 'Sync Engine', sub: '30s cycle',         cls: 'text-blue-400  border-blue-400/25' },
      { label: 'Supabase',    sub: 'cloud replica',     cls: 'text-[#FF3B3B] border-[#FF3B3B]/25' },
    ],
  },
  {
    id: 'wearable', title: 'Wearable Metric', color: '#34D399',
    icon: <Activity size={10} />,
    steps: [
      { label: 'ESP32',       sub: 'sensor reading',   cls: 'text-white/60  border-white/15' },
      { label: 'MQTT',        sub: 'publish topic',    cls: 'text-amber-400 border-amber-400/25' },
      { label: 'Core Engine', sub: 'subscribe+parse',  cls: 'text-blue-400  border-blue-400/25' },
      { label: 'SQLite',      sub: 'wearable_metrics', cls: 'text-emerald-400 border-emerald-400/25' },
      { label: 'AI Analysis', sub: 'anomaly check',    cls: 'text-purple-400 border-purple-400/25' },
      { label: 'Supabase',    sub: 'push-only sync',   cls: 'text-[#FF3B3B] border-[#FF3B3B]/25' },
    ],
  },
  {
    id: 'emergency', title: 'Emergency Alert', color: '#FF3B3B',
    icon: <AlertTriangle size={10} />,
    steps: [
      { label: 'Core Engine',  sub: 'anomaly detected',   cls: 'text-[#FF3B3B] border-[#FF3B3B]/25' },
      { label: 'alerts table', sub: 'INSERT severity=5',  cls: 'text-amber-400 border-amber-400/25' },
      { label: 'Sync Engine',  sub: 'priority push',      cls: 'text-blue-400  border-blue-400/25' },
      { label: 'Supabase',     sub: 'realtime broadcast', cls: 'text-[#FF3B3B] border-[#FF3B3B]/25' },
      { label: 'App Push',     sub: 'FCM notification',   cls: 'text-emerald-400 border-emerald-400/25' },
    ],
  },
];

/* ════════════════════════════════════════════════════════════
   TOPOLOGY LAYOUT DEFINITION
   Pure CSS grid — structured hierarchy, no random positioning
════════════════════════════════════════════════════════════ */

// ──── Zone labels shown as background glass regions ────
// The topology has 3 horizontal zones:
//   TOP    : Input Services
//   MIDDLE : Local DB Fabric (SQLite + tables)
//   RIGHT  : Cloud Replica (Supabase)

// ──── Grid layout: 5 columns × N rows ────
// col 0        col 1       col 2        col 3        col 4
// [input]      [input]     [input]      [input]      [cloud zone]
// [devices]    [alerts]    [patients]   [reminders]  [Supabase]
// [wearable]   [sync_q]    [emerg_cont] [locations]  [profile_val]
//                          [ai_logs]

/* ════════════════════════════════════════════════════════════
   NODE CARD (grid-based, no absolute positioning)
════════════════════════════════════════════════════════════ */
function NodeCard({
  nodeId,
  isHighlighted,
  isDimmed,
  isSelected,
  onEnter,
  onLeave,
  onClick,
  nodeRef,
  index,
}: {
  nodeId:        string;
  isHighlighted: boolean;
  isDimmed:      boolean;
  isSelected:    boolean;
  onEnter:       () => void;
  onLeave:       () => void;
  onClick:       (e: React.MouseEvent) => void;
  nodeRef:       (el: HTMLDivElement | null) => void;
  index:         number;
}) {
  const node = NODES[nodeId];
  const own  = OWN[node.owner];

  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.35, delay: index * 0.045 }}
      animate={{
        opacity:  isDimmed ? 0.14 : 1,
        filter:   isDimmed ? 'blur(0.6px)' : 'blur(0px)',
        scale:    isHighlighted || isSelected ? 1.025 : 1,
        zIndex:   isHighlighted || isSelected ? 20 : 1,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="relative cursor-pointer rounded-[15px] backdrop-blur-2xl"
      style={{
        background:  'rgba(255,255,255,0.026)',
        border:      `1px solid ${isHighlighted || isSelected ? own.border : 'rgba(255,255,255,0.07)'}`,
        boxShadow:   isHighlighted || isSelected ? own.glowHi : own.glow,
        transition:  'border-color 0.18s, box-shadow 0.18s, opacity 0.18s, filter 0.18s',
        willChange:  'transform, opacity, filter',
      }}
    >
      {/* Ownership accent line — top edge */}
      <div className="h-[2px] w-full rounded-t-[15px]"
        style={{ background: isHighlighted || isSelected ? own.accentBar : 'rgba(255,255,255,0.04)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-md"
            style={{ background: `${own.dbColor}18` }}>
            <Database size={8} style={{ color: own.dbColor }} />
          </div>
          <span
            className="truncate font-mono font-bold text-white/88"
            style={{ fontSize: node.label.length > 17 ? '7.5px' : node.label.length > 12 ? '8.5px' : '9.5px' }}
          >
            {node.label}
          </span>
        </div>
        <span className={`shrink-0 rounded border px-1 py-px font-mono text-[6.5px] font-bold uppercase tracking-wide ${own.badge}`}>
          {own.short}
        </span>
      </div>

      {/* Columns */}
      <div className="space-y-[2.5px] px-2.5 pb-2">
        {node.columns.map((col) => (
          <div key={col.name} className="flex items-center gap-1">
            {col.pk
              ? <Key    size={6} className="shrink-0 text-amber-400/80" strokeWidth={2.5} />
              : col.fk
              ? <Link2  size={6} className="shrink-0 text-[#FF3B3B]/55" strokeWidth={2.5} />
              : <div className="h-[2.5px] w-[2.5px] shrink-0 rounded-full bg-white/16" />
            }
            <span className={`truncate font-mono ${
              col.pk ? 'text-amber-400/88 font-semibold'
              : col.fk ? 'text-[#FF3B3B]/60'
              : 'text-white/42'
            }`} style={{ fontSize: '7.5px' }}>
              {col.name}
            </span>
            <span className="ml-auto shrink-0 font-mono text-white/16" style={{ fontSize: '6.5px' }}>
              {col.type}
            </span>
          </div>
        ))}
      </div>

      {/* FK ref footer */}
      {node.columns.some((c) => c.fk) && (
        <div className="border-t border-white/[0.045] px-2.5 py-1">
          {node.columns.filter((c) => c.fk).map((c) => (
            <div key={c.name} className="flex items-center gap-0.5">
              <span className="font-mono text-white/20" style={{ fontSize: '6.5px' }}>
                → {c.fk!.table}.{c.fk!.col}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Active bottom bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[1.5px] rounded-b-[15px]"
        style={{ background: own.dot }}
        animate={{ width: isHighlighted || isSelected ? '100%' : '0%' }}
        transition={{ duration: 0.25 }}
      />
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   INPUT SERVICE CHIP (top lane)
════════════════════════════════════════════════════════════ */
function ServiceChip({ label, icon, color, index }: {
  label: string; icon: React.ReactNode; color: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 backdrop-blur-xl"
      style={{
        background:   `${color}0D`,
        borderColor:  `${color}30`,
        boxShadow:    `0 0 20px ${color}0A`,
      }}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <span className="font-mono text-[8.5px] font-bold" style={{ color: `${color}CC` }}>
        {label}
      </span>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   CLOUD NODE (Supabase)
════════════════════════════════════════════════════════════ */
function CloudNode({ nodeRef, isHighlighted }: { nodeRef: (el: HTMLDivElement | null) => void; isHighlighted: boolean }) {
  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, x: 12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="relative flex flex-col items-center gap-2 rounded-2xl border p-4 backdrop-blur-2xl"
      style={{
        background:  'rgba(30,58,138,0.08)',
        borderColor: isHighlighted ? 'rgba(96,165,250,0.5)' : 'rgba(96,165,250,0.18)',
        boxShadow:   isHighlighted ? '0 0 50px rgba(96,165,250,0.18)' : '0 0 24px rgba(96,165,250,0.06)',
        transition:  'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Pulsing ring */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute h-12 w-12 rounded-full bg-blue-400/10"
          animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/15">
          <Cloud size={20} className="text-blue-400" strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-center">
        <div className="font-mono text-[10px] font-black text-blue-400">Supabase</div>
        <div className="font-mono text-[7.5px] text-white/30">PostgreSQL · RLS · Realtime</div>
      </div>
      <div className="w-full space-y-1 rounded-lg border border-blue-400/10 bg-blue-400/5 p-2">
        {['patients','alerts','devices','locations','reminders'].map((t) => (
          <div key={t} className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-blue-400/50" />
            <span className="font-mono text-[7px] text-blue-400/60">{t}</span>
          </div>
        ))}
        <div className="font-mono text-[6.5px] text-white/20 pt-0.5">+ more replicas</div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   SYNC ENGINE NODE
════════════════════════════════════════════════════════════ */
function SyncEngineNode({ nodeRef }: { nodeRef: (el: HTMLDivElement | null) => void }) {
  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, x: 12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.08 }}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 backdrop-blur-xl"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      >
        <RefreshCw size={16} className="text-amber-400/80" strokeWidth={1.5} />
      </motion.div>
      <div className="text-center">
        <div className="font-mono text-[8px] font-bold text-amber-400/90">Sync Engine</div>
        <div className="font-mono text-[6.5px] text-white/25">30s cycle</div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   SVG TOPOLOGY LINES
   Reads real DOM rect positions — drawn over the grid
════════════════════════════════════════════════════════════ */
type PxRect = { x: number; y: number; w: number; h: number };

function getEdge(rect: PxRect, side: 'top' | 'bottom' | 'left' | 'right') {
  switch (side) {
    case 'top':    return { x: rect.x + rect.w / 2, y: rect.y };
    case 'bottom': return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
    case 'left':   return { x: rect.x,              y: rect.y + rect.h / 2 };
    case 'right':  return { x: rect.x + rect.w,     y: rect.y + rect.h / 2 };
  }
}

// Orthogonal L-shaped path: right-angle routing
function orthoPaht(a: { x: number; y: number }, b: { x: number; y: number }, via?: 'h-then-v' | 'v-then-h'): string {
  const mode = via ?? (Math.abs(b.y - a.y) > Math.abs(b.x - a.x) ? 'h-then-v' : 'v-then-h');
  if (mode === 'v-then-h') {
    const my = (a.y + b.y) / 2;
    return `M${a.x},${a.y} L${a.x},${my} L${b.x},${my} L${b.x},${b.y}`;
  } else {
    const mx = (a.x + b.x) / 2;
    return `M${a.x},${a.y} L${mx},${a.y} L${mx},${b.y} L${b.x},${b.y}`;
  }
}

function TopologyLines({
  nodeRects,
  containerRect,
  hoveredId,
}: {
  nodeRects:     Map<string, DOMRect>;
  containerRect: DOMRect | null;
  hoveredId:     string | null;
}) {
  if (!containerRect || nodeRects.size === 0) return null;

  // Translate DOM rect to container-local coords
  const local = (domRect: DOMRect): PxRect => ({
    x: domRect.left - containerRect.left,
    y: domRect.top  - containerRect.top,
    w: domRect.width,
    h: domRect.height,
  });

  const getRect = (id: string): PxRect | null => {
    const r = nodeRects.get(id);
    return r ? local(r) : null;
  };

  const relatedToHovered = new Set<string>();
  if (hoveredId) {
    RELATIONS.forEach(({ from, to }) => {
      if (from === hoveredId) relatedToHovered.add(to);
      if (to   === hoveredId) relatedToHovered.add(from);
    });
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        {/* Active flow gradient — along path direction */}
        <linearGradient id="tl-flow-red" gradientUnits="userSpaceOnUse"
          x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%"   stopColor="#FF3B3B" stopOpacity="0" />
          <stop offset="50%"  stopColor="#FF3B3B" stopOpacity="1" />
          <stop offset="100%" stopColor="#FF3B3B" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tl-flow-flow" gradientUnits="userSpaceOnUse"
          x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%"   stopColor="#60A5FA" stopOpacity="0" />
          <stop offset="50%"  stopColor="#60A5FA" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
        </linearGradient>
        {/* Arrow dots */}
        <marker id="tl-dot-red" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
          <circle cx="2.5" cy="2.5" r="2" fill="rgba(255,59,59,0.8)" />
        </marker>
        <marker id="tl-dot-dim" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.12)" />
        </marker>
        <marker id="tl-dot-flow" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
          <circle cx="2.5" cy="2.5" r="2" fill="rgba(96,165,250,0.7)" />
        </marker>
      </defs>

      {RELATIONS.map(({ from, to, kind }) => {
        const rA = getRect(from);
        const rB = getRect(to);
        if (!rA || !rB) return null;

        const key = `${from}→${to}`;
        const isActive = hoveredId !== null && (hoveredId === from || hoveredId === to);
        const isDimmed  = hoveredId !== null && !isActive;

        // Determine best edge to connect from/to
        // FK lines: bottom of child → top of parent (patients is above)
        // Flow lines: right of source → left of target
        const fromEdge = rA.y < rB.y ? getEdge(rA, 'bottom') : getEdge(rA, 'top');
        const toEdge   = rA.y < rB.y ? getEdge(rB, 'top')    : getEdge(rB, 'bottom');

        const pathD = orthoPaht(fromEdge, toEdge, 'v-then-h');
        const pathLen = Math.hypot(toEdge.x - fromEdge.x, toEdge.y - fromEdge.y) * 1.3 + 40;

        const strokeColor = isActive
          ? kind === 'fk' ? 'rgba(255,59,59,0.55)' : 'rgba(96,165,250,0.5)'
          : 'rgba(255,255,255,0.065)';
        const dotId = isActive
          ? kind === 'fk' ? 'url(#tl-dot-red)' : 'url(#tl-dot-flow)'
          : 'url(#tl-dot-dim)';

        return (
          <g key={key}>
            {/* Base orthogonal line */}
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isActive ? 1.6 : 0.9}
              markerEnd={dotId}
              style={{
                transition: 'stroke 0.18s, stroke-width 0.18s, opacity 0.18s',
                opacity:    isDimmed ? 0.07 : 1,
                filter:     isActive ? `drop-shadow(0 0 4px ${kind === 'fk' ? 'rgba(255,59,59,0.5)' : 'rgba(96,165,250,0.4)'})` : 'none',
              }}
            />

            {/* Animated packet on active */}
            {isActive && (
              <path
                d={pathD}
                fill="none"
                stroke={kind === 'fk' ? 'url(#tl-flow-red)' : 'url(#tl-flow-flow)'}
                strokeWidth={3.5}
                strokeDasharray={`${Math.max(20, pathLen * 0.14)} ${pathLen}`}
                strokeDashoffset={pathLen}
                style={{ animation: `tlPkt${kind === 'fk' ? 'R' : 'B'} 1.8s linear infinite` }}
                opacity={0.85}
              />
            )}
          </g>
        );
      })}

      <style>{`
        @keyframes tlPktR { to { stroke-dashoffset: -3600px; } }
        @keyframes tlPktB { to { stroke-dashoffset: -3600px; } }
      `}</style>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   ZONE LABEL CHIP
════════════════════════════════════════════════════════════ */
function ZoneLabel({ text, color }: { text: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-1 rounded-full" style={{ background: color }} />
      <span className="font-mono text-[7.5px] font-bold uppercase tracking-[0.15em]"
        style={{ color: `${color}99` }}>
        {text}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MISSION HUD (right panel)
════════════════════════════════════════════════════════════ */
function MissionHUD() {
  const rows = [
    { icon: <HardDrive size={11} className="text-emerald-400/70" />, label: 'LOCAL DB', value: 'SQLite', sub: 'WAL mode', color: 'text-emerald-400', pulse: true, dot: 'bg-emerald-400', delay: 0 },
    { icon: <Cloud      size={11} className="text-blue-400/70"    />, label: 'CLOUD DB',  value: 'Supabase', sub: 'PostgreSQL 15', color: 'text-blue-400', pulse: true, dot: 'bg-blue-400', delay: 0.5 },
    { icon: <RefreshCw  size={11} className="text-[#FF3B3B]/70"   />, label: 'SYNC',      value: 'Bidir · LWW', sub: '30s cycle', color: 'text-[#FF3B3B]', pulse: true, dot: 'bg-[#FF3B3B]', delay: 1 },
    { icon: <Shield     size={11} className="text-amber-400/70"   />, label: 'CONFLICT',  value: 'LWW + Vector', sub: 'updated_at wins', color: 'text-amber-400', pulse: false, dot: 'bg-amber-400', delay: 0 },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <div className="h-1.5 w-1.5 rounded-full bg-[#FF3B3B]" />
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/65">
          System Status
        </span>
        <div className="ml-auto flex items-center gap-1">
          <motion.span className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
          <span className="font-mono text-[7.5px] text-emerald-400/75">LIVE</span>
        </div>
      </div>

      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.018]">
          <div className="relative shrink-0">
            {r.pulse && (
              <motion.span className={`absolute inset-0 rounded-full ${r.dot} opacity-35`}
                animate={{ scale: [1, 2, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: r.delay }} />
            )}
            {r.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/25">{r.label}</div>
            <div className={`font-mono text-[10px] font-bold ${r.color}`}>{r.value}</div>
          </div>
          <span className="shrink-0 font-mono text-[7px] text-white/22">{r.sub}</span>
        </div>
      ))}

      <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05]">
        {[
          { v: '10', l: 'TABLES',   c: 'text-white/65' },
          { v: '7',  l: 'FK LINKS', c: 'text-[#FF3B3B]/75' },
          { v: '3',  l: 'FLOWS',    c: 'text-amber-400/75' },
        ].map((s) => (
          <div key={s.l} className="flex flex-col items-center gap-0.5 py-2.5">
            <span className={`font-mono text-[13px] font-black ${s.c}`}>{s.v}</span>
            <span className="font-mono text-[6.5px] uppercase tracking-wider text-white/20">{s.l}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   FLOW INSPECTOR (right panel)
════════════════════════════════════════════════════════════ */
function FlowInspector({
  selectedNode,
  activeScenario,
  setActiveScenario,
}: {
  selectedNode:     NodeMeta | null;
  activeScenario:   string;
  setActiveScenario: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.32 }}
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <GitMerge size={11} className="text-white/35" strokeWidth={1.5} />
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/65">
          {selectedNode ? 'Inspector' : 'Data Flow'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {selectedNode ? (
          <motion.div key={`ins-${selectedNode.id}`}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
            className="space-y-3 p-4"
          >
            <div className="flex items-center gap-2">
              <Database size={11} className="text-white/35" />
              <span className="font-mono text-[11px] font-black text-white/90">{selectedNode.label}</span>
              <span className={`ml-auto rounded border px-1.5 py-px font-mono text-[6.5px] font-bold uppercase ${OWN[selectedNode.owner].badge}`}>
                {OWN[selectedNode.owner].label}
              </span>
            </div>

            <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-2.5 py-2">
              <span className="font-mono text-[8px] text-white/40">{selectedNode.cloudDesc}</span>
            </div>

            {[
              { label: 'Reads',   items: selectedNode.reads,  cls: 'border-emerald-400/18 bg-emerald-400/6 text-emerald-400/80' },
              { label: 'Writes',  items: selectedNode.writes, cls: 'border-[#FF3B3B]/18 bg-[#FF3B3B]/6 text-[#FF3B3B]/80' },
            ].map(({ label, items, cls }) => (
              <div key={label}>
                <div className="mb-1 font-mono text-[7px] uppercase tracking-[0.12em] text-white/25">{label}</div>
                <div className="flex flex-wrap gap-1">
                  {items.map((r) => (
                    <span key={r} className={`rounded border px-1.5 py-0.5 font-mono text-[7.5px] ${cls}`}>{r}</span>
                  ))}
                </div>
              </div>
            ))}

            {selectedNode.relatedTo.length > 0 && (
              <div>
                <div className="mb-1 font-mono text-[7px] uppercase tracking-[0.12em] text-white/25">Related Tables</div>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.relatedTo.map((r) => (
                    <span key={r} className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-0.5 font-mono text-[7.5px] text-white/45">{r}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="font-mono text-[7px] text-white/18 pt-0.5">Click canvas to dismiss</p>
          </motion.div>
        ) : (
          <motion.div key="flow"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
          >
            {/* Scenario tabs */}
            <div className="flex border-b border-white/[0.06]">
              {SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => setActiveScenario(s.id)}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-all font-mono text-[7px] uppercase tracking-[0.08em] ${
                    activeScenario === s.id ? 'text-white/85' : 'text-white/28 hover:text-white/50'
                  }`}
                  style={{ borderBottom: activeScenario === s.id ? `2px solid ${s.color}` : '2px solid transparent' }}
                >
                  <span style={{ color: activeScenario === s.id ? s.color : undefined }}>{s.icon}</span>
                  <span className="hidden sm:inline leading-none">{s.title}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {SCENARIOS.filter((s) => s.id === activeScenario).map((sc) => (
                <motion.div key={sc.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span style={{ color: sc.color }}>{sc.icon}</span>
                    <span className="font-mono text-[9.5px] font-bold text-white/80">{sc.title}</span>
                    <span className="ml-auto font-mono text-[7px] text-white/20">data path</span>
                  </div>
                  <div className="space-y-0.5">
                    {sc.steps.map((step, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.18 }}
                        className="flex items-center gap-2"
                      >
                        <div className="flex flex-col items-center">
                          <div className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border font-mono text-[7px] font-bold ${step.cls}`}>
                            {i + 1}
                          </div>
                          {i < sc.steps.length - 1 && <div className="h-2.5 w-px bg-white/8" />}
                        </div>
                        <div className="min-w-0 pb-0.5">
                          <div className={`font-mono text-[8.5px] font-bold ${step.cls.split(' ')[0]}`}>{step.label}</div>
                          <div className="font-mono text-[7px] text-white/25">{step.sub}</div>
                        </div>
                        {i < sc.steps.length - 1 && <ChevronRight size={8} className="ml-auto shrink-0 text-white/12" />}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   LEGEND
════════════════════════════════════════════════════════════ */
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {[
        { dot: '#34D399', label: 'LOCAL (SQLite)' },
        { dot: '#60A5FA', label: 'CLOUD (Supabase)' },
        { dot: '#FF3B3B', label: 'SYNC (Both)' },
      ].map((l) => (
        <div key={l.label} className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: l.dot }} />
          <span className="font-mono text-[8px] text-white/30">{l.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <Key size={8} className="text-amber-400/70" />
        <span className="font-mono text-[8px] text-white/30">PK</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Link2 size={8} className="text-[#FF3B3B]/55" />
        <span className="font-mono text-[8px] text-white/30">FK</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MOBILE CARD LIST
════════════════════════════════════════════════════════════ */
function MobileList({ selectedId, onSelect }: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const groups = [
    { label: 'Core Entity', ids: ['patients'] },
    { label: 'Related Tables', ids: ['alerts','devices','locations','reminders','emergency_contacts'] },
    { label: 'Local Storage', ids: ['wearable_metrics','sync_queue','ai_logs'] },
    { label: 'Cloud Only', ids: ['profile_validation'] },
  ];
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">{g.label}</div>
          <div className="space-y-1.5">
            {g.ids.map((id, i) => {
              const node = NODES[id];
              const own  = OWN[node.owner];
              const sel  = selectedId === id;
              return (
                <motion.div key={id}
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.04, duration: 0.28 }}
                  onClick={() => onSelect(sel ? null : id)}
                  className="cursor-pointer overflow-hidden rounded-xl border backdrop-blur-xl"
                  style={{
                    background:  'rgba(255,255,255,0.022)',
                    borderColor: sel ? own.border : 'rgba(255,255,255,0.07)',
                    boxShadow:   sel ? own.glowHi : own.glow,
                    transition:  'border-color 0.18s, box-shadow 0.18s',
                  }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: own.dot }} />
                    <span className="font-mono text-[10.5px] font-bold text-white/85">{node.label}</span>
                    <span className={`ml-auto rounded border px-1.5 py-0.5 font-mono text-[6.5px] font-bold uppercase ${own.badge}`}>
                      {own.short}
                    </span>
                  </div>
                  <AnimatePresence>
                    {sel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/[0.06] px-4 py-3 space-y-2"
                      >
                        <p className="font-mono text-[7.5px] text-white/30">{node.cloudDesc}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Reads',  items: node.reads,  cls: 'border-emerald-400/15 text-emerald-400/80' },
                            { label: 'Writes', items: node.writes, cls: 'border-[#FF3B3B]/15 text-[#FF3B3B]/80' },
                          ].map(({ label, items, cls }) => (
                            <div key={label}>
                              <div className="mb-1 font-mono text-[7px] uppercase text-white/22">{label}</div>
                              <div className="flex flex-col gap-0.5">
                                {items.map((r) => (
                                  <span key={r} className={`rounded border px-1.5 py-0.5 font-mono text-[7px] ${cls}`}>{r}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {node.columns.some((c) => c.fk) && (
                          <div>
                            <div className="mb-1 font-mono text-[7px] uppercase text-white/22">Foreign Keys</div>
                            {node.columns.filter((c) => c.fk).map((c) => (
                              <div key={c.name} className="font-mono text-[7.5px] text-white/35">
                                {c.name} → {c.fk!.table}.{c.fk!.col}
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   STRUCTURED TOPOLOGY GRID
   The core visual — a grid of nodes with zones
════════════════════════════════════════════════════════════ */
function TopologyGrid({
  hoveredId,
  selectedId,
  onNodeEnter,
  onNodeLeave,
  onNodeClick,
  containerRef,
  registerNode,
}: {
  hoveredId:   string | null;
  selectedId:  string | null;
  onNodeEnter: (id: string) => void;
  onNodeLeave: () => void;
  onNodeClick: (id: string, e: React.MouseEvent) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  registerNode: (id: string, el: HTMLDivElement | null) => void;
}) {
  const getState = (id: string) => {
    const active = hoveredId ?? selectedId;
    if (!active) return { hi: false, dim: false, sel: false };
    const relSet = new Set<string>();
    RELATIONS.forEach(({ from, to }) => {
      if (from === active) relSet.add(to);
      if (to   === active) relSet.add(from);
    });
    const isMain = id === active;
    const isRel  = relSet.has(id);
    return { hi: isMain || isRel, dim: !isMain && !isRel, sel: id === selectedId };
  };

  const nodeProps = (id: string, idx: number) => {
    const { hi, dim, sel } = getState(id);
    return {
      nodeId:        id,
      isHighlighted: hi,
      isDimmed:      dim,
      isSelected:    sel,
      onEnter:       () => onNodeEnter(id),
      onLeave:       onNodeLeave,
      onClick:       (e: React.MouseEvent) => onNodeClick(id, e),
      nodeRef:       (el: HTMLDivElement | null) => registerNode(id, el),
      index:         idx,
    };
  };

  return (
    <div ref={containerRef} className="relative w-full" onClick={(e) => {
      // Dismiss selection only if clicking the container directly
      if (e.target === e.currentTarget) { onNodeClick('', e); }
    }}>

      {/* ─── ZONE: INPUT SERVICES ─── */}
      <div className="relative mb-3 rounded-xl border border-white/[0.055]"
        style={{ background: 'rgba(255,255,255,0.012)' }}>
        <div className="absolute left-3 top-2">
          <ZoneLabel text="Input Services" color="#60A5FA" />
        </div>
        <div className="grid grid-cols-4 gap-3 px-3 pb-3 pt-7">
          {[
            { label: 'App Client',  icon: <MonitorSpeaker size={13} />, color: '#A78BFA' },
            { label: 'FastAPI',     icon: <Server size={13} />,         color: '#60A5FA' },
            { label: 'MQTT Broker', icon: <Activity size={13} />,       color: '#F59E0B' },
            { label: 'AI Engine',   icon: <Cpu size={13} />,            color: '#A78BFA' },
          ].map((s, i) => (
            <ServiceChip key={s.label} {...s} index={i} />
          ))}
        </div>
        {/* Flow arrow down */}
        <div className="flex justify-center pb-1">
          <div className="flex flex-col items-center gap-0.5">
            <ArrowDown size={12} className="text-white/20" />
          </div>
        </div>
      </div>

      {/* ─── ZONE: LOCAL DB FABRIC ─── */}
      <div className="relative rounded-xl border border-emerald-400/[0.12]"
        style={{ background: 'rgba(52,211,153,0.018)' }}>

        <div className="absolute left-3 top-2">
          <ZoneLabel text="Local Database Fabric" color="#34D399" />
        </div>

        {/* SQLite HUB — full width top row */}
        <div className="px-4 pb-3 pt-7">

          {/* Row A: SQLite hub — central and prominent */}
          <div className="mb-4 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="relative flex items-center gap-4 rounded-2xl border border-emerald-400/25 px-6 py-3.5 backdrop-blur-2xl"
              style={{
                background:  'rgba(52,211,153,0.06)',
                boxShadow:   '0 0 40px rgba(52,211,153,0.10)',
                minWidth:    '240px',
              }}
            >
              <div className="relative">
                <motion.div className="absolute inset-0 rounded-full bg-emerald-400/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity }} />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/18">
                  <HardDrive size={20} className="text-emerald-400" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <div className="font-mono text-[14px] font-black text-emerald-400">SQLite</div>
                <div className="font-mono text-[8px] text-white/35">WAL · FTS5 · JSON1 · in-process</div>
              </div>
              <div className="ml-6 space-y-1 border-l border-white/[0.07] pl-4">
                {['64MB cache', 'WAL mode', 'Offline-first', 'FK enforced'].map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="h-[3px] w-[3px] rounded-full bg-emerald-400/60" />
                    <span className="font-mono text-[7.5px] text-white/35">{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Row B: Entity hub — patients center + children */}
          {/*
            Layout:   devices | alerts | patients | reminders | locations
            Symmetric around patients (col index 2)
          */}
          <div className="grid grid-cols-5 gap-3">
            <NodeCard {...nodeProps('devices',   1)} />
            <NodeCard {...nodeProps('alerts',    2)} />
            <NodeCard {...nodeProps('patients',  0)} />
            <NodeCard {...nodeProps('reminders', 3)} />
            <NodeCard {...nodeProps('locations', 4)} />
          </div>

          {/* Row C: Secondary local tables */}
          <div className="mt-3 grid grid-cols-5 gap-3">
            <NodeCard {...nodeProps('wearable_metrics',    5)} />
            <NodeCard {...nodeProps('sync_queue',          6)} />
            <NodeCard {...nodeProps('emergency_contacts',  7)} />
            <NodeCard {...nodeProps('ai_logs',             8)} />
            {/* placeholder */}
            <div />
          </div>

        </div>

        {/* Sync bridge arrow */}
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.05] px-5 py-2">
          <span className="font-mono text-[7.5px] text-white/22">sync_queue → Sync Engine</span>
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown size={10} className="rotate-[-90deg] text-amber-400/50" />
          </motion.div>
        </div>
      </div>

      {/* ─── ZONE: CLOUD REPLICA ─── */}
      <div className="relative mt-3 rounded-xl border border-blue-400/[0.12]"
        style={{ background: 'rgba(30,58,138,0.05)' }}>
        <div className="absolute left-3 top-2">
          <ZoneLabel text="Cloud Replica Zone" color="#60A5FA" />
        </div>
        <div className="grid grid-cols-5 gap-3 px-4 pb-4 pt-7">
          {/* Sync engine + Supabase */}
          <div /> {/* spacer */}
          <SyncEngineNode nodeRef={(el) => registerNode('sync_engine', el)} />
          <div className="flex items-center justify-center">
            <motion.div animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>
              <ArrowDown size={14} className="rotate-[-90deg] text-blue-400/40" />
            </motion.div>
          </div>
          <div className="col-span-2">
            <CloudNode
              nodeRef={(el) => registerNode('supabase', el)}
              isHighlighted={false}
            />
          </div>
        </div>
        <div className="border-t border-white/[0.05] px-5 py-2">
          <div className="flex items-center gap-2">
            <NodeCard {...nodeProps('profile_validation', 9)} />
            <div className="flex-1 text-right">
              <span className="font-mono text-[7px] text-white/18">Cloud-only tables live here</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════════ */
export default function DatabaseMissionControl() {
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState('patient');
  const [nodeRects,      setNodeRects]      = useState<Map<string, DOMRect>>(new Map());
  const [containerRect,  setContainerRect]  = useState<DOMRect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null!);
  const nodeElsRef   = useRef<Map<string, HTMLDivElement>>(new Map());
  const svgWrapRef   = useRef<HTMLDivElement>(null);

  const registerNode = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeElsRef.current.set(id, el);
    else    nodeElsRef.current.delete(id);
  }, []);

  const measureAll = useCallback(() => {
    if (!svgWrapRef.current) return;
    setContainerRect(svgWrapRef.current.getBoundingClientRect());
    const map = new Map<string, DOMRect>();
    nodeElsRef.current.forEach((el, id) => map.set(id, el.getBoundingClientRect()));
    setNodeRects(map);
  }, []);

  useEffect(() => {
    const t = setTimeout(measureAll, 400);
    const obs = new ResizeObserver(measureAll);
    if (svgWrapRef.current) obs.observe(svgWrapRef.current);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [measureAll]);

  const selectedNode = selectedId ? NODES[selectedId] ?? null : null;

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) { setSelectedId(null); setHoveredId(null); return; }
    setSelectedId((prev) => (prev === id ? null : id));
    setHoveredId(null);
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Database Mission Control
          </h2>
          <p className="mt-0.5 font-mono text-[8.5px] text-white/18">
            Structured SQL infrastructure · ownership · sync topology · entity relationships
          </p>
        </div>
        <Legend />
      </div>

      {/* ── DESKTOP (lg+): topology left, HUD right ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_272px] lg:gap-4">
        {/* Topology wrapper with SVG overlay */}
        <div
          ref={svgWrapRef}
          className="relative overflow-hidden rounded-2xl border border-white/[0.07]"
          style={{ background: 'rgba(0,1,9,0.65)' }}
          onClick={() => { setSelectedId(null); setHoveredId(null); }}
        >
          {/* Dot grid */}
          <div className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.032) 1px, transparent 1px)',
              backgroundSize:  '26px 26px',
            }} />
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/4 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-blue-500/4 blur-[80px]" />
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-[#FF3B3B]/3 blur-[70px]" />

          {/* SVG line overlay */}
          <TopologyLines
            nodeRects={nodeRects}
            containerRect={containerRect}
            hoveredId={hoveredId}
          />

          {/* Grid content */}
          <div className="relative z-10 p-4">
            <TopologyGrid
              hoveredId={hoveredId}
              selectedId={selectedId}
              onNodeEnter={setHoveredId}
              onNodeLeave={() => setHoveredId(null)}
              onNodeClick={handleNodeClick}
              containerRef={containerRef}
              registerNode={registerNode}
            />
          </div>

          {/* Bottom hint */}
          <div className="absolute bottom-3 right-4 font-mono text-[7.5px] text-white/15">
            Hover to trace · Click to inspect
          </div>
        </div>

        {/* Right: HUD + Inspector */}
        <div className="flex flex-col gap-3">
          <MissionHUD />
          <FlowInspector
            selectedNode={selectedNode}
            activeScenario={activeScenario}
            setActiveScenario={setActiveScenario}
          />
        </div>
      </div>

      {/* ── TABLET (md–lg): topology above, HUD+Inspector below ── */}
      <div className="hidden md:block lg:hidden space-y-4">
        <div
          ref={svgWrapRef}
          className="relative overflow-hidden rounded-2xl border border-white/[0.07]"
          style={{ background: 'rgba(0,1,9,0.65)' }}
          onClick={() => { setSelectedId(null); setHoveredId(null); }}
        >
          <div className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.028) 1px, transparent 1px)',
              backgroundSize:  '24px 24px',
            }} />
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/4 blur-[70px]" />
          <TopologyLines nodeRects={nodeRects} containerRect={containerRect} hoveredId={hoveredId} />
          <div className="relative z-10 p-4">
            <TopologyGrid
              hoveredId={hoveredId} selectedId={selectedId}
              onNodeEnter={setHoveredId} onNodeLeave={() => setHoveredId(null)}
              onNodeClick={handleNodeClick}
              containerRef={containerRef} registerNode={registerNode}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MissionHUD />
          <FlowInspector selectedNode={selectedNode} activeScenario={activeScenario} setActiveScenario={setActiveScenario} />
        </div>
      </div>

      {/* ── MOBILE (<md): stacked ── */}
      <div className="block md:hidden space-y-4">
        <MissionHUD />
        <FlowInspector selectedNode={selectedNode} activeScenario={activeScenario} setActiveScenario={setActiveScenario} />
        <div>
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">
            SQL Tables · Tap to Inspect
          </div>
          <MobileList selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

    </div>
  );
}
