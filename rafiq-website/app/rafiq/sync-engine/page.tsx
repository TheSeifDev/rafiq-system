'use client';

import { RefreshCw, Upload, Download, AlertTriangle, CheckCircle, Clock, Server } from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';
import { useSyncQueue } from '@/src/features/rafiq/realtime/hooks';

const TABLE_SYNC = [
  { table: 'emergency_states', direction: '↑↓', priority: '1 — Critical', strategy: 'Vector Clock', interval: 'Immediate' },
  { table: 'alerts',           direction: '↑↓', priority: '2 — Critical', strategy: 'Vector Clock', interval: 'Immediate' },
  { table: 'patients',         direction: '↑↓', priority: '3 — High',     strategy: 'LWW',         interval: '30 seconds' },
  { table: 'reminders',        direction: '↑↓', priority: '4 — High',     strategy: 'LWW',         interval: '30 seconds' },
  { table: 'ai_memory',        direction: '↑↓', priority: '5 — High',     strategy: 'LWW',         interval: '30 seconds' },
  { table: 'automation_rules', direction: '↑↓', priority: '6 — High',     strategy: 'LWW',         interval: '30 seconds' },
  { table: 'wearable_metrics', direction: '↑',  priority: '7 — Medium',   strategy: 'Append-only', interval: '30 seconds' },
  { table: 'ai_logs',          direction: '↑',  priority: '8 — Medium',   strategy: 'Append-only', interval: '30 seconds' },
  { table: 'device_status',    direction: '↑',  priority: '9 — Medium',   strategy: 'LWW',         interval: '30 seconds' },
  { table: 'sync_queue',       direction: '—',  priority: '— System',     strategy: 'Local-only',  interval: 'N/A'        },
];

const PUSH_CYCLE = `# Sync engine push cycle (Python)
async def push_cycle():
    # 1. Read pending items from sync_queue, ordered by priority
    items = await db.fetch_all("""
        SELECT sq.*, pt.priority_rank
        FROM sync_queue sq
        JOIN table_priorities pt ON sq.table_name = pt.table_name
        WHERE sq.status = 'pending' AND sq.retries < 5
        ORDER BY pt.priority_rank ASC, sq.created_at ASC
        LIMIT 50
    """)
    
    if not items:
        return  # Nothing to push
    
    # 2. Batch by table for efficient upsert
    for table_name, batch in groupby(items, key=lambda x: x['table_name']):
        rows = [json.loads(item['payload']) for item in batch]
        
        try:
            # 3. Upsert to Supabase
            await supabase.table(table_name).upsert(rows).execute()
            
            # 4. Mark as done
            ids = [item['id'] for item in batch]
            await db.execute("UPDATE sync_queue SET status='done' WHERE id = ANY(?)", ids)
            
        except Exception as e:
            # 5. Exponential backoff on failure
            for item in batch:
                backoff = min(30 * (2 ** item['retries']), 300)
                await db.execute(
                    "UPDATE sync_queue SET status='pending', retries=retries+1 WHERE id=?",
                    item['id']
                )
            logger.warning(f"Sync push failed for {table_name}: {e}")`;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-400/12 text-amber-400/80 border-amber-400/20',
  syncing: 'bg-blue-400/12 text-blue-400/80 border-blue-400/20',
  done:    'bg-emerald-400/12 text-emerald-400/80 border-emerald-400/20',
  failed:  'bg-[#FF3B3B]/12 text-[#FF3B3B]/80 border-[#FF3B3B]/20',
};

export default function SyncEnginePage() {
  const syncQueue = useSyncQueue(1400);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        <SectionHeader
          eyebrow="Sync Layer"
          title="Sync Engine"
          description="Bidirectional synchronization between the local SQLite database and Supabase cloud. Operates as a background service with priority-ordered push, Realtime subscription pull, exponential-backoff retry, and conflict resolution."
          status="syncing"
          layer="Sync Layer"
          version="v2.0"
          metrics={[
            { label: 'Interval', value: '30s' },
            { label: 'Max Retries', value: '5' },
            { label: 'Strategy', value: 'LWW + VC' },
          ]}
        />

        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Upload size={15} strokeWidth={1.5} />, title: 'Push Engine', sublabel: 'Local → Supabase', description: 'Reads sync_queue and batch-upserts to Supabase in priority order. Up to 50 items per cycle.', status: 'syncing' as const, accent: 'red' as const },
            { icon: <Download size={15} strokeWidth={1.5} />, title: 'Pull Subscriber', sublabel: 'Supabase Realtime → Local', description: 'Subscribes to Supabase Realtime events for bidirectional tables. Applies remote changes to local SQLite on receive.', status: 'online' as const, accent: 'blue' as const },
            { icon: <RefreshCw size={15} strokeWidth={1.5} />, title: 'Retry Queue', sublabel: 'Exponential backoff', description: 'Failed items retry at 30s, 60s, 120s, 300s. After 5 retries: dead-letter to error log for manual inspection.', status: 'online' as const, accent: 'red' as const },
            { icon: <Server size={15} strokeWidth={1.5} />, title: 'Priority Scheduler', sublabel: 'Critical → Low ordering', description: 'Emergency states and alerts always pushed first. Wearable metrics and AI logs go last. Configurable priority table.', status: 'online' as const, accent: 'blue' as const },
          ].map((card, i) => <ArchCard key={card.title} {...card} delay={i * 0.05} />)}
        </div>

        
        <InfraPanel title="Sync State Machine" subtitle="Online ↔ Offline lifecycle" glow="red">
          <div className="overflow-x-auto p-5">
            <div className="flex min-w-max items-center gap-1">
              {[
                { label: 'ONLINE',      color: 'text-emerald-400 border-emerald-400/25' },
                { label: '→', arrow: true },
                { label: 'SYNCING',     color: 'text-blue-400 border-blue-400/25' },
                { label: '→', arrow: true },
                { label: 'NET FAIL',    color: 'text-amber-400 border-amber-400/25' },
                { label: '→', arrow: true },
                { label: 'QUEUED',      color: 'text-amber-400 border-amber-400/25' },
                { label: '→', arrow: true },
                { label: 'RECONNECT',   color: 'text-blue-400 border-blue-400/25' },
                { label: '→', arrow: true },
                { label: 'DRAINING',    color: 'text-[#FF3B3B] border-[#FF3B3B]/25' },
                { label: '→', arrow: true },
                { label: 'ONLINE',      color: 'text-emerald-400 border-emerald-400/25' },
              ].map((s, i) => (
                <div key={i} className={s.arrow ? 'font-mono text-white/25 px-1' : `rounded-xl border px-3 py-2 font-mono text-[10px] font-bold ${s.color}`}>
                  {s.arrow ? '→' : s.label}
                </div>
              ))}
            </div>
          </div>
        </InfraPanel>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Table Sync Configuration</h2>
          <DataTable
            columns={[
              { key: 'table', label: 'Table', className: 'min-w-[160px]' },
              { key: 'direction', label: 'Direction', align: 'center' },
              { key: 'priority', label: 'Priority' },
              { key: 'strategy', label: 'Conflict Strategy' },
              { key: 'interval', label: 'Sync Interval' },
            ]}
            data={TABLE_SYNC}
            subtitle="Priority 1 = first to sync after reconnect"
          />
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Push Cycle Implementation</h2>
          <CodeBlock code={PUSH_CYCLE} language="python" title="sync/push_engine.py" />
        </div>

        
        <InfraPanel title="Live Sync Queue" subtitle="Real-time queue state" glow="blue">
          <div className="p-5">
            <div className="space-y-2">
              {syncQueue.slice(-10).reverse().map(entry => (
                <div key={entry.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.04] px-3 py-2">
                  <span className="font-mono text-[10px] text-white/55 min-w-[140px]">{entry.table}</span>
                  <span className="font-mono text-[9px] text-white/28">{entry.operation}</span>
                  <span className="font-mono text-[9px] text-white/22">{entry.size}B</span>
                  <span className="font-mono text-[9px] text-white/22">retry {entry.retries}</span>
                  <span className={`rounded border px-1.5 py-px font-mono text-[8px] font-bold uppercase ${STATUS_BADGE[entry.status]}`}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </InfraPanel>

      </div>
    </div>
  );
}
