'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Watch, Wifi, Cpu, Server, Database, Brain, AlertTriangle,
  MessageSquare, Cloud, Smartphone, Flame, ShieldAlert, Zap,
  Phone, Bell, Home, GitBranch, ArrowRight, Clock, RefreshCw,
  Radio, Activity,
} from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';

type FlowNodeType = 'source' | 'transport' | 'broker' | 'engine' | 'ai' | 'storage' | 'cloud' | 'output' | 'action' | 'emergency';

interface FlowNode {
  id: string;
  label: string;
  sublabel: string;
  protocol?: string;
  icon: React.ReactNode;
  type: FlowNodeType;
  latency?: string;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  accent: 'blue' | 'red';
  nodes: FlowNode[];
}

const NODE_STYLES: Record<FlowNodeType, { border: string; bg: string; icon: string; badge: string }> = {
  source:    { border: 'border-blue-500/30',     bg: 'bg-blue-500/5',      icon: 'text-blue-400',    badge: 'bg-blue-500/15 text-blue-300/70' },
  transport: { border: 'border-purple-500/30',   bg: 'bg-purple-500/5',    icon: 'text-purple-400',  badge: 'bg-purple-500/15 text-purple-300/70' },
  broker:    { border: 'border-amber-500/30',    bg: 'bg-amber-500/5',     icon: 'text-amber-400',   badge: 'bg-amber-500/15 text-amber-300/70' },
  engine:    { border: 'border-white/20',        bg: 'bg-white/[0.03]',    icon: 'text-white/60',    badge: 'bg-white/10 text-white/40' },
  ai:        { border: 'border-[#FF3B3B]/30',    bg: 'bg-[#FF3B3B]/5',     icon: 'text-[#FF3B3B]',   badge: 'bg-[#FF3B3B]/15 text-[#FF3B3B]/70' },
  storage:   { border: 'border-emerald-500/30',  bg: 'bg-emerald-500/5',   icon: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300/70' },
  cloud:     { border: 'border-sky-500/30',      bg: 'bg-sky-500/5',       icon: 'text-sky-400',     badge: 'bg-sky-500/15 text-sky-300/70' },
  output:    { border: 'border-violet-500/30',   bg: 'bg-violet-500/5',    icon: 'text-violet-400',  badge: 'bg-violet-500/15 text-violet-300/70' },
  action:    { border: 'border-[#FF3B3B]/40',    bg: 'bg-[#FF3B3B]/8',     icon: 'text-[#FF3B3B]',   badge: 'bg-[#FF3B3B]/20 text-[#FF3B3B]/80' },
  emergency: { border: 'border-[#FF3B3B]/60',   bg: 'bg-[#FF3B3B]/10',    icon: 'text-[#FF3B3B]',   badge: 'bg-[#FF3B3B]/25 text-[#FF3B3B]' },
};

const HEALTH_PIPELINE: FlowNode[] = [
  { id: 'wearable',  label: 'Wearable Device',   sublabel: 'ESP32 + MAX30102',      protocol: 'Sensor',   icon: <Watch size={14} />,        type: 'source',    latency: '' },
  { id: 'ble',       label: 'BLE Transport',      sublabel: '2.4GHz · GATT Profile', protocol: 'BLE',      icon: <Wifi size={14} />,         type: 'transport', latency: '10–50ms' },
  { id: 'gateway',   label: 'ESP32 Gateway',      sublabel: 'BLE→WiFi Bridge',       protocol: 'Bridge',   icon: <Radio size={14} />,        type: 'engine',    latency: '2–8ms' },
  { id: 'mqtt',      label: 'MQTT Broker',        sublabel: 'Mosquitto v2 · QoS 1',  protocol: 'MQTT',     icon: <MessageSquare size={14} />, type: 'broker',    latency: '5–20ms' },
  { id: 'core',      label: 'Core Engine',        sublabel: 'FastAPI · Python 3.12', protocol: 'Async',    icon: <Cpu size={14} />,          type: 'engine',    latency: '1–5ms' },
  { id: 'sqlite',    label: 'SQLite Write',        sublabel: 'WAL · In-process DB',   protocol: 'WAL',      icon: <Database size={14} />,     type: 'storage',   latency: '1–5ms' },
  { id: 'ai',        label: 'AI Analysis',         sublabel: 'MedGemma 4B · Ollama', protocol: 'llama.cpp', icon: <Brain size={14} />,       type: 'ai',        latency: '140–200ms' },
  { id: 'decision',  label: 'Decision Engine',     sublabel: 'Rule evaluation · CEP', protocol: 'Internal', icon: <GitBranch size={14} />,   type: 'engine',    latency: '1–3ms' },
  { id: 'supabase',  label: 'Supabase Sync',       sublabel: 'PostgreSQL · REST API', protocol: 'HTTPS',    icon: <Cloud size={14} />,       type: 'cloud',     latency: '200–2000ms' },
  { id: 'mobile',    label: 'Mobile App',          sublabel: 'Flutter · Push Notify', protocol: 'Push',     icon: <Smartphone size={14} />,  type: 'output',    latency: 'async' },
];

const EMERGENCY_PIPELINE: FlowNode[] = [
  { id: 'gas',       label: 'Raqeeb Gas Sensor',   sublabel: 'MQ-2 · MQ-7 · MQ-135', protocol: 'ADC',      icon: <Flame size={14} />,         type: 'emergency', latency: '' },
  { id: 'mcu',       label: 'ESP32 Emergency MCU', sublabel: 'Dedicated safety MCU',   protocol: 'GPIO',     icon: <Cpu size={14} />,           type: 'action',    latency: '<1ms' },
  { id: 'thresh',    label: 'Local Threshold Check', sublabel: 'No cloud dependency',  protocol: 'Local',    icon: <ShieldAlert size={14} />,   type: 'engine',    latency: '0.1ms' },
  { id: 'valve',     label: 'Valve Shutdown',       sublabel: 'GPIO · Relay control',  protocol: 'GPIO',     icon: <Zap size={14} />,           type: 'action',    latency: '<5ms' },
  { id: 'alert',     label: 'MQTT Alert',           sublabel: 'QoS 2 · Retained',      protocol: 'MQTT',     icon: <MessageSquare size={14} />, type: 'broker',    latency: '5–20ms' },
  { id: 'aiclass',   label: 'AI Classification',    sublabel: 'Emergency type ID',      protocol: 'Ollama',   icon: <Brain size={14} />,         type: 'ai',        latency: '140–200ms' },
  { id: 'sms',       label: 'SMS Gateway',          sublabel: 'Twilio · Fallback SIM',  protocol: 'SMS',      icon: <Phone size={14} />,         type: 'cloud',     latency: '1–5s' },
  { id: 'push',      label: 'App Push Notification', sublabel: 'FCM · Critical alert', protocol: 'FCM',      icon: <Bell size={14} />,          type: 'output',    latency: '200–500ms' },
  { id: 'ha',        label: 'HA Automation',        sublabel: 'Home Assistant · YAML', protocol: 'MQTT→HA',  icon: <Home size={14} />,          type: 'action',    latency: '50–200ms' },
];

const PIPELINES: Pipeline[] = [
  {
    id: 'health',
    name: 'Health Monitoring Pipeline',
    description: 'Continuous biometric data flow from wearable sensor through local AI analysis to cloud sync',
    accent: 'blue',
    nodes: HEALTH_PIPELINE,
  },
  {
    id: 'emergency',
    name: 'Emergency Response Pipeline',
    description: 'Life-critical gas detection with local-first hardware failsafe and multi-channel alerting',
    accent: 'red',
    nodes: EMERGENCY_PIPELINE,
  },
];

interface LatencyRow {
  component: string;
  protocol: string;
  typical: string;
  max: string;
  async: string;
  [key: string]: unknown;
}

const LATENCY_DATA: LatencyRow[] = [
  { component: 'BLE Transport',       protocol: 'Bluetooth 5.0',   typical: '10ms',   max: '50ms',    async: 'No' },
  { component: 'WiFi (ESP32→Router)', protocol: '802.11n 2.4GHz',  typical: '2ms',    max: '15ms',    async: 'No' },
  { component: 'MQTT Publish',        protocol: 'MQTT v3.1.1',     typical: '5ms',    max: '20ms',    async: 'No (QoS 1)' },
  { component: 'SQLite WAL Write',    protocol: 'WAL Journal',      typical: '1ms',    max: '5ms',     async: 'No' },
  { component: 'Core Engine Dispatch',protocol: 'asyncio',          typical: '0.5ms',  max: '3ms',     async: 'Yes' },
  { component: 'MedGemma Inference',  protocol: 'llama.cpp/Ollama', typical: '160ms',  max: '300ms',   async: 'Yes' },
  { component: 'Decision Engine',     protocol: 'Internal Python',  typical: '1ms',    max: '5ms',     async: 'No' },
  { component: 'Supabase REST Sync',  protocol: 'HTTPS/REST',       typical: '250ms',  max: '2000ms',  async: 'Yes (queue)' },
  { component: 'SMS Gateway',         protocol: 'Twilio API',       typical: '1.5s',   max: '5s',      async: 'Yes' },
  { component: 'FCM Push',            protocol: 'Firebase FCM',     typical: '300ms',  max: '1000ms',  async: 'Yes' },
  { component: 'GPIO Relay',          protocol: 'ESP32 GPIO',       typical: '0.1ms',  max: '1ms',     async: 'No (hardware)' },
  { component: 'HA Automation',       protocol: 'MQTT→HA WS',       typical: '80ms',   max: '250ms',   async: 'Yes' },
];

const MQTT_SUBSCRIBER_CODE = `import asyncio
import json
import logging
from datetime import datetime

import aiomqtt
from sqlalchemy.ext.asyncio import AsyncSession

from rafiq.core.db import get_session
from rafiq.ai.orchestrator import AIOrchestrator
from rafiq.decision.engine import DecisionEngine

logger = logging.getLogger("mqtt-subscriber")

BROKER_HOST = "localhost"
BROKER_PORT = 1883
SUBSCRIPTIONS = [
    ("rafiq/wearable/#", 1),   # Biometrics — QoS 1
    ("rafiq/emergency/#", 2),  # Emergency alerts — QoS 2
    ("rafiq/home/#", 1),       # Home events — QoS 1
    ("rafiq/ai/#", 0),         # AI responses — QoS 0
]

async def handle_wearable(topic: str, payload: dict, session: AsyncSession) -> None:
    """Process incoming wearable sensor readings."""
    metric_type = topic.split("/")[-1]  # heartrate | spo2 | steps
    
    # 1. Persist to SQLite immediately (WAL mode, <5ms)
    await session.execute(
        "INSERT INTO wearable_metrics (type, value, ts) VALUES (:t, :v, :ts)",
        {"t": metric_type, "v": payload.get("value"), "ts": datetime.utcnow()},
    )
    await session.commit()
    
    # 2. Dispatch to AI asynchronously (non-blocking)
    asyncio.create_task(
        AIOrchestrator.analyze_health(metric_type, payload)
    )

async def handle_emergency(topic: str, payload: dict) -> None:
    """Handle emergency events — priority path, no async delay."""
    event_type = payload.get("type", "unknown")
    severity   = payload.get("severity", "medium")
    
    logger.critical(f"[EMERGENCY] {event_type} @ severity={severity}")
    
    # Decision engine runs synchronously for emergencies
    decision = await DecisionEngine.evaluate_emergency(event_type, severity)
    await decision.execute()  # Triggers GPIO, SMS, push

async def mqtt_subscriber_loop() -> None:
    """Main MQTT subscriber coroutine with auto-reconnect."""
    async with aiomqtt.Client(BROKER_HOST, BROKER_PORT) as client:
        # Subscribe to all topic patterns
        for topic, qos in SUBSCRIPTIONS:
            await client.subscribe(topic, qos=qos)
            logger.info(f"Subscribed: {topic} (QoS {qos})")
        
        async with client.messages() as messages:
            async for message in messages:
                topic   = str(message.topic)
                payload = json.loads(message.payload.decode())
                
                try:
                    async with get_session() as session:
                        if topic.startswith("rafiq/wearable/"):
                            await handle_wearable(topic, payload, session)
                        elif topic.startswith("rafiq/emergency/"):
                            await handle_emergency(topic, payload)
                except Exception as exc:
                    logger.error(f"Subscriber error [{topic}]: {exc}")

if __name__ == "__main__":
    asyncio.run(mqtt_subscriber_loop())`;

function FlowNode({ node, index, isLast, accent }: {
  node: FlowNode;
  index: number;
  isLast: boolean;
  accent: 'blue' | 'red';
}) {
  const styles = NODE_STYLES[node.type];
  const connectorColor = accent === 'red' ? 'bg-[#FF3B3B]/30' : 'bg-blue-500/30';
  const dotColor = accent === 'red' ? 'bg-[#FF3B3B]' : 'bg-blue-400';

  return (
    <div className="flex items-center gap-0">
      
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: index * 0.07 }}
        className="flex flex-col items-center"
        style={{ minWidth: '120px' }}
      >
        
        <div className="mb-2 font-mono text-[9px] text-white/20">
          {String(index + 1).padStart(2, '0')}
        </div>

        
        <div className={`relative rounded-xl border ${styles.border} ${styles.bg} px-3 py-2.5 w-[118px]`}>
          
          <div className="flex items-center gap-2 mb-1">
            <span className={styles.icon}>{node.icon}</span>
            <span className="text-[11px] font-bold text-white leading-tight">{node.label}</span>
          </div>
          
          <p className="font-mono text-[8.5px] text-white/28 leading-tight mb-1.5">
            {node.sublabel}
          </p>
          
          {node.protocol && (
            <span className={`inline-block rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wide ${styles.badge}`}>
              {node.protocol}
            </span>
          )}
        </div>

        
        {node.latency && (
          <div className="mt-2 flex items-center gap-1">
            <Clock size={8} className="text-white/20" />
            <span className="font-mono text-[8px] text-white/30">{node.latency}</span>
          </div>
        )}
      </motion.div>

      
      {!isLast && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25, delay: index * 0.07 + 0.2 }}
          className="flex items-center mx-1 shrink-0"
          style={{ transformOrigin: 'left' }}
        >
          <div className={`h-[1.5px] w-8 ${connectorColor}`} />
          <motion.div
            className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.15 }}
          />
        </motion.div>
      )}
    </div>
  );
}

function PipelineVisualization({ pipeline }: { pipeline: Pipeline }) {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const isRed = pipeline.accent === 'red';
  const glowClass = isRed ? 'rgba(255,59,59,0.06)' : 'rgba(30,58,138,0.08)';
  const labelColor = isRed ? 'text-[#FF3B3B]/70' : 'text-blue-400/70';
  const borderAccent = isRed ? 'border-[#FF3B3B]/15' : 'border-[#1E3A8A]/20';
  const rows: FlowNode[][] = [];
  for (let i = 0; i < pipeline.nodes.length; i += 5) {
    rows.push(pipeline.nodes.slice(i, i + 5));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border ${borderAccent} bg-white/[0.015] p-6`}
      style={{
        backgroundImage: `radial-gradient(ellipse 80% 60% at 0% 0%, ${glowClass} 0%, transparent 70%)`,
      }}
    >
      
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className={`mb-1 font-mono text-[10px] uppercase tracking-[0.18em] ${labelColor}`}>
            {isRed ? '🔴 Emergency Path' : '🔵 Monitoring Path'}
          </p>
          <h3 className="text-[15px] font-black text-white">{pipeline.name}</h3>
          <p className="mt-1 text-[12px] text-white/38">{pipeline.description}</p>
        </div>
        <div className={`shrink-0 rounded-xl border ${borderAccent} px-3 py-1.5`}>
          <span className="font-mono text-[9px] text-white/30">
            {pipeline.nodes.length} nodes
          </span>
        </div>
      </div>

      
      <div className="space-y-6">
        {rows.map((row, rowIdx) => {
          const globalOffset = rowIdx * 5;
          return (
            <div key={rowIdx}>
              
              {rowIdx > 0 && (
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-[1px] w-6 bg-white/10" />
                  <span className="font-mono text-[8px] text-white/20">↩ continues</span>
                </div>
              )}
              <div className="flex items-start flex-wrap gap-y-2">
                {row.map((node, i) => {
                  const globalIndex = globalOffset + i;
                  const isLastInRow = i === row.length - 1;
                  const isLastOverall = globalIndex === pipeline.nodes.length - 1;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                      className="cursor-pointer"
                    >
                      <FlowNode
                        node={node}
                        index={globalIndex}
                        isLast={isLastInRow || isLastOverall}
                        accent={pipeline.accent}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      
      <AnimatePresence>
        {activeNode && (() => {
          const node = pipeline.nodes.find(n => n.id === activeNode);
          if (!node) return null;
          const styles = NODE_STYLES[node.type];
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className={`mt-5 rounded-xl border ${styles.border} ${styles.bg} px-4 py-3`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className={styles.icon}>{node.icon}</span>
                <span className="text-[13px] font-bold text-white">{node.label}</span>
                {node.protocol && (
                  <span className={`rounded px-2 py-px font-mono text-[9px] font-bold uppercase ${styles.badge}`}>
                    {node.protocol}
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-white/40">{node.sublabel}</p>
              {node.latency && (
                <p className="mt-1 font-mono text-[10px] text-white/25">
                  Latency: <span className="text-white/50">{node.latency}</span>
                </p>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}

function AsyncSyncPanel() {
  const items = [
    {
      label: 'Synchronous Path',
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5',
      items: [
        'Sensor → BLE → MQTT: sequential, blocking per packet',
        'GPIO relay control: hardware interrupt, <1ms guaranteed',
        'SQLite WAL write: synchronous before ACK',
        'Local threshold evaluation: immediate decision, no network',
        'Emergency MQTT publish QoS 2: requires broker confirmation',
      ],
    },
    {
      label: 'Asynchronous Path',
      color: 'text-blue-400',
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/5',
      items: [
        'AI inference via asyncio.create_task() — never blocks main loop',
        'Supabase sync runs in background queue with exponential retry',
        'Push notifications dispatched post-decision asynchronously',
        'SMS gateway call fire-and-forget with separate delivery tracking',
        'HA automations triggered via MQTT retain — eventual consistency',
      ],
    },
  ];

  return (
    <InfraPanel title="Async vs Sync Execution Model" subtitle="How RAFIQ handles blocking vs non-blocking operations" glow="blue">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((section, i) => (
          <motion.div
            key={section.label}
            initial={{ opacity: 0, x: i === 0 ? -12 : 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.1 }}
            className={`rounded-xl border ${section.border} ${section.bg} p-4`}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${section.color.replace('text-', 'bg-')}`} />
              <span className={`font-mono text-[11px] font-bold ${section.color}`}>
                {section.label}
              </span>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-[4px] shrink-0 text-[10px] text-white/20">›</span>
                  <span className="font-mono text-[10px] text-white/40 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      
      <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/40 p-4">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
          Execution Timeline (example: wearable HR packet)
        </p>
        <div className="space-y-2">
          {[
            { label: 'BLE receive',       start: 0,   width: 5,  color: 'bg-blue-500',     ms: '0ms' },
            { label: 'MQTT publish',      start: 5,   width: 10, color: 'bg-amber-500',    ms: '15ms' },
            { label: 'SQLite write',      start: 15,  width: 4,  color: 'bg-emerald-500',  ms: '19ms' },
            { label: 'AI inference',      start: 19,  width: 40, color: 'bg-[#FF3B3B]',    ms: '180ms ↗' },
            { label: 'Decision eval',     start: 59,  width: 3,  color: 'bg-white/40',     ms: '62ms' },
            { label: 'Supabase sync',     start: 62,  width: 38, color: 'bg-sky-600',      ms: '~500ms ↗↗' },
          ].map((bar, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-[100px] shrink-0 font-mono text-[9px] text-white/30 text-right">
                {bar.label}
              </span>
              <div className="flex-1 relative h-4 bg-white/[0.03] rounded overflow-hidden">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`absolute h-full ${bar.color} opacity-60 rounded`}
                  style={{
                    left: `${bar.start}%`,
                    width: `${bar.width}%`,
                    transformOrigin: 'left',
                  }}
                />
              </div>
              <span className="w-[55px] shrink-0 font-mono text-[9px] text-white/25">
                {bar.ms}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[8px] text-white/18">
          ↗ = async dispatch (does not block main pipeline) · Timeline not to scale
        </p>
      </div>
    </InfraPanel>
  );
}

function RetryQueueSection() {
  const mechanics = [
    {
      title: 'Offline Queue (SQLite-backed)',
      icon: <Database size={13} />,
      color: 'text-emerald-400',
      points: [
        'All outbound records written to sync_queue table before cloud push attempt',
        'Queue is durable — persists across process restarts and power cycles',
        'Each entry: table, operation (INSERT/UPDATE/DELETE), payload_json, retries, status',
        'Worker polls queue every 30s; on cloud availability, drains in FIFO order',
      ],
    },
    {
      title: 'Exponential Backoff',
      icon: <RefreshCw size={13} />,
      color: 'text-amber-400',
      points: [
        'First retry: 30s · Second: 2min · Third: 10min · Fourth+: 1 hour cap',
        'Jitter factor ±20% added to prevent synchronized thundering herd',
        'Failed entries after 5 retries → moved to dead_letter_queue table',
        'Dead letter queue is manually reviewed via admin API: GET /api/sync/dead-letter',
      ],
    },
    {
      title: 'Conflict Resolution',
      icon: <GitBranch size={13} />,
      color: 'text-blue-400',
      points: [
        'Last-write-wins strategy using updated_at UTC timestamps',
        'Wearable metrics never conflict (append-only by device_id + timestamp)',
        'User settings: server wins unless local version has unseen field changes',
        'Emergency events: always preserved, never overwritten by cloud version',
      ],
    },
    {
      title: 'Guaranteed Delivery (Emergency)',
      icon: <AlertTriangle size={13} />,
      color: 'text-[#FF3B3B]',
      points: [
        'Emergency alerts use MQTT QoS 2 (exactly-once delivery guarantee)',
        'SMS via Twilio with delivery receipt polling — retries until confirmed',
        'Critical events stored locally with status=unconfirmed until acked by server',
        'Separate emergency sync channel runs independently of normal sync pipeline',
      ],
    },
  ];

  return (
    <InfraPanel title="Retry & Queue Mechanics" subtitle="Durable message delivery and conflict resolution" glow="red">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {mechanics.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className={m.color}>{m.icon}</span>
              <span className={`text-[11px] font-bold ${m.color}`}>{m.title}</span>
            </div>
            <ul className="space-y-1.5">
              {m.points.map((pt, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-[4px] shrink-0 font-mono text-[10px] text-white/18">·</span>
                  <span className="font-mono text-[10px] text-white/38 leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </InfraPanel>
  );
}

export default function DataFlowPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        
        <SectionHeader
          eyebrow="Infrastructure · Pipeline"
          title="Data Flow Architecture"
          description="End-to-end data pipelines from physical sensors through edge computing, MQTT messaging, local AI inference, and cloud synchronization. Every hop is designed for offline-first reliability with deterministic latency bounds."
          status="active"
          statusLabel="Pipelines Live"
          layer="Edge → Local → Cloud"
          version="v2.1.0"
          metrics={[
            { label: 'End-to-End', value: '~250ms', variant: 'green' },
            { label: 'Emergency Path', value: '<5ms local', variant: 'red' },
            { label: 'Uptime', value: '99.7%', variant: 'green' },
          ]}
        />

        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-5 py-3"
        >
          <div className="flex flex-wrap items-center gap-6">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">
              Active Pipelines
            </span>
            {PIPELINES.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <motion.div
                  className={`h-1.5 w-1.5 rounded-full ${p.accent === 'red' ? 'bg-[#FF3B3B]' : 'bg-blue-400'}`}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: p.accent === 'red' ? 0.4 : 0 }}
                />
                <span className="font-mono text-[10px] text-white/45">{p.name}</span>
                <span className="rounded border border-white/[0.07] px-1.5 py-px font-mono text-[8px] text-white/25">
                  {p.nodes.length} steps
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Activity size={13} className="text-blue-400/60" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
              Pipeline 01 · Health Monitoring
            </h2>
          </div>
          <div className="overflow-x-auto">
            <PipelineVisualization pipeline={PIPELINES[0]} />
          </div>
        </section>

        
        <section>
          <div className="mb-4 flex items-center gap-3">
            <ShieldAlert size={13} className="text-[#FF3B3B]/60" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
              Pipeline 02 · Emergency Response
            </h2>
          </div>
          <div className="overflow-x-auto">
            <PipelineVisualization pipeline={PIPELINES[1]} />
          </div>
        </section>

        
        <AsyncSyncPanel />

        
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <DataTable<LatencyRow>
            title="Latency Class Reference"
            subtitle="Per-hop timing characteristics across the data pipeline"
            columns={[
              { key: 'component', label: 'Component' },
              { key: 'protocol',  label: 'Protocol/Mode' },
              {
                key: 'typical',
                label: 'Typical Latency',
                render: (row) => (
                  <span className="font-mono text-[11px] text-emerald-400/80">{row.typical}</span>
                ),
              },
              {
                key: 'max',
                label: 'Max Latency',
                render: (row) => (
                  <span className="font-mono text-[11px] text-amber-400/70">{row.max}</span>
                ),
              },
              {
                key: 'async',
                label: 'Async?',
                align: 'center',
                render: (row) => {
                  const isAsync = row.async.startsWith('Yes');
                  return (
                    <span className={`rounded px-2 py-px font-mono text-[9px] font-bold ${
                      isAsync ? 'bg-blue-500/15 text-blue-400' : 'bg-white/8 text-white/35'
                    }`}>
                      {row.async}
                    </span>
                  );
                },
              },
            ]}
            data={LATENCY_DATA}
          />
        </motion.div>

        
        <RetryQueueSection />

        
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-4 flex items-center gap-3">
            <MessageSquare size={13} className="text-amber-400/60" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
              MQTT Subscriber Pattern
            </h2>
          </div>
          <CodeBlock
            code={MQTT_SUBSCRIBER_CODE}
            language="python"
            title="rafiq/core/mqtt_subscriber.py"
          />
        </motion.div>

        
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <ArrowRight size={13} className="text-[#FF3B3B]/50" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
              Design Principles
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                title: 'Local First',
                desc: 'Every critical operation (emergency response, health writes, AI inference) runs without cloud. Cloud sync is additive, never critical path.',
                color: 'text-[#FF3B3B]',
              },
              {
                title: 'Deterministic Emergency',
                desc: 'Gas sensor → valve shutdown path is hardware-guaranteed at <5ms using GPIO. AI classification follows asynchronously.',
                color: 'text-amber-400',
              },
              {
                title: 'Bounded Latency',
                desc: 'AI inference is capped at 300ms by llama.cpp timeout. All UI interactions stay responsive via async task dispatch.',
                color: 'text-blue-400',
              },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <h4 className={`text-[12px] font-bold ${item.color}`}>{item.title}</h4>
                <p className="text-[11px] leading-relaxed text-white/35">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
