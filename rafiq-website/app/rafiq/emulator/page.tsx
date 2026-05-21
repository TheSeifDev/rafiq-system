'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Play, Pause, RotateCcw, Zap, AlertTriangle,
  WifiOff, Brain, Activity, RefreshCw, Heart, Wind,
} from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import EventLog from '@/src/features/rafiq/shared/components/EventLog';
import StatusPulse from '@/src/features/rafiq/shared/components/StatusPulse';
import {
  useLogStream,
  useMQTTStream,
  useWearableStream,
  useSyncQueue,
  useSystemMetrics,
} from '@/src/features/rafiq/realtime/hooks';
import type { SystemStatus } from '@/src/features/rafiq/shared/types';

type Scenario = 'normal' | 'emergency' | 'cloud-disconnect' | 'ai-failover';

const SCENARIOS: { id: Scenario; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  { id: 'normal',           label: 'Normal Operation',    icon: <Activity size={12} />,    color: 'text-emerald-400 border-emerald-400/25 bg-emerald-400/8',  description: 'All systems nominal'       },
  { id: 'emergency',        label: 'Gas Leak Emergency',  icon: <AlertTriangle size={12} />, color: 'text-[#FF3B3B] border-[#FF3B3B]/35 bg-[#FF3B3B]/10',       description: 'RAQEEB alert active'      },
  { id: 'cloud-disconnect', label: 'Cloud Disconnect',    icon: <WifiOff size={12} />,      color: 'text-amber-400 border-amber-400/25 bg-amber-400/8',         description: 'Offline queue mode'       },
  { id: 'ai-failover',      label: 'AI Failover',         icon: <Brain size={12} />,        color: 'text-blue-400 border-blue-400/25 bg-blue-400/8',            description: 'Rules engine active'      },
];

function MetricCard({ label, value, unit, status = 'online' }: { label: string; value: string | number; unit?: string; status?: SystemStatus }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/25">{label}</span>
        <StatusPulse status={status} size="xs" />
      </div>
      <div className="flex items-end gap-1">
        <motion.span
          key={String(value)}
          initial={{ opacity: 0.5, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-2xl font-black text-white"
        >
          {value}
        </motion.span>
        {unit && <span className="mb-0.5 font-mono text-[10px] text-white/30">{unit}</span>}
      </div>
    </div>
  );
}

const TOPIC_COLOR: Record<string, string> = {
  'rafiq/wearable': 'text-blue-400/70',
  'rafiq/sensor':   'text-amber-400/70',
  'rafiq/emergency':'text-[#FF3B3B]/80',
  'rafiq/home':     'text-emerald-400/70',
  'rafiq/ai':       'text-purple-400/70',
  'rafiq/sync':     'text-white/40',
};

function getTopicColor(topic: string) {
  for (const [prefix, color] of Object.entries(TOPIC_COLOR)) {
    if (topic.startsWith(prefix)) return color;
  }
  return 'text-white/40';
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-400/12 text-amber-400/80 border-amber-400/20',
  syncing: 'bg-blue-400/12 text-blue-400/80 border-blue-400/20',
  done:    'bg-emerald-400/12 text-emerald-400/80 border-emerald-400/20',
  failed:  'bg-[#FF3B3B]/12 text-[#FF3B3B]/80 border-[#FF3B3B]/20',
};

export default function EmulatorPage() {
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [paused, setPaused] = useState(false);

  const logs    = useLogStream(paused ? 99999 : 850);
  const mqtt    = useMQTTStream(paused ? 99999 : 650);
  const wearable = useWearableStream(paused ? 99999 : 2000);
  const syncQueue = useSyncQueue(paused ? 99999 : 1200);
  const sysMetrics = useSystemMetrics(paused ? 99999 : 2200);

  const scenarioCfg = SCENARIOS.find(s => s.id === scenario)!;
  const sysStatus: SystemStatus = scenario === 'emergency' ? 'active' : scenario === 'cloud-disconnect' ? 'warning' : 'online';

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">

        
        <SectionHeader
          eyebrow="Live Emulator"
          title="System Emulator"
          description="Real-time RAFIQ infrastructure simulation. All data streams are deterministic fake data designed to replicate the exact message patterns, timing, and structure of a live RAFIQ deployment."
          status={sysStatus}
          statusLabel={scenario === 'emergency' ? 'Emergency' : scenario === 'cloud-disconnect' ? 'Degraded' : 'Online'}
          layer="Simulation"
          version="v2.1"
          metrics={[
            { label: 'AI Latency', value: `${sysMetrics.aiLatencyMs}ms`, variant: 'green' },
            { label: 'MQTT',       value: `${sysMetrics.mqttMsgPerMin}/min` },
            { label: 'Sync Queue', value: `${sysMetrics.syncQueueDepth}` },
          ]}
        />

        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={[
                  'flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-[10px] font-bold transition-all duration-200',
                  scenario === s.id ? s.color : 'border-white/[0.07] text-white/35 hover:border-white/15 hover:text-white/60',
                ].join(' ')}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[10px] ${scenarioCfg.color.split(' ')[0]}`}>
              {scenarioCfg.description}
            </span>
            <button
              onClick={() => setPaused(p => !p)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 font-mono text-[10px] text-white/50 transition-all hover:border-white/20 hover:text-white"
            >
              {paused ? <Play size={11} /> : <Pause size={11} />}
              {paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="AI Latency"     value={sysMetrics.aiLatencyMs} unit="ms"      status={sysMetrics.aiLatencyMs > 250 ? 'warning' : 'online'} />
          <MetricCard label="MQTT Rate"      value={sysMetrics.mqttMsgPerMin} unit="/min"  status="online" />
          <MetricCard label="Sensors"        value={sysMetrics.activeSensors}              status={scenario === 'emergency' ? 'active' : 'online'} />
          <MetricCard label="Sync Queue"     value={sysMetrics.syncQueueDepth} unit="items" status={scenario === 'cloud-disconnect' ? 'warning' : 'online'} />
        </div>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">System Log</p>
            <EventLog entries={logs} maxHeight="340px" title="rafiq.system.log" />
          </div>

          
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">MQTT Traffic Monitor</p>
            <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/50">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    {['text-[#FF3B3B]', 'text-amber-400', 'text-white/20'].map((c, i) => (
                      <div key={i} className={`h-2 w-2 rounded-full ${c.replace('text-', 'bg-')}`} />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-white/28">mqtt://localhost:1883</span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div className="h-1.5 w-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />
                  <span className="font-mono text-[9px] text-white/25">STREAMING</span>
                </div>
              </div>
              <div className="max-h-[340px] space-y-px overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
                <AnimatePresence initial={false}>
                  {[...mqtt].reverse().slice(0, 30).map(msg => (
                    <motion.div
                      key={msg.timestamp + msg.topic}
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex min-w-0 items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.02]"
                    >
                      <span className="shrink-0 font-mono text-[9px] text-white/18 w-[68px]">
                        {msg.timestamp.slice(11, 19)}
                      </span>
                      <span className={`shrink-0 font-mono text-[10px] font-bold ${getTopicColor(msg.topic)} min-w-[200px]`}>
                        {msg.topic}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[9px] text-white/35">
                        {JSON.stringify(msg.payload).slice(0, 60)}
                      </span>
                      <span className="shrink-0 rounded border border-white/[0.06] px-1 font-mono text-[8px] text-white/20">
                        QoS{msg.qos}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          
          <InfraPanel title="Wearable Monitor" subtitle="watch-001 · BLE connected" glow="red">
            <div className="space-y-4 p-5">
              {[
                { icon: <Heart size={13} className="text-[#FF3B3B]" />, label: 'Heart Rate', value: wearable.heartRate, unit: 'bpm', ok: wearable.heartRate < 100 && wearable.heartRate > 50 },
                { icon: <Wind size={13} className="text-blue-400" />, label: 'SpO₂', value: wearable.spo2, unit: '%', ok: wearable.spo2 >= 95 },
                { icon: <Activity size={13} className="text-emerald-400" />, label: 'Steps', value: wearable.steps.toLocaleString(), unit: '', ok: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="font-mono text-[11px] text-white/40">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.span
                      key={item.value}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={`font-mono text-[15px] font-black ${item.ok ? 'text-white' : 'text-amber-400'}`}
                    >
                      {item.value}
                    </motion.span>
                    <span className="font-mono text-[10px] text-white/25">{item.unit}</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-white/[0.05] pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white/25">Battery</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${wearable.battery}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-white/40">{wearable.battery}%</span>
                  </div>
                </div>
              </div>
            </div>
          </InfraPanel>

          
          <InfraPanel title="Sync Queue" subtitle="SQLite → Supabase" glow="blue">
            <div className="max-h-[280px] overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
              <div className="space-y-2">
                {syncQueue.slice(-8).reverse().map(entry => (
                  <div key={entry.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-white/60 truncate">{entry.table}</div>
                      <div className="font-mono text-[9px] text-white/25">{entry.operation} · {entry.size}b</div>
                    </div>
                    <span className={`shrink-0 rounded border px-1.5 py-px font-mono text-[8px] font-bold uppercase ${STATUS_BADGE[entry.status]}`}>
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </InfraPanel>

          
          <InfraPanel title="System Status" subtitle="Service health overview">
            <div className="space-y-3 p-5">
              {[
                { label: 'Core Engine',    status: 'online'  as const },
                { label: 'AI Orchestrator', status: (scenario === 'ai-failover' ? 'warning' : 'online') as SystemStatus },
                { label: 'MQTT Broker',    status: 'online'  as const },
                { label: 'Sync Engine',    status: (scenario === 'cloud-disconnect' ? 'warning' : 'syncing') as SystemStatus },
                { label: 'Emergency Eng.', status: (scenario === 'emergency' ? 'active' : 'online') as SystemStatus },
                { label: 'HA Bridge',      status: 'online'  as const },
                { label: 'Supabase',       status: (scenario === 'cloud-disconnect' ? 'offline' : 'online') as SystemStatus },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-white/45">{item.label}</span>
                  <StatusPulse status={item.status} size="xs" showLabel />
                </div>
              ))}
            </div>
          </InfraPanel>

        </div>
      </div>
    </div>
  );
}
