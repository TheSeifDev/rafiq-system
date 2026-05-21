'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, Terminal, Cpu, Brain, Database,
  GitBranch, Home, ShieldAlert, Watch, Bot,
  Lock, Network, RefreshCw, Code2,
  AlertTriangle, BookOpen, Activity,
  Zap, Server, Wifi, Shield,
} from 'lucide-react';
import { useSystemMetrics } from '@/src/features/rafiq/realtime/hooks';
import StatusPulse from '@/src/features/rafiq/shared/components/StatusPulse';

interface PlatformCard {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  href: string;
  accent: 'red' | 'blue';
  status: 'online' | 'active' | 'warning' | 'syncing';
  description: string;
}

const PLATFORM_CARDS: PlatformCard[] = [
  {
    icon: <Cpu size={16} strokeWidth={1.5} />,
    label: 'Core Engine',
    sublabel: 'Ubuntu · FastAPI · SQLite',
    href: '/rafiq/core',
    accent: 'red',
    status: 'online',
    description: 'The central orchestration layer. Manages services, event loops, threading, and offline execution.',
  },
  {
    icon: <Brain size={16} strokeWidth={1.5} />,
    label: 'AI System',
    sublabel: 'Ollama · MedGemma · Qwen',
    href: '/rafiq/ai',
    accent: 'blue',
    status: 'online',
    description: 'Local LLM routing, health analysis, voice pipeline, anomaly detection, and emotional AI.',
  },
  {
    icon: <Database size={16} strokeWidth={1.5} />,
    label: 'Database',
    sublabel: 'SQLite · Supabase · Sync',
    href: '/rafiq/database',
    accent: 'red',
    status: 'online',
    description: 'Offline-first data architecture with bidirectional cloud sync, event sourcing, and retry queues.',
  },
  {
    icon: <GitBranch size={16} strokeWidth={1.5} />,
    label: 'Data Flow',
    sublabel: 'BLE → MQTT → Cloud',
    href: '/rafiq/data-flow',
    accent: 'blue',
    status: 'online',
    description: 'Full pipeline from wearable sensor through MQTT broker, AI analysis, and cloud synchronization.',
  },
  {
    icon: <Terminal size={16} strokeWidth={1.5} />,
    label: 'Emulator',
    sublabel: 'Live System Simulation',
    href: '/rafiq/emulator',
    accent: 'red',
    status: 'active',
    description: 'Real-time infrastructure simulation. Watch MQTT traffic, AI decisions, sync flows, and emergencies.',
  },
  {
    icon: <RefreshCw size={16} strokeWidth={1.5} />,
    label: 'Sync Engine',
    sublabel: 'Push · Pull · Retry Queue',
    href: '/rafiq/sync-engine',
    accent: 'blue',
    status: 'syncing',
    description: 'Bidirectional sync between local SQLite and Supabase cloud with conflict resolution.',
  },
  {
    icon: <Home size={16} strokeWidth={1.5} />,
    label: 'Smart Home',
    sublabel: 'Home Assistant · MQTT',
    href: '/rafiq/smart-home',
    accent: 'red',
    status: 'online',
    description: 'Home automation layer with local-first logic, device control, and emergency automations.',
  },
  {
    icon: <ShieldAlert size={16} strokeWidth={1.5} />,
    label: 'RAQEEB',
    sublabel: 'Gas Detection · Safety',
    href: '/rafiq/raqeeb',
    accent: 'blue',
    status: 'online',
    description: 'Safety monitoring with gas leak detection, valve control, local-first emergency response.',
  },
  {
    icon: <Watch size={16} strokeWidth={1.5} />,
    label: 'Smart Watch',
    sublabel: 'ESP32 · BLE · Biometrics',
    href: '/rafiq/wearable',
    accent: 'red',
    status: 'online',
    description: 'ESP32-based wearable with HR, SpO₂, GPS, fall detection, and BLE emergency triggers.',
  },
  {
    icon: <Bot size={16} strokeWidth={1.5} />,
    label: 'GUI / Avatar',
    sublabel: 'Emotional AI · Voice Sync',
    href: '/rafiq/gui',
    accent: 'blue',
    status: 'online',
    description: 'Emotional avatar interface with voice-synchronized animations and AI state display.',
  },
  {
    icon: <Lock size={16} strokeWidth={1.5} />,
    label: 'Security',
    sublabel: 'JWT · Encryption · Edge',
    href: '/rafiq/security',
    accent: 'red',
    status: 'online',
    description: 'Multi-layer cybersecurity architecture: device trust, local auth, encrypted sync.',
  },
  {
    icon: <Network size={16} strokeWidth={1.5} />,
    label: 'Architecture',
    sublabel: 'Layers · Topology · Graph',
    href: '/rafiq/architecture',
    accent: 'blue',
    status: 'online',
    description: 'Full system topology: edge, local, cloud layers with service graphs and ownership maps.',
  },
  {
    icon: <Code2 size={16} strokeWidth={1.5} />,
    label: 'APIs',
    sublabel: 'REST · WebSocket · MQTT',
    href: '/rafiq/apis',
    accent: 'red',
    status: 'online',
    description: 'Complete API reference: REST endpoints, WebSocket events, MQTT topics, payload schemas.',
  },
  {
    icon: <AlertTriangle size={16} strokeWidth={1.5} />,
    label: 'Failure Scenarios',
    sublabel: 'Detection · Fallback · Recovery',
    href: '/rafiq/failures',
    accent: 'blue',
    status: 'warning',
    description: 'Documented failure modes with detection mechanisms, fallback logic, and recovery playbooks.',
  },
  {
    icon: <BookOpen size={16} strokeWidth={1.5} />,
    label: 'Documentation',
    sublabel: 'Guides · API Docs · Specs',
    href: '/rafiq/docs',
    accent: 'red',
    status: 'online',
    description: 'Comprehensive documentation covering setup, architecture, APIs, and deployment guides.',
  },
];

const STACK_LAYERS = [
  { icon: <Wifi size={12} />,   label: 'ESP32 + BLE',         sublabel: 'Sensor Layer',   layer: 'EDGE'  },
  { icon: <Zap size={12} />,    label: 'MQTT Broker',          sublabel: 'Message Bus',    layer: 'LOCAL' },
  { icon: <Cpu size={12} />,    label: 'RAFIQ Core',           sublabel: 'Orchestration',  layer: 'LOCAL' },
  { icon: <Brain size={12} />,  label: 'Ollama / LLM',         sublabel: 'AI Inference',   layer: 'LOCAL' },
  { icon: <Server size={12} />, label: 'Supabase',             sublabel: 'Cloud Sync',     layer: 'CLOUD' },
  { icon: <Shield size={12} />, label: 'Emergency Engine',     sublabel: 'Safety Layer',   layer: 'LOCAL' },
];

function LiveMetricsBar() {
  const metrics = useSystemMetrics(2000);

  const items = [
    { label: 'AI Latency',    value: `${metrics.aiLatencyMs}ms`,         color: 'text-emerald-400' },
    { label: 'MQTT',          value: `${metrics.mqttMsgPerMin} msg/min`,  color: 'text-blue-400'   },
    { label: 'Active Sensors',value: `${metrics.activeSensors}`,          color: 'text-white/60'   },
    { label: 'Sync Queue',    value: `${metrics.syncQueueDepth} pending`, color: 'text-amber-400'  },
    { label: 'Uptime',        value: metrics.localAIUptime,               color: 'text-emerald-400'},
    { label: 'Supabase',      value: metrics.supabaseStatus.toUpperCase(), color: metrics.supabaseStatus === 'online' ? 'text-emerald-400' : 'text-amber-400' },
  ];

  return (
    <div className="border-b border-white/[0.06] bg-white/[0.01] px-6 py-3">
      <div className="flex items-center gap-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex items-center gap-1.5 shrink-0">
          <motion.div
            className="h-1.5 w-1.5 rounded-full bg-[#FF3B3B]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#FF3B3B]/70">
            LIVE
          </span>
        </div>
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/22">
              {item.label}
            </span>
            <motion.span
              key={item.value}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              className={`font-mono text-[11px] font-bold ${item.color}`}
            >
              {item.value}
            </motion.span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformCard({ card, index }: { card: PlatformCard; index: number }) {
  const isRed  = card.accent === 'red';
  const hoverBorder = isRed  ? 'hover:border-[#FF3B3B]/20'  : 'hover:border-[#1E3A8A]/30';
  const hoverShadow = isRed  ? 'hover:shadow-[0_0_40px_rgba(255,59,59,0.05)]' : 'hover:shadow-[0_0_40px_rgba(30,58,138,0.07)]';
  const iconBg = isRed       ? 'bg-[#FF3B3B]/10'  : 'bg-[#1E3A8A]/15';
  const iconColor = isRed    ? 'text-[#FF3B3B]'   : 'text-blue-400';
  const barColor = isRed     ? 'bg-[#FF3B3B]/50'  : 'bg-[#1E3A8A]/60';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.03 }}
    >
      <Link href={card.href} className="group block h-full">
        <div
          className={[
            'relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07]',
            'bg-white/[0.02] p-5 transition-all duration-300',
            hoverBorder, hoverShadow,
            'hover:bg-white/[0.04]',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${iconBg} ${iconColor} transition-colors duration-300`}>
                {card.icon}
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-white">{card.label}</h3>
                <p className="font-mono text-[9px] text-white/28">{card.sublabel}</p>
              </div>
            </div>
            <StatusPulse status={card.status} size="xs" />
          </div>

          <p className="mt-4 flex-1 text-[11px] leading-relaxed text-white/38">
            {card.description}
          </p>

          <div className="mt-4 flex items-center gap-1.5">
            <span className={`font-mono text-[10px] ${isRed ? 'text-[#FF3B3B]/50' : 'text-blue-400/50'} transition-colors group-hover:${isRed ? 'text-[#FF3B3B]' : 'text-blue-400'}`}>
              Open section
            </span>
            <ArrowRight size={10} className={`${isRed ? 'text-[#FF3B3B]/40' : 'text-blue-400/40'} transition-transform group-hover:translate-x-0.5`} />
          </div>

          <div className={`absolute bottom-0 left-0 h-[1.5px] w-0 ${barColor} transition-all duration-500 group-hover:w-full`} />
        </div>
      </Link>
    </motion.div>
  );
}

export default function RafiqLandingPage() {
  return (
    <div className="min-h-screen">
      <LiveMetricsBar />

      <section className="relative overflow-hidden border-b border-white/[0.06] px-6 py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'radial-gradient(ellipse 60% 50% at 0% 0%, rgba(255,59,59,0.06) 0%, transparent 70%)',
              'radial-gradient(ellipse 50% 40% at 100% 100%, rgba(30,58,138,0.08) 0%, transparent 70%)',
            ].join(', '),
          }}
        />

        <div className="relative mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 flex flex-wrap items-center gap-3"
          >
            <StatusPulse status="active" size="sm" showLabel label="Platform Online" />
            <span className="rounded-md border border-[#1E3A8A]/30 bg-[#1E3A8A]/10 px-2.5 py-1 font-mono text-[10px] text-blue-400/60 uppercase tracking-wider">
              Edge AI Layer
            </span>
            <span className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-white/30">
              v2.1.0
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF3B3B]/70">
              Phantoms · RAFIQ Platform
            </p>
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Offline-first intelligence<br />
              <span className="text-white/35">for human safety.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 max-w-2xl text-[14px] leading-relaxed text-white/40"
          >
            RAFIQ is a distributed edge AI operating system for healthcare and smart home environments.
            It runs locally, reasons independently, syncs intelligently — and never fails when the cloud does.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/rafiq/core"
              className="group flex items-center gap-2 rounded-xl bg-[#FF3B3B]/90 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_0_30px_rgba(255,59,59,0.25)] transition-all hover:bg-[#FF3B3B] hover:shadow-[0_0_40px_rgba(255,59,59,0.35)]"
            >
              Enter Infrastructure
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/rafiq/emulator"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-[13px] font-bold text-white/70 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white"
            >
              <Terminal size={13} />
              Live Emulator
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-14"
          >
            <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">
              System Stack
            </p>
            <div className="flex flex-wrap gap-2">
              {STACK_LAYERS.map((layer, i) => (
                <motion.div
                  key={layer.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.35 + i * 0.04 }}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5"
                >
                  <span className="text-white/30">{layer.icon}</span>
                  <div>
                    <div className="text-[11px] font-bold text-white/70">{layer.label}</div>
                    <div className="font-mono text-[9px] text-white/25">{layer.sublabel}</div>
                  </div>
                  <span
                    className={[
                      'ml-1 rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider',
                      layer.layer === 'EDGE'  ? 'bg-amber-400/15 text-amber-400/70' :
                      layer.layer === 'CLOUD' ? 'bg-[#1E3A8A]/20 text-blue-400/70'  :
                                                'bg-emerald-400/10 text-emerald-400/60',
                    ].join(' ')}
                  >
                    {layer.layer}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center gap-3">
            <Activity size={14} className="text-[#FF3B3B]/60" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
              Platform Modules · {PLATFORM_CARDS.length} sections
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_CARDS.map((card, i) => (
              <PlatformCard key={card.href} card={card} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/20">
            Start here
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Begin the infrastructure walkthrough.
          </h2>
          <p className="mt-3 text-sm text-white/35">
            Start with the Core Engine to understand how RAFIQ orchestrates services, handles failures, and operates offline.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/rafiq/core"
              className="group flex items-center gap-2 rounded-xl border border-[#FF3B3B]/25 bg-[#FF3B3B]/8 px-5 py-2.5 text-[13px] font-bold text-[#FF3B3B] transition-all hover:bg-[#FF3B3B]/15"
            >
              <Cpu size={13} />
              Core Engine
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}