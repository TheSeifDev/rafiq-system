'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, WifiOff, Brain, Database, Bluetooth, Home, CheckCircle, Clock } from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';

interface FailureScenario {
  id: string;
  icon: React.ReactNode;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  detection: string;
  fallback: string;
  recovery: string;
  rto: string;
  rpo: string;
}

const SCENARIOS: FailureScenario[] = [
  {
    id: 'internet-failure',
    icon: <WifiOff size={15} strokeWidth={1.5} />,
    title: 'Internet / Cloud Failure',
    severity: 'High',
    detection: 'HTTP timeout to Supabase health endpoint (5s timeout, 3 retries)',
    fallback: 'Sync engine switches to offline queue mode. All writes continue locally. Cloud push paused.',
    recovery: 'Auto-reconnect with exponential backoff. On reconnect: drain queue in priority order (Critical → Low).',
    rto: '< 30s to detect, instant fallback',
    rpo: '0 — no data lost',
  },
  {
    id: 'mqtt-failure',
    icon: <AlertTriangle size={15} strokeWidth={1.5} />,
    title: 'MQTT Broker Failure',
    severity: 'High',
    detection: 'Client disconnect callback fired. Core engine loses MQTT connection.',
    fallback: 'Core engine switches to direct API polling mode. Wearable data buffered at gateway. HA commands via direct REST.',
    recovery: 'Mosquitto auto-restarts via systemd. Client reconnects with clean session. Re-subscribes all topics.',
    rto: '< 10s (systemd auto-restart)',
    rpo: 'Low — buffered at gateway',
  },
  {
    id: 'ai-timeout',
    icon: <Brain size={15} strokeWidth={1.5} />,
    title: 'AI Inference Timeout',
    severity: 'Medium',
    detection: 'AI orchestrator enforces 5s timeout per inference call. Alert if >3 consecutive timeouts.',
    fallback: 'Rules engine takes over health analysis. Predefined threshold rules replace LLM reasoning. Simpler but reliable.',
    recovery: 'Ollama watchdog restarts the process. Model reloaded from disk (GGUF). Inference resumes in ~30s.',
    rto: '< 35s to restart',
    rpo: '0 — rules engine covers the gap',
  },
  {
    id: 'sqlite-corruption',
    icon: <Database size={15} strokeWidth={1.5} />,
    title: 'SQLite Corruption',
    severity: 'Critical',
    detection: 'PRAGMA integrity_check on startup and hourly. Any non-"ok" result triggers alert.',
    fallback: 'Read-only mode from WAL snapshot. Writes buffered in memory. Emergency data preserved.',
    recovery: 'Restore from last Supabase full dump. Apply local WAL changes on top. Re-sync from cloud.',
    rto: '< 5min with recent cloud backup',
    rpo: 'Seconds to minutes depending on last sync',
  },
  {
    id: 'wearable-disconnect',
    icon: <Bluetooth size={15} strokeWidth={1.5} />,
    title: 'Wearable BLE Disconnect',
    severity: 'Medium',
    detection: 'BLE RSSI drop below -90dBm + connection timeout (5s). LWT message on MQTT.',
    fallback: 'Last known vitals cached and used for 5 minutes. Emergency engine continues with cached values.',
    recovery: 'BLE gateway auto-scans for device every 5s. Reconnects and re-subscribes GATT notifications.',
    rto: '< 15s to reconnect if in range',
    rpo: '0 — no reads lost, stale data clearly flagged',
  },
  {
    id: 'ha-crash',
    icon: <Home size={15} strokeWidth={1.5} />,
    title: 'Home Assistant Crash',
    severity: 'Medium',
    detection: 'WebSocket connection to HA drops. HTTP health check fails.',
    fallback: 'Direct MQTT device control bypasses HA. Core publishes to device topics directly.',
    recovery: 'HA service auto-restarts via systemd. Core reconnects WebSocket and re-syncs device states.',
    rto: '< 30s (systemd restart)',
    rpo: '0 — direct MQTT control active',
  },
  {
    id: 'esp32-emergency-offline',
    icon: <AlertTriangle size={15} strokeWidth={1.5} />,
    title: 'ESP32 Emergency MCU Offline',
    severity: 'Critical',
    detection: 'MQTT LWT message from Raqeeb MCU. No heartbeat for 30s.',
    fallback: 'Core engine polls sensors directly via alternative I2C bus. Emergency engine continues with direct hardware access.',
    recovery: 'ESP32 watchdog timer auto-resets the MCU (10s). MQTT LWT cleared on reconnect.',
    rto: '< 15s (watchdog reset)',
    rpo: '0 — direct sensor polling active',
  },
  {
    id: 'memory-pressure',
    icon: <AlertTriangle size={15} strokeWidth={1.5} />,
    title: 'Memory Pressure (RAM > 85%)',
    severity: 'Medium',
    detection: 'System monitor checks RAM every 60s. Alert at 75%, action at 85%.',
    fallback: 'Evict LLM model cache. Reduce AI context window. Restart non-critical services (voice pipeline, caches).',
    recovery: 'Services restart with lower memory profile. Swap space used as emergency buffer if needed.',
    rto: '< 60s to restore headroom',
    rpo: '0 — no data affected',
  },
];

const MATRIX = SCENARIOS.map(s => ({
  failure: s.title,
  rto: s.rto,
  rpo: s.rpo,
  severity: s.severity,
}));

const SEV_COLOR: Record<string, string> = {
  Critical: 'text-[#FF3B3B]/80',
  High:     'text-amber-400/80',
  Medium:   'text-blue-400/70',
  Low:      'text-white/40',
};

const STEP_COLORS = [
  'border-[#FF3B3B]/20 bg-[#FF3B3B]/5 text-[#FF3B3B]/70',
  'border-amber-400/20 bg-amber-400/5 text-amber-400/70',
  'border-blue-400/20 bg-blue-400/5 text-blue-400/70',
  'border-emerald-400/20 bg-emerald-400/5 text-emerald-400/70',
];

export default function FailuresPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        <SectionHeader
          eyebrow="Resilience Layer"
          title="Failure Scenarios"
          description="RAFIQ is designed to fail gracefully. Every failure mode has a documented detection mechanism, an immediate fallback, and a recovery path. The system never enters an undefined state — every error is a known, handled scenario."
          status="warning"
          statusLabel="8 scenarios"
          layer="Resilience"
          version="v2.1"
          metrics={[
            { label: 'Scenarios', value: '8' },
            { label: 'Critical', value: '2' },
            { label: 'Auto-recover', value: '8/8' },
          ]}
        />

        
        <div className="space-y-6">
          {SCENARIOS.map((s, si) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ delay: si * 0.04, duration: 0.35 }}
              className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]"
            >
              
              <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2 ${s.severity === 'Critical' ? 'bg-[#FF3B3B]/10 text-[#FF3B3B]' : 'bg-amber-400/10 text-amber-400'}`}>
                    {s.icon}
                  </div>
                  <h3 className="text-[13px] font-bold text-white">{s.title}</h3>
                </div>
                <span className={`font-mono text-[10px] font-bold ${SEV_COLOR[s.severity]}`}>
                  {s.severity.toUpperCase()}
                </span>
              </div>

              
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Detection', body: s.detection },
                  { label: 'Fallback',  body: s.fallback  },
                  { label: 'Recovery',  body: s.recovery  },
                  { label: 'Metrics',   body: `RTO: ${s.rto}\nRPO: ${s.rpo}` },
                ].map((step, i) => (
                  <div key={step.label} className={`rounded-xl border p-3 ${STEP_COLORS[i]}`}>
                    <div className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">
                      {String(i + 1).padStart(2, '0')} {step.label}
                    </div>
                    <p className="text-[10px] leading-relaxed whitespace-pre-line opacity-80">{step.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Failure Matrix</h2>
          <DataTable
            columns={[
              { key: 'failure', label: 'Failure', className: 'min-w-[200px]' },
              { key: 'severity', label: 'Severity', render: (row) => <span className={SEV_COLOR[String(row.severity)]}>{String(row.severity)}</span> },
              { key: 'rto', label: 'RTO (Recovery Time)' },
              { key: 'rpo', label: 'RPO (Data Loss)' },
            ]}
            data={MATRIX}
            subtitle="All 8 scenarios are auto-recovering — no manual intervention required"
          />
        </div>

      </div>
    </div>
  );
}
