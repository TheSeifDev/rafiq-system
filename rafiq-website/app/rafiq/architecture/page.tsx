'use client';

import { motion } from 'framer-motion';
import { Network, Cpu, Cloud, Smartphone, Wifi, Shield, Database, Brain, Terminal } from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import StatusPulse from '@/src/features/rafiq/shared/components/StatusPulse';

const LAYERS = [
  {
    id: 'edge',
    label: 'EDGE LAYER',
    sublabel: 'Physical Sensors & Actuators',
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/[0.02]',
    labelColor: 'text-amber-400/60',
    glow: 'bg-amber-400/5',
    services: [
      { name: 'ESP32 Wearable',   icon: '⌚', status: 'online' as const },
      { name: 'RAQEEB MCU',       icon: '🛡', status: 'online' as const },
      { name: 'MQ Gas Sensors',   icon: '🔬', status: 'online' as const },
      { name: 'GPIO Relays',      icon: '⚡', status: 'online' as const },
      { name: 'Alarm Siren',      icon: '🔔', status: 'idle' as const },
    ],
  },
  {
    id: 'local',
    label: 'LOCAL LAYER',
    sublabel: 'MiniPC — Ubuntu 22.04 LTS',
    border: 'border-emerald-400/20',
    bg: 'bg-emerald-400/[0.02]',
    labelColor: 'text-emerald-400/60',
    glow: 'bg-emerald-400/5',
    services: [
      { name: 'RAFIQ Core (FastAPI)', icon: '⚙', status: 'online' as const },
      { name: 'SQLite + WAL',         icon: '💾', status: 'online' as const },
      { name: 'MQTT (Mosquitto)',      icon: '📡', status: 'online' as const },
      { name: 'Ollama AI',            icon: '🧠', status: 'online' as const },
      { name: 'Home Assistant',       icon: '🏠', status: 'online' as const },
      { name: 'Emergency Engine',     icon: '🚨', status: 'online' as const },
      { name: 'Sync Engine',          icon: '🔄', status: 'syncing' as const },
      { name: 'Voice Pipeline',       icon: '🎙', status: 'online' as const },
    ],
  },
  {
    id: 'application',
    label: 'APPLICATION LAYER',
    sublabel: 'User Interfaces',
    border: 'border-[#1E3A8A]/30',
    bg: 'bg-[#1E3A8A]/[0.02]',
    labelColor: 'text-blue-400/60',
    glow: 'bg-[#1E3A8A]/5',
    services: [
      { name: 'Mobile App (Flutter)', icon: '📱', status: 'online' as const },
      { name: 'Web Dashboard',        icon: '🖥', status: 'online' as const },
      { name: 'GUI Avatar',           icon: '🤖', status: 'online' as const },
      { name: 'Voice Interface',      icon: '🔊', status: 'online' as const },
    ],
  },
  {
    id: 'cloud',
    label: 'CLOUD LAYER',
    sublabel: 'Optional — Sync & Notifications',
    border: 'border-[#FF3B3B]/15',
    bg: 'bg-[#FF3B3B]/[0.01]',
    labelColor: 'text-[#FF3B3B]/50',
    glow: 'bg-[#FF3B3B]/4',
    services: [
      { name: 'Supabase PostgreSQL', icon: '☁', status: 'online' as const },
      { name: 'SMS Gateway',         icon: '📨', status: 'online' as const },
      { name: 'Push Notifications',  icon: '🔔', status: 'online' as const },
    ],
  },
];

const SERVICE_REGISTRY = [
  { service: 'RAFIQ Core',        layer: 'Local', protocol: 'HTTP/WS', port: '8000', owner: 'core-engine', critical: true },
  { service: 'MQTT Broker',       layer: 'Local', protocol: 'MQTT', port: '1883/8883', owner: 'mqtt-broker', critical: true },
  { service: 'Ollama AI',         layer: 'Local', protocol: 'HTTP', port: '11434', owner: 'ai-orchestrator', critical: false },
  { service: 'Home Assistant',    layer: 'Local', protocol: 'HTTP/WS', port: '8123', owner: 'ha-bridge', critical: false },
  { service: 'ESP32 Wearable',    layer: 'Edge', protocol: 'BLE', port: 'N/A', owner: 'ble-gateway', critical: true },
  { service: 'Raqeeb MCU',        layer: 'Edge', protocol: 'MQTT', port: 'N/A', owner: 'emergency-engine', critical: true },
  { service: 'Supabase',          layer: 'Cloud', protocol: 'HTTPS', port: '443', owner: 'sync-engine', critical: false },
  { service: 'SMS Gateway',       layer: 'Cloud', protocol: 'HTTPS', port: '443', owner: 'emergency-engine', critical: false },
];

const COMM_MATRIX = [
  { from: 'ESP32 Wearable',   to: 'BLE Gateway',     protocol: 'BLE 5.0',  direction: 'Push', async: true  },
  { from: 'BLE Gateway',      to: 'MQTT Broker',      protocol: 'MQTT',     direction: 'Pub',  async: true  },
  { from: 'Raqeeb MCU',       to: 'MQTT Broker',      protocol: 'MQTT',     direction: 'Pub',  async: true  },
  { from: 'MQTT Broker',      to: 'Core Engine',      protocol: 'MQTT Sub', direction: 'Push', async: true  },
  { from: 'Core Engine',      to: 'Ollama AI',        protocol: 'HTTP',     direction: 'Req/Resp', async: true  },
  { from: 'Core Engine',      to: 'Home Assistant',   protocol: 'WS/HTTP',  direction: 'Bidirectional', async: true  },
  { from: 'Core Engine',      to: 'SQLite',           protocol: 'SQL',      direction: 'R/W',  async: false },
  { from: 'Sync Engine',      to: 'Supabase',         protocol: 'HTTPS',    direction: 'Push/Pull', async: true  },
  { from: 'Mobile App',       to: 'Core Engine',      protocol: 'HTTP/WS',  direction: 'Req/Sub', async: false },
  { from: 'Emergency Engine', to: 'SMS Gateway',      protocol: 'HTTPS',    direction: 'Push', async: true  },
];

export default function ArchitecturePage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        <SectionHeader
          eyebrow="System Architecture"
          title="RAFIQ Architecture"
          description="Four-layer distributed architecture: edge sensors, local orchestration, application interfaces, and optional cloud sync. Edge-first design guarantees all safety-critical operations function without cloud or internet connectivity."
          status="online"
          layer="System Architecture"
          version="v2.1"
          metrics={[
            { label: 'Layers', value: '4' },
            { label: 'Services', value: '15+' },
            { label: 'Mode', value: 'Offline-first' },
          ]}
        />

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">System Topology</h2>
          <div className="space-y-3">
            {LAYERS.map((layer, li) => (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: li * 0.08, duration: 0.4 }}
                className={`relative overflow-hidden rounded-2xl border ${layer.border} ${layer.bg} p-5`}
              >
                
                <div className={`pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full ${layer.glow} blur-[40px]`} />

                
                <div className="mb-3 flex items-center gap-3">
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${layer.labelColor}`}>
                    {layer.label}
                  </span>
                  <span className="font-mono text-[9px] text-white/22">{layer.sublabel}</span>
                </div>

                
                <div className="flex flex-wrap gap-2">
                  {layer.services.map(svc => (
                    <div key={svc.name} className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                      <span className="text-[11px]">{svc.icon}</span>
                      <span className="font-mono text-[10px] text-white/55">{svc.name}</span>
                      <StatusPulse status={svc.status} size="xs" />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Service Registry</h2>
          <DataTable
            columns={[
              { key: 'service', label: 'Service', className: 'min-w-[160px]' },
              { key: 'layer', label: 'Layer' },
              { key: 'protocol', label: 'Protocol' },
              { key: 'port', label: 'Port', align: 'center' },
              { key: 'owner', label: 'Owner Service' },
              { key: 'critical', label: 'Critical', align: 'center', render: (row) => (
                row.critical
                  ? <span className="text-[#FF3B3B]/80 font-bold">YES</span>
                  : <span className="text-white/25">No</span>
              )},
            ]}
            data={SERVICE_REGISTRY}
          />
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Communication Matrix</h2>
          <DataTable
            columns={[
              { key: 'from', label: 'From', className: 'min-w-[140px]' },
              { key: 'to', label: 'To', className: 'min-w-[140px]' },
              { key: 'protocol', label: 'Protocol' },
              { key: 'direction', label: 'Direction' },
              { key: 'async', label: 'Async', align: 'center', render: (row) => (
                row.async
                  ? <span className="text-emerald-400/70">Yes</span>
                  : <span className="text-amber-400/70">No</span>
              )},
            ]}
            data={COMM_MATRIX}
            subtitle="All inter-service communication paths"
          />
        </div>

        
        <InfraPanel title="Edge-First Design Principles" glow="blue">
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3">
            {[
              { title: 'Safety Never Blocks', body: 'Emergency shutdown, valve control, and alarm activation happen at the ESP32/edge level with zero dependency on the MiniPC, AI, or cloud.' },
              { title: 'Local-First Data', body: 'All writes persist to SQLite immediately. Cloud sync is a background best-effort operation. The system remains fully functional without any internet.' },
              { title: 'Fail Gracefully', body: 'Each service has a defined fallback: AI fails → rules engine. Cloud fails → offline queue. BLE fails → cached vitals. Failure is expected and handled.' },
            ].map(p => (
              <div key={p.title}>
                <h3 className="mb-2 text-[12px] font-bold text-white">{p.title}</h3>
                <p className="text-[11px] leading-relaxed text-white/38">{p.body}</p>
              </div>
            ))}
          </div>
        </InfraPanel>

      </div>
    </div>
  );
}
