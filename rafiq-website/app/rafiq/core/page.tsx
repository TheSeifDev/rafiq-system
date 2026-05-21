'use client';

import { motion } from 'framer-motion';
import {
  Cpu, Server, Brain, Database, Layers, GitBranch,
  Terminal, Zap, RefreshCw, Shield, Activity,
  Wifi, Clock, HardDrive, Code2,
} from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';

const SERVICES = [
  {
    icon: <Server size={16} strokeWidth={1.5} />,
    title: 'FastAPI Application Server',
    sublabel: 'Uvicorn · ASGI · async/await',
    description: 'Main HTTP and WebSocket server. Handles REST API, WebSocket connections, and event broadcasting. Runs on asyncio event loop with worker threads for CPU-bound AI tasks.',
    status: 'online' as const,
    metrics: [{ label: 'Avg latency', value: '<8ms' }, { label: 'Workers', value: '4' }, { label: 'Port', value: '8000' }],
    tags: ['Python 3.11', 'Uvicorn', 'ASGI', 'asyncio'],
    accent: 'red' as const,
  },
  {
    icon: <Database size={16} strokeWidth={1.5} />,
    title: 'SQLite + WAL Engine',
    sublabel: 'Write-Ahead Logging · Local-first',
    description: 'Primary local database with WAL mode for concurrent reads. Stores all patient data, events, AI logs, and sync queues. Zero network dependency for reads/writes.',
    status: 'online' as const,
    metrics: [{ label: 'WAL mode', value: 'ON' }, { label: 'Max size', value: '8GB' }, { label: 'Checkpt', value: '1000 pages' }],
    tags: ['SQLite 3.44', 'WAL', 'FTS5', 'JSON1'],
    accent: 'blue' as const,
  },
  {
    icon: <Wifi size={16} strokeWidth={1.5} />,
    title: 'MQTT Broker (Mosquitto)',
    sublabel: 'Eclipse Mosquitto · QoS 0/1/2',
    description: 'Central message bus for all sensor data, device commands, and event notifications. Runs locally on port 1883, supports retained messages and last-will-testament.',
    status: 'online' as const,
    metrics: [{ label: 'Clients', value: '3–8' }, { label: 'QoS', value: '0/1/2' }, { label: 'Port', value: '1883' }],
    tags: ['Mosquitto 2.0', 'TLS', 'Retained', 'LWT'],
    accent: 'red' as const,
  },
  {
    icon: <Activity size={16} strokeWidth={1.5} />,
    title: 'AI Decision Engine',
    sublabel: 'Ollama · MedGemma · Rule Engine',
    description: 'Orchestrates AI inference requests across local LLMs. Applies health rules, generates interventions, classifies emergencies, and manages conversational memory.',
    status: 'online' as const,
    metrics: [{ label: 'Avg latency', value: '160ms' }, { label: 'Models', value: '2 active' }, { label: 'Queue', value: 'async' }],
    tags: ['MedGemma:4b', 'Qwen2.5:3b', 'GGUF', 'llama.cpp'],
    accent: 'blue' as const,
  },
  {
    icon: <Zap size={16} strokeWidth={1.5} />,
    title: 'Emergency Engine',
    sublabel: 'Real-time · Local-only · Fail-secure',
    description: 'Standalone safety processing loop that never depends on cloud or AI. Evaluates raw sensor thresholds, triggers valve shutdowns, activates sirens, and sends emergency SMS.',
    status: 'online' as const,
    metrics: [{ label: 'Response', value: '<50ms' }, { label: 'Mode', value: 'local-only' }, { label: 'Priority', value: 'HIGHEST' }],
    tags: ['fail-secure', 'offline-capable', 'GPIO', 'SMS'],
    accent: 'red' as const,
  },
  {
    icon: <RefreshCw size={16} strokeWidth={1.5} />,
    title: 'Sync Engine',
    sublabel: 'SQLite ↔ Supabase · Retry Queue',
    description: 'Background service for bidirectional cloud synchronization. Maintains an offline queue when Supabase is unreachable, replays on reconnect with conflict resolution.',
    status: 'syncing' as const,
    metrics: [{ label: 'Interval', value: '30s' }, { label: 'Max retries', value: '5' }, { label: 'Strategy', value: 'LWW' }],
    tags: ['Last-Write-Wins', 'retry-queue', 'exponential-backoff'],
    accent: 'blue' as const,
  },
  {
    icon: <Shield size={16} strokeWidth={1.5} />,
    title: 'Home Assistant Bridge',
    sublabel: 'HA API · Automation · MQTT',
    description: 'Bidirectional bridge between RAFIQ core and Home Assistant. Subscribes to HA events via WebSocket API and publishes device commands through MQTT.',
    status: 'online' as const,
    metrics: [{ label: 'Automations', value: '14' }, { label: 'Devices', value: '22' }, { label: 'Protocol', value: 'WAMP' }],
    tags: ['Home Assistant', 'WAMP', 'Zigbee2MQTT', 'REST'],
    accent: 'red' as const,
  },
  {
    icon: <HardDrive size={16} strokeWidth={1.5} />,
    title: 'Local Cache Layer',
    sublabel: 'In-memory · TTL · LRU',
    description: 'High-speed in-memory cache for frequently accessed data: recent wearable readings, AI responses, device states, and authentication tokens. Python dict + TTL expiry.',
    status: 'online' as const,
    metrics: [{ label: 'Max entries', value: '10K' }, { label: 'TTL', value: '5–300s' }, { label: 'Eviction', value: 'LRU' }],
    tags: ['in-memory', 'TTL', 'LRU', 'thread-safe'],
    accent: 'blue' as const,
  },
];

const THREAD_MODEL = [
  { thread: 'Main Event Loop',      type: 'asyncio',      responsibility: 'HTTP, WebSocket, MQTT subscribe, coroutine scheduling' },
  { thread: 'AI Worker Pool',       type: 'ThreadPool',   responsibility: 'Ollama inference calls (blocking I/O, CPU-bound)' },
  { thread: 'Emergency Watchdog',   type: 'Thread',       responsibility: 'Sensor threshold polling — never blocked by async queue' },
  { thread: 'Sync Background Task', type: 'asyncio Task', responsibility: 'Supabase push/pull cycle every 30 seconds' },
  { thread: 'MQTT Publisher',       type: 'asyncio',      responsibility: 'Outbound MQTT messages to broker' },
  { thread: 'STT/TTS Pipeline',     type: 'Thread',       responsibility: 'Voice stream processing (Whisper, Piper TTS)' },
];

const STARTUP_SEQUENCE = `# RAFIQ Core startup sequence
async def startup():
    # 1. Initialize SQLite with WAL mode
    await db.connect(pragmas={"journal_mode": "WAL", "cache_size": -65536})
    
    # 2. Run Alembic migrations
    await run_migrations()
    
    # 3. Connect to MQTT broker
    await mqtt_client.connect(host="localhost", port=1883)
    await mqtt_client.subscribe("rafiq/#", qos=1)
    
    # 4. Start background services
    asyncio.create_task(sync_engine.run())
    asyncio.create_task(emergency_engine.run())
    asyncio.create_task(ai_orchestrator.warmup())
    
    # 5. Initialize Home Assistant bridge
    await ha_bridge.connect(token=settings.HA_TOKEN)
    
    # 6. Ready signal
    logger.info("RAFIQ Core online — all services initialized")`;

const LIFECYCLE = `# Graceful shutdown sequence
@app.on_event("shutdown")
async def shutdown():
    # 1. Stop accepting new requests
    # 2. Complete in-flight AI requests (max 5s timeout)
    await asyncio.wait_for(ai_orchestrator.drain(), timeout=5.0)
    
    # 3. Flush sync queue to disk
    await sync_engine.flush_to_disk()
    
    # 4. Close MQTT cleanly (send LWT disconnect)
    await mqtt_client.disconnect(reasoncode=0)
    
    # 5. Checkpoint SQLite WAL
    await db.execute("PRAGMA wal_checkpoint(FULL)")
    await db.disconnect()
    
    logger.info("RAFIQ Core shutdown complete")`;

export default function CorePage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        
        <SectionHeader
          eyebrow="Core Infrastructure"
          title="RAFIQ Core Engine"
          description="The central orchestration layer running on Ubuntu Server. Manages all services, event loops, threading models, offline execution, and system lifecycle — independently of any cloud connectivity."
          status="online"
          layer="Local Layer"
          version="v2.1.4"
          metrics={[
            { label: 'Uptime', value: '99.8%' },
            { label: 'Latency', value: '< 8ms' },
            { label: 'Services', value: '8 active' },
          ]}
        />

        
        <InfraPanel title="Host Hardware" subtitle="MiniPC · Ubuntu 22.04 LTS" glow="red">
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            {[
              { label: 'Platform', value: 'MiniPC / RPi 5' },
              { label: 'OS', value: 'Ubuntu 22.04 LTS' },
              { label: 'RAM', value: '8 GB DDR4' },
              { label: 'Storage', value: '256 GB NVMe' },
              { label: 'CPU', value: '4–8 cores x86/ARM' },
              { label: 'Runtime', value: 'Python 3.11' },
              { label: 'Network', value: 'Ethernet + WiFi' },
              { label: 'GPU', value: 'CPU inference only' },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/22">
                  {item.label}
                </span>
                <span className="font-mono text-[11px] text-white/60">{item.value}</span>
              </div>
            ))}
          </div>
        </InfraPanel>

        
        <div>
          <div className="mb-6 flex items-center gap-3">
            <Code2 size={13} className="text-white/30" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              Core Services · {SERVICES.length} components
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SERVICES.map((s, i) => (
              <ArchCard key={s.title} {...s} delay={i * 0.04} />
            ))}
          </div>
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Threading Model
          </h2>
          <DataTable
            columns={[
              { key: 'thread', label: 'Thread / Task', className: 'min-w-[160px]' },
              { key: 'type', label: 'Type' },
              { key: 'responsibility', label: 'Responsibility' },
            ]}
            data={THREAD_MODEL}
            subtitle="Python asyncio event loop + OS threads for blocking operations"
          />
        </div>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              Startup Sequence
            </h2>
            <CodeBlock
              code={STARTUP_SEQUENCE}
              language="python"
              title="core/main.py"
            />
          </div>
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              Shutdown Lifecycle
            </h2>
            <CodeBlock
              code={LIFECYCLE}
              language="python"
              title="core/main.py"
            />
          </div>
        </div>

        
        <InfraPanel title="Offline Operation Model" subtitle="Always-on · Cloud-optional" glow="blue">
          <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-3">
            {[
              {
                icon: <HardDrive size={16} className="text-emerald-400" />,
                title: 'Local-first Storage',
                body: 'All writes go to SQLite first. Supabase sync is a background best-effort operation. No write is ever lost due to network failure.',
              },
              {
                icon: <Brain size={16} className="text-blue-400" />,
                title: 'Local AI Inference',
                body: 'Ollama runs entirely on-device. AI reasoning, health analysis, and emergency classification work without any internet connection.',
              },
              {
                icon: <Zap size={16} className="text-amber-400" />,
                title: 'Emergency Independence',
                body: 'Emergency engine operates on raw sensor data with zero AI/cloud dependency. Gas valve control, sirens, SMS — all fully local.',
              },
            ].map(item => (
              <div key={item.title} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <h3 className="text-[12px] font-bold text-white">{item.title}</h3>
                </div>
                <p className="text-[11px] leading-relaxed text-white/40">{item.body}</p>
              </div>
            ))}
          </div>
        </InfraPanel>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Failover State Machine
          </h2>
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-0">
              {[
                { label: 'NORMAL',        color: 'bg-emerald-400/15 border-emerald-400/25 text-emerald-400' },
                { label: '→ NET FAIL',    color: 'bg-white/5 border-white/10 text-white/30', small: true },
                { label: 'OFFLINE MODE',  color: 'bg-amber-400/15 border-amber-400/25 text-amber-400' },
                { label: '→ AI FAIL',     color: 'bg-white/5 border-white/10 text-white/30', small: true },
                { label: 'RULES ENGINE',  color: 'bg-[#FF3B3B]/15 border-[#FF3B3B]/25 text-[#FF3B3B]' },
                { label: '→ EMERGENCY',   color: 'bg-white/5 border-white/10 text-white/30', small: true },
                { label: 'SAFE SHUTDOWN', color: 'bg-red-900/30 border-red-500/30 text-red-400' },
              ].map((state, i) => (
                <motion.div
                  key={state.label}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className={[
                    'rounded-xl border px-3 py-2.5 font-mono font-bold whitespace-nowrap',
                    state.small ? 'text-[9px] border-0 bg-transparent px-1.5' : 'text-[10px]',
                    state.color,
                  ].join(' ')}
                >
                  {state.label}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
