'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Database, Key, Link2, HardDrive, Cloud, RefreshCw, ArrowRight } from 'lucide-react';

/* ─────────────────────────────────────────────
   SCHEMA DATA
───────────────────────────────────────────── */
type ColumnDef = {
  name: string;
  type: string;
  pk?: boolean;
  fk?: { table: string; col: string };
  nullable?: boolean;
};

type TableDef = {
  id: string;
  label: string;
  owner: 'local' | 'cloud' | 'both';
  columns: ColumnDef[];
  gridPos: { col: number; row: number }; // for layout grid (desktop)
};

const TABLES: TableDef[] = [
  {
    id: 'patients',
    label: 'patients',
    owner: 'both',
    gridPos: { col: 2, row: 0 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'name',       type: 'TEXT' },
      { name: 'age',        type: 'INTEGER',   nullable: true },
      { name: 'gender',     type: 'TEXT',      nullable: true },
      { name: 'blood_type', type: 'TEXT',      nullable: true },
      { name: 'conditions', type: 'JSON',      nullable: true },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    id: 'alerts',
    label: 'alerts',
    owner: 'both',
    gridPos: { col: 0, row: 1 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'patient_id', type: 'UUID',      fk: { table: 'patients', col: 'id' } },
      { name: 'type',       type: 'TEXT' },
      { name: 'severity',   type: 'TEXT' },
      { name: 'source',     type: 'TEXT',      nullable: true },
      { name: 'status',     type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    id: 'devices',
    label: 'devices',
    owner: 'both',
    gridPos: { col: 1, row: 1 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'patient_id', type: 'UUID',      fk: { table: 'patients', col: 'id' } },
      { name: 'name',       type: 'TEXT' },
      { name: 'type',       type: 'TEXT' },
      { name: 'mac_addr',   type: 'TEXT',      nullable: true },
      { name: 'last_seen',  type: 'TIMESTAMP', nullable: true },
    ],
  },
  {
    id: 'locations',
    label: 'locations',
    owner: 'both',
    gridPos: { col: 3, row: 1 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'patient_id', type: 'UUID',      fk: { table: 'patients', col: 'id' } },
      { name: 'lat',        type: 'REAL' },
      { name: 'lng',        type: 'REAL' },
      { name: 'accuracy',   type: 'REAL',      nullable: true },
      { name: 'recorded_at','type': 'TIMESTAMP' },
    ],
  },
  {
    id: 'reminders',
    label: 'reminders',
    owner: 'both',
    gridPos: { col: 4, row: 1 },
    columns: [
      { name: 'id',           type: 'UUID',      pk: true },
      { name: 'patient_id',   type: 'UUID',      fk: { table: 'patients', col: 'id' } },
      { name: 'type',         type: 'TEXT' },
      { name: 'scheduled_at', type: 'TIMESTAMP' },
      { name: 'done',         type: 'BOOLEAN' },
    ],
  },
  {
    id: 'emergency_contacts',
    label: 'emergency_contacts',
    owner: 'both',
    gridPos: { col: 2, row: 2 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'patient_id', type: 'UUID',      fk: { table: 'patients', col: 'id' } },
      { name: 'name',       type: 'TEXT' },
      { name: 'phone',      type: 'TEXT' },
      { name: 'relation',   type: 'TEXT',      nullable: true },
    ],
  },
  {
    id: 'patient_profile_validation',
    label: 'patient_profile_validation',
    owner: 'cloud',
    gridPos: { col: 0, row: 2 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'user_id',    type: 'UUID',      fk: { table: 'auth.users', col: 'id' } },
      { name: 'field',      type: 'TEXT' },
      { name: 'valid',      type: 'BOOLEAN' },
      { name: 'checked_at', type: 'TIMESTAMP' },
    ],
  },
  {
    id: 'wearable_metrics',
    label: 'wearable_metrics',
    owner: 'local',
    gridPos: { col: 1, row: 2 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'patient_id', type: 'UUID',      fk: { table: 'patients', col: 'id' } },
      { name: 'bpm',        type: 'INTEGER',   nullable: true },
      { name: 'spo2',       type: 'REAL',      nullable: true },
      { name: 'steps',      type: 'INTEGER',   nullable: true },
      { name: 'ts',         type: 'TIMESTAMP' },
    ],
  },
  {
    id: 'ai_logs',
    label: 'ai_logs',
    owner: 'local',
    gridPos: { col: 3, row: 2 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'model',      type: 'TEXT' },
      { name: 'input',      type: 'TEXT',      nullable: true },
      { name: 'output',     type: 'TEXT',      nullable: true },
      { name: 'latency_ms', type: 'INTEGER',   nullable: true },
      { name: 'ts',         type: 'TIMESTAMP' },
    ],
  },
  {
    id: 'sync_queue',
    label: 'sync_queue',
    owner: 'local',
    gridPos: { col: 4, row: 2 },
    columns: [
      { name: 'id',         type: 'UUID',      pk: true },
      { name: 'table_name', type: 'TEXT' },
      { name: 'operation',  type: 'TEXT' },
      { name: 'row_id',     type: 'TEXT' },
      { name: 'payload',    type: 'JSON' },
      { name: 'status',     type: 'TEXT' },
      { name: 'retries',    type: 'INTEGER' },
    ],
  },
];

// Which table pairs are related
type Relation = { from: string; to: string };
const RELATIONS: Relation[] = [
  { from: 'alerts',                     to: 'patients' },
  { from: 'devices',                    to: 'patients' },
  { from: 'locations',                  to: 'patients' },
  { from: 'reminders',                  to: 'patients' },
  { from: 'emergency_contacts',         to: 'patients' },
  { from: 'patient_profile_validation', to: 'patients' },
  { from: 'wearable_metrics',           to: 'patients' },
];

/* ─────────────────────────────────────────────
   OWNERSHIP CONFIG
───────────────────────────────────────────── */
const OWNER_CFG = {
  local: { label: 'SQLite',   color: '#34D399', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', text: 'text-emerald-400' },
  cloud: { label: 'Supabase', color: '#60A5FA', bg: 'bg-blue-400/10',    border: 'border-blue-400/20',   text: 'text-blue-400'    },
  both:  { label: 'Both',     color: '#FF3B3B', bg: 'bg-[#FF3B3B]/10',   border: 'border-[#FF3B3B]/20',  text: 'text-[#FF3B3B]'   },
};

/* ─────────────────────────────────────────────
   CONNECTED TABLES UTILITY
───────────────────────────────────────────── */
function getConnectedIds(tableId: string): Set<string> {
  const connected = new Set<string>();
  RELATIONS.forEach(({ from, to }) => {
    if (from === tableId) connected.add(to);
    if (to   === tableId) connected.add(from);
  });
  return connected;
}

/* ─────────────────────────────────────────────
   TABLE NODE CARD
───────────────────────────────────────────── */
function TableNode({
  table,
  isHighlighted,
  isDimmed,
  onHover,
  onLeave,
  nodeRef,
  index,
}: {
  table: TableDef;
  isHighlighted: boolean;
  isDimmed: boolean;
  onHover: () => void;
  onLeave: () => void;
  nodeRef: (el: HTMLDivElement | null) => void;
  index: number;
}) {
  const owner = OWNER_CFG[table.owner];

  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      animate={{
        opacity: isDimmed ? 0.18 : 1,
        filter: isDimmed ? 'blur(0.5px)' : 'blur(0px)',
        scale: isHighlighted ? 1.02 : 1,
        zIndex: isHighlighted ? 20 : 1,
      }}
      className={[
        'relative overflow-hidden rounded-[18px] border transition-all duration-300 cursor-default',
        'backdrop-blur-2xl bg-white/[0.03]',
        isHighlighted
          ? 'border-[#FF3B3B]/35 shadow-[0_0_40px_rgba(255,59,59,0.12),0_0_0_1px_rgba(255,59,59,0.1)] bg-white/[0.055]'
          : 'border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.045]',
      ].join(' ')}
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {/* Red glow on highlight */}
      {isHighlighted && (
        <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[#FF3B3B]/[0.04]" />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${owner.bg} ${owner.border} border`}>
            <Database size={10} className={owner.text} strokeWidth={2} />
          </div>
          <span className={`font-mono text-[10px] font-bold tracking-wide text-white/90 ${
            table.label.length > 20 ? 'text-[9px]' : 'text-[10px]'
          }`}>
            {table.label}
          </span>
        </div>
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider ${owner.bg} ${owner.border} ${owner.text}`}>
          {owner.label}
        </span>
      </div>

      {/* Columns */}
      <div className="space-y-0.5 px-3.5 py-2.5">
        {table.columns.map((col) => (
          <div key={col.name} className="flex items-center gap-1.5">
            {col.pk && (
              <Key size={8} className="shrink-0 text-amber-400/80" strokeWidth={2.5} />
            )}
            {col.fk && !col.pk && (
              <Link2 size={8} className="shrink-0 text-[#FF3B3B]/60" strokeWidth={2.5} />
            )}
            {!col.pk && !col.fk && (
              <div className="h-1 w-1 shrink-0 rounded-full bg-white/15" />
            )}
            <span className={`font-mono text-[9.5px] ${
              col.pk ? 'text-amber-400/90 font-semibold'
              : col.fk ? 'text-[#FF3B3B]/70'
              : 'text-white/50'
            }`}>
              {col.name}
            </span>
            <span className="ml-auto font-mono text-[8px] text-white/20">
              {col.type}
            </span>
          </div>
        ))}
      </div>

      {/* FK references listed at bottom */}
      {table.columns.some((c) => c.fk) && (
        <div className="border-t border-white/[0.05] px-3.5 py-2">
          {table.columns
            .filter((c) => c.fk)
            .map((c) => (
              <div key={c.name} className="flex items-center gap-1">
                <ArrowRight size={7} className="text-[#FF3B3B]/50" />
                <span className="font-mono text-[8px] text-white/30">
                  {c.name} → {c.fk!.table}.{c.fk!.col}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Bottom animated bar on hover/highlight */}
      <div
        className={`absolute bottom-0 left-0 h-[1.5px] transition-all duration-500 ${
          isHighlighted ? 'w-full bg-[#FF3B3B]/60' : 'w-0 bg-[#FF3B3B]/40 group-hover:w-full'
        }`}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   ANIMATED SVG CONNECTOR LINES
───────────────────────────────────────────── */
type NodeRect = { id: string; rect: DOMRect };

function ConnectionLines({
  nodeRects,
  containerRect,
  hoveredId,
}: {
  nodeRects: NodeRect[];
  containerRect: DOMRect | null;
  hoveredId: string | null;
}) {
  if (!containerRect || nodeRects.length === 0) return null;

  const getCenter = (id: string): { x: number; y: number } | null => {
    const nr = nodeRects.find((n) => n.id === id);
    if (!nr) return null;
    return {
      x: nr.rect.left - containerRect.left + nr.rect.width / 2,
      y: nr.rect.top  - containerRect.top  + nr.rect.height / 2,
    };
  };

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <marker id="arrowActive" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,59,59,0.55)" />
        </marker>
        <marker id="arrowDim" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.08)" />
        </marker>
        {/* Animated gradient for active lines */}
        <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#FF3B3B" stopOpacity="0.0" />
          <stop offset="40%"  stopColor="#FF3B3B" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FF3B3B" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {RELATIONS.map(({ from, to }) => {
        const a = getCenter(from);
        const b = getCenter(to);
        if (!a || !b) return null;

        const isActive =
          hoveredId !== null && (hoveredId === from || hoveredId === to);
        const isDimmed =
          hoveredId !== null && !isActive;

        // Cubic bezier midpoint
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const cx1 = a.x + dx * 0.5;
        const cy1 = a.y;
        const cx2 = a.x + dx * 0.5;
        const cy2 = b.y;
        const d = `M${a.x},${a.y} C${cx1},${cy1} ${cx2},${cy2} ${b.x},${b.y}`;
        const pathLen = Math.sqrt(dx * dx + dy * dy) * 1.2; // approx

        return (
          <g key={`${from}-${to}`}>
            {/* Base path */}
            <path
              d={d}
              fill="none"
              stroke={isActive ? 'rgba(255,59,59,0.45)' : 'rgba(255,255,255,0.07)'}
              strokeWidth={isActive ? 1.5 : 1}
              markerEnd={isActive ? 'url(#arrowActive)' : 'url(#arrowDim)'}
              style={{
                transition: 'stroke 0.25s ease, stroke-width 0.25s ease, opacity 0.25s ease',
                opacity: isDimmed ? 0.15 : 1,
                filter: isActive ? 'drop-shadow(0 0 4px rgba(255,59,59,0.4))' : 'none',
              }}
            />

            {/* Animated flow particle on active */}
            {isActive && (
              <path
                d={d}
                fill="none"
                stroke="url(#flowGrad)"
                strokeWidth={3}
                strokeDasharray={`${pathLen * 0.25} ${pathLen}`}
                opacity={0.8}
                style={{
                  strokeDashoffset: pathLen,
                  animation: 'dashFlow 1.8s linear infinite',
                }}
              />
            )}
          </g>
        );
      })}

      <style>{`
        @keyframes dashFlow {
          to { stroke-dash-offset: -${500}px; }
        }
      `}</style>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   OWNERSHIP HUD
───────────────────────────────────────────── */
function OwnershipHUD() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="absolute right-4 top-4 z-30 overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.04] backdrop-blur-2xl"
    >
      <div className="border-b border-white/[0.07] px-3 py-2">
        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-white/30">
          Data Ownership
        </span>
      </div>
      <div className="space-y-2 p-3">
        {/* SQLite */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400/30" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <HardDrive size={9} className="text-white/30" />
          <span className="font-mono text-[9px] text-white/55">LOCAL</span>
          <span className="ml-auto font-mono text-[9px] font-bold text-emerald-400">SQLite</span>
        </div>
        {/* Supabase */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-blue-400/30" style={{ animationDelay: '0.4s' }} />
            <span className="relative h-1.5 w-1.5 rounded-full bg-blue-400" />
          </div>
          <Cloud size={9} className="text-white/30" />
          <span className="font-mono text-[9px] text-white/55">CLOUD</span>
          <span className="ml-auto font-mono text-[9px] font-bold text-blue-400">Supabase</span>
        </div>
        {/* Sync */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-[#FF3B3B]/30" style={{ animationDelay: '0.8s' }} />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#FF3B3B]" />
          </div>
          <RefreshCw size={9} className="text-white/30" />
          <span className="font-mono text-[9px] text-white/55">SYNC</span>
          <span className="ml-auto font-mono text-[9px] font-bold text-[#FF3B3B]/80">Bidir</span>
        </div>
        {/* Divider */}
        <div className="border-t border-white/[0.07] pt-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] text-white/25">TABLES</span>
            <span className="font-mono text-[11px] font-black text-white/70">10</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] text-white/25">RELATIONS</span>
            <span className="font-mono text-[11px] font-black text-[#FF3B3B]/70">{RELATIONS.length}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   LEGEND ROW
───────────────────────────────────────────── */
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-1.5">
        <Key size={10} className="text-amber-400/80" />
        <span className="font-mono text-[9px] text-white/35">Primary Key</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Link2 size={10} className="text-[#FF3B3B]/60" />
        <span className="font-mono text-[9px] text-white/35">Foreign Key</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-[1.5px] w-8 bg-[#FF3B3B]/50" />
        <span className="font-mono text-[9px] text-white/35">Relationship</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[7px] text-emerald-400">SQLite</span>
        <span className="font-mono text-[9px] text-white/35">Local-only</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded border border-blue-400/20 bg-blue-400/10 px-1.5 py-0.5 font-mono text-[7px] text-blue-400">Supabase</span>
        <span className="font-mono text-[9px] text-white/35">Cloud-only</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded border border-[#FF3B3B]/20 bg-[#FF3B3B]/10 px-1.5 py-0.5 font-mono text-[7px] text-[#FF3B3B]">Both</span>
        <span className="font-mono text-[9px] text-white/35">Bidirectional sync</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GRID LAYOUT HELPERS
───────────────────────────────────────────── */
const COLS = 5;
const ROWS = 3;

// Build a grid positional map: col/row → table
function buildGridMap(): Map<string, TableDef> {
  const map = new Map<string, TableDef>();
  TABLES.forEach((t) => {
    map.set(`${t.gridPos.col}-${t.gridPos.row}`, t);
  });
  return map;
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function DatabaseDiagram() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [nodeRects, setNodeRects] = useState<NodeRect[]>([]);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerNode = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) nodeEls.current.set(id, el);
    else     nodeEls.current.delete(id);
  }, []);

  const measureRects = useCallback(() => {
    if (!containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    setContainerRect(cRect);
    const rects: NodeRect[] = [];
    nodeEls.current.forEach((el, id) => {
      rects.push({ id, rect: el.getBoundingClientRect() });
    });
    setNodeRects(rects);
  }, []);

  useEffect(() => {
    // Measure after layout + a short delay for animations to start
    const t = setTimeout(measureRects, 600);
    return () => clearTimeout(t);
  }, [measureRects]);

  useEffect(() => {
    const obs = new ResizeObserver(measureRects);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [measureRects]);

  const gridMap = buildGridMap();

  const connectedIds = hoveredId ? getConnectedIds(hoveredId) : new Set<string>();

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Database Relationship Diagram · ERD Topology
          </h2>
          <p className="mt-1 font-mono text-[9px] text-white/18">
            Hover a table to highlight its relationships · {TABLES.length} tables · {RELATIONS.length} foreign-key relationships
          </p>
        </div>
        <Legend />
      </div>

      {/* Main topology panel */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015]">
        {/* Background grid dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#FF3B3B]/4 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-blue-500/4 blur-[80px]" />

        {/* HUD */}
        <OwnershipHUD />

        {/* ── DESKTOP TOPOLOGY GRID ── */}
        <div
          ref={containerRef}
          className="relative hidden p-6 pt-14 md:block"
          style={{ minHeight: '680px' }}
        >
          {/* Connection SVG overlay */}
          <ConnectionLines
            nodeRects={nodeRects}
            containerRect={containerRect}
            hoveredId={hoveredId}
          />

          {/* Grid of nodes */}
          <div
            className="relative grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${ROWS}, auto)`,
            }}
          >
            {Array.from({ length: ROWS }, (_, row) =>
              Array.from({ length: COLS }, (_, col) => {
                const table = gridMap.get(`${col}-${row}`);
                if (!table) {
                  // Empty cell placeholder
                  return (
                    <div
                      key={`empty-${col}-${row}`}
                      style={{ gridColumn: col + 1, gridRow: row + 1 }}
                    />
                  );
                }
                const isHighlighted =
                  hoveredId === table.id || connectedIds.has(table.id);
                const isDimmed =
                  hoveredId !== null && !isHighlighted;

                return (
                  <div
                    key={table.id}
                    style={{ gridColumn: col + 1, gridRow: row + 1 }}
                  >
                    <TableNode
                      table={table}
                      isHighlighted={isHighlighted}
                      isDimmed={isDimmed}
                      onHover={() => setHoveredId(table.id)}
                      onLeave={() => setHoveredId(null)}
                      nodeRef={registerNode(table.id)}
                      index={row * COLS + col}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── MOBILE VERTICAL STACK ── */}
        <div className="block p-4 md:hidden">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TABLES.map((table, i) => {
              const isHighlighted =
                hoveredId === table.id || connectedIds.has(table.id);
              const isDimmed =
                hoveredId !== null && !isHighlighted;

              return (
                <TableNode
                  key={table.id}
                  table={table}
                  isHighlighted={isHighlighted}
                  isDimmed={isDimmed}
                  onHover={() => setHoveredId(table.id)}
                  onLeave={() => setHoveredId(null)}
                  nodeRef={registerNode(table.id)}
                  index={i}
                />
              );
            })}
          </div>
          {/* Mobile relationship list */}
          <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <div className="border-b border-white/[0.06] px-4 py-2.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">
                Foreign Key Relationships
              </span>
            </div>
            <div className="divide-y divide-white/[0.04] px-4">
              {RELATIONS.map(({ from, to }) => (
                <div key={`${from}-${to}`} className="flex items-center gap-2 py-2">
                  <span className="font-mono text-[9px] text-[#FF3B3B]/70">{from}</span>
                  <ArrowRight size={10} className="shrink-0 text-white/20" />
                  <span className="font-mono text-[9px] text-white/50">{to}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
