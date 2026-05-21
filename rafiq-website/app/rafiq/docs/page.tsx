'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, ArrowRight, Terminal, Code2, Cpu, Database, Zap, Shield, GitBranch, BookMarked, Wrench } from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';

const DOC_CATEGORIES = [
  { icon: <Zap size={15} strokeWidth={1.5} />, title: 'Setup & Installation', sublabel: 'Ubuntu · Python · SQLite · Mosquitto', description: 'Complete guide for setting up RAFIQ on a fresh Ubuntu 22.04 MiniPC, including all dependencies, environment, and first-run configuration.', tags: ['Ubuntu 22.04', 'Python 3.11', 'Ollama'], accent: 'red' as const },
  { icon: <Cpu size={15} strokeWidth={1.5} />, title: 'Core Architecture', sublabel: 'Services · Threading · Lifecycle', description: 'Deep-dive into the FastAPI core, service orchestration model, asyncio threading, and graceful startup/shutdown lifecycle.', tags: ['FastAPI', 'asyncio', 'systemd'], accent: 'blue' as const },
  { icon: <Code2 size={15} strokeWidth={1.5} />, title: 'API Reference', sublabel: 'REST · WebSocket · MQTT', description: 'Complete specification for all 12 REST endpoints, 6 WebSocket event types, and the full MQTT topic taxonomy with payload schemas.', tags: ['OpenAPI', 'Swagger', 'MQTT'], accent: 'red' as const },
  { icon: <Database size={15} strokeWidth={1.5} />, title: 'Database Guide', sublabel: 'SQLite · Supabase · Sync', description: 'SQLite schema setup, WAL configuration, Supabase project setup, RLS policies, and sync engine configuration guide.', tags: ['SQLite', 'Supabase', 'Alembic'], accent: 'blue' as const },
  { icon: <GitBranch size={15} strokeWidth={1.5} />, title: 'Deployment Guide', sublabel: 'systemd · Docker · Production', description: 'Step-by-step production deployment: systemd service files, environment variable management, log rotation, and health monitoring.', tags: ['systemd', 'logrotate', 'monit'], accent: 'red' as const },
  { icon: <Wrench size={15} strokeWidth={1.5} />, title: 'Troubleshooting', sublabel: 'Logs · Debug · Common Issues', description: 'Diagnostic guides for common failure modes: MQTT disconnects, AI timeouts, sync failures, and BLE pairing issues.', tags: ['journalctl', 'MQTT debug', 'strace'], accent: 'blue' as const },
  { icon: <Shield size={15} strokeWidth={1.5} />, title: 'Security Hardening', sublabel: 'TLS · JWT · Certificates', description: 'Production security guide: TLS certificate management, JWT key rotation, MQTT ACL setup, and Supabase RLS policy configuration.', tags: ['OpenSSL', 'Let\'s Encrypt', 'ACL'], accent: 'red' as const },
  { icon: <BookMarked size={15} strokeWidth={1.5} />, title: 'Contributing', sublabel: 'Dev setup · Testing · PRs', description: 'Guide for contributing to RAFIQ: local development setup, test suite, coding standards, and pull request process.', tags: ['pytest', 'mypy', 'pre-commit'], accent: 'blue' as const },
];

const INSTALL_SNIPPET = `# RAFIQ quick install (Ubuntu 22.04)
git clone https://github.com/phantoms/rafiq-core
cd rafiq-core

# Install Python 3.11 + dependencies
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Install Ollama + models
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull medgemma:4b
ollama pull qwen2.5:3b

# Install & configure MQTT
sudo apt install -y mosquitto mosquitto-clients
sudo cp config/mosquitto.conf /etc/mosquitto/conf.d/rafiq.conf

# Configure environment
cp .env.example .env && nano .env  # Fill in your secrets

# Initialize database & run migrations
python -m alembic upgrade head

# Start all services
sudo systemctl enable --now rafiq.service`;

const FIRST_API_CALL = `# Test your first API call
curl http://localhost:8000/api/v1/health

# Expected response
{
  "status": "online",
  "services": {
    "core":     "running",
    "mqtt":     "connected",
    "ai":       "ready",
    "sync":     "idle",
    "emergency":"armed"
  },
  "uptime_s": 142,
  "version":  "2.1.4"
}`;

const MQTT_TEST = `# Test MQTT connectivity
mosquitto_pub \\
  -h localhost \\
  -t rafiq/wearable/test-device/heartrate \\
  -m '{"bpm": 72, "device_id": "test-device"}' \\
  -q 1

# Subscribe to all RAFIQ events
mosquitto_sub -h localhost -t "rafiq/#" -v`;

const CHANGELOG = [
  {
    version: 'v2.1.0',
    date: '2024-11-01',
    highlights: [
      'Sync Engine rewrite — priority scheduler + vector clock conflict resolution',
      'MedGemma:4b upgrade — improved health analysis accuracy',
      'Emergency engine failsafe improvements — direct hardware fallback',
      'BLE gateway stability improvements for ESP32 reconnection',
    ],
  },
  {
    version: 'v2.0.0',
    date: '2024-09-15',
    highlights: [
      'Full offline support — all core features work without internet',
      'RAQEEB gas sensor integration — MQ-2/4/7/135 support',
      'ESP32 wearable BLE stack — GATT profile + fall detection',
      'Home Assistant bidirectional bridge via WebSocket API',
    ],
  },
  {
    version: 'v1.5.0',
    date: '2024-07-22',
    highlights: [
      'Supabase sync engine — bidirectional with retry queue',
      'Home Assistant MQTT bridge — initial integration',
      'Voice pipeline — Whisper STT + Piper TTS + wake word',
      'JWT authentication system with refresh tokens',
    ],
  },
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        <SectionHeader
          eyebrow="Documentation"
          title="RAFIQ Documentation"
          description="Comprehensive guides for setting up, deploying, and extending the RAFIQ AI Healthcare OS. Start with Quick Setup if you're new, or jump directly to the API Reference or Architecture guide."
          status="online"
          layer="Documentation"
          version="v2.1"
          metrics={[
            { label: 'Guides', value: '8' },
            { label: 'API Endpoints', value: '12+' },
            { label: 'Code Examples', value: '30+' },
          ]}
        />

        
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search documentation — setup, API, MQTT, sync, emergency..."
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] py-3.5 pl-10 pr-4 text-[13px] text-white/70 placeholder-white/20 outline-none transition-all focus:border-[#FF3B3B]/25 focus:ring-1 focus:ring-[#FF3B3B]/15"
          />
        </div>

        
        <InfraPanel title="Quick Start" subtitle="Get RAFIQ running in 10 minutes" glow="red">
          <div className="p-5">
            <ol className="space-y-3">
              {[
                { n: '01', label: 'Clone the repo', sub: 'git clone https://github.com/phantoms/rafiq-core' },
                { n: '02', label: 'Install dependencies', sub: 'Python 3.11, Ollama, Mosquitto, SQLite' },
                { n: '03', label: 'Configure environment', sub: 'Copy .env.example, fill in Supabase URL + JWT keys' },
                { n: '04', label: 'Run migrations', sub: 'python -m alembic upgrade head' },
                { n: '05', label: 'Start services', sub: 'sudo systemctl start rafiq.service' },
                { n: '06', label: 'Verify health', sub: 'curl localhost:8000/api/v1/health' },
              ].map(step => (
                <li key={step.n} className="flex items-start gap-4">
                  <span className="shrink-0 font-mono text-[11px] font-bold text-[#FF3B3B]/60">{step.n}</span>
                  <div>
                    <div className="text-[12px] font-bold text-white">{step.label}</div>
                    <div className="font-mono text-[10px] text-white/35">{step.sub}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </InfraPanel>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Full Install Script</h2>
            <CodeBlock code={INSTALL_SNIPPET} language="bash" title="install.sh" />
          </div>
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">First API Call</h2>
              <CodeBlock code={FIRST_API_CALL} language="bash" title="test_api.sh" />
            </div>
            <div>
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">MQTT Test</h2>
              <CodeBlock code={MQTT_TEST} language="bash" title="test_mqtt.sh" />
            </div>
          </div>
        </div>

        
        <div>
          <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Documentation Sections
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DOC_CATEGORIES.map((cat, i) => (
              <ArchCard key={cat.title} {...cat} delay={i * 0.04} />
            ))}
          </div>
        </div>

        
        <div>
          <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Changelog</h2>
          <div className="space-y-4">
            {CHANGELOG.map((entry, i) => (
              <motion.div
                key={entry.version}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]"
              >
                <div className="flex items-center gap-4 border-b border-white/[0.05] px-5 py-3">
                  <span className="font-mono text-[12px] font-black text-white">{entry.version}</span>
                  <span className="font-mono text-[10px] text-white/28">{entry.date}</span>
                  {i === 0 && (
                    <span className="ml-auto rounded bg-[#FF3B3B]/15 px-2 py-0.5 font-mono text-[9px] font-bold text-[#FF3B3B]/80">
                      LATEST
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5 p-5">
                  {entry.highlights.map(h => (
                    <li key={h} className="flex items-start gap-2">
                      <ArrowRight size={10} className="mt-0.5 shrink-0 text-[#FF3B3B]/40" />
                      <span className="text-[11px] text-white/50">{h}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
