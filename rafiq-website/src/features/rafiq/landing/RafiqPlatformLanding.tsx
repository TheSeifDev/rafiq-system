'use client';

import Link from 'next/link';
import { motion, AnimatePresence, LazyMotion, domAnimation, useReducedMotion, MotionConfig } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Blinds,
  Bot,
  Brain,
  ChevronRight,
  CircuitBoard,
  Cloud,
  Code2,
  Cpu,
  Database,
  Flame,
  Gauge,
  GitBranch,
  Home,
  Layers3,
  Lightbulb,
  Lock,
  MessageSquare,
  Mic,
  Network,
  RadioTower,
  RefreshCw,
  Router,
  Server,
  Shield,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Terminal,
  Volume2,
  Watch,
  Wifi,
  Zap,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

// Import type-safe Ecosystem filters config
import { ECOSYSTEM_FILTERS, isNodeActive, isConnectionActive } from '../ecosystem/config/filters';
import type { EcosystemFilter } from '../ecosystem/config/filters';

type Accent = 'red' | 'blue' | 'emerald' | 'amber' | 'white';

interface IdentityCard {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  kicker: string;
  description: string;
  status: string;
  signal: string;
  capabilities: string[];
  accent: Accent;
}

interface PlatformLayer {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  description: string;
  signal: string;
  accent: Accent;
  telemetry: {
    status: string;
    subtext: string;
    stats: string[];
  };
}

interface EcosystemNode {
  id: string;
  label: string;
  sublabel: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  x: number;
  y: number;
  group: string;
  detail: string;
  accent: Accent;
}

interface EcosystemConnection {
  from: string;
  to: string;
  tone: 'red' | 'blue' | 'emerald' | 'amber' | 'white';
  label?: string;
  optional?: boolean;
}

interface PreviewCard {
  title: string;
  href: string;
  description: string;
  status: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  accent: Accent;
  gridClass?: string;
  coordinate?: string;
  diagnostic?: string;
}

const IDENTITY_CARDS: IdentityCard[] = [
  {
    icon: Brain,
    title: 'RAFIQ AI',
    kicker: 'Decision layer',
    description: 'AI intelligence, routing, risk reasoning, and response generation.',
    status: 'Adaptive',
    signal: 'MedGemma / Qwen / Cloud',
    capabilities: ['AI router', 'classification', 'memory'],
    accent: 'red',
  },
  {
    icon: Smartphone,
    title: 'RAFIQ App',
    kicker: 'Cross-device access',
    description: 'Realtime control surface for family, alerts, cloud state, and sync.',
    status: 'Realtime',
    signal: 'WebSocket / APIs',
    capabilities: ['alerts', 'watch', 'automation'],
    accent: 'blue',
  },
  {
    icon: Bot,
    title: 'RAFIQ GUI',
    kicker: 'Emotional interface',
    description: 'Avatar, voice output, system state, and human-readable feedback.',
    status: 'Present',
    signal: 'Avatar / Voice',
    capabilities: ['emotion', 'TTS', 'feedback'],
    accent: 'emerald',
  },
  {
    icon: Router,
    title: 'RAFIQ Backend',
    kicker: 'API orchestration',
    description: 'FastAPI, event contracts, device routing, and sync boundaries.',
    status: 'Routed',
    signal: 'REST / WS / MQTT',
    capabilities: ['APIs', 'events', 'sync'],
    accent: 'blue',
  },
  {
    icon: Cpu,
    title: 'RAFIQ Core',
    kicker: 'Offline infrastructure',
    description: 'MiniPC runtime, Ubuntu services, event engine, and local failover.',
    status: 'Local-first',
    signal: 'MiniPC / Ubuntu',
    capabilities: ['event engine', 'MQTT', 'SQLite'],
    accent: 'red',
  },
  {
    icon: ShieldAlert,
    title: 'RAQEEB',
    kicker: 'Independent safety',
    description: 'ESP32 emergency system for gas, valves, windows, siren, and alerts.',
    status: 'Autonomous',
    signal: 'Works without core',
    capabilities: ['gas logic', 'valves', 'siren'],
    accent: 'amber',
  },
  {
    icon: Home,
    title: 'Smart Infrastructure',
    kicker: 'Home + sensors',
    description: 'Automation mesh for devices, routines, environmental state, and safety.',
    status: 'Connected',
    signal: 'HA / Zigbee / MQTT',
    capabilities: ['lights', 'AC', 'valves'],
    accent: 'white',
  },
];

const UPGRADED_PLATFORM_LAYERS: PlatformLayer[] = [
  {
    icon: Brain,
    label: 'AI Layer',
    description: 'Local LLM routing, anomaly interpretation, voice command understanding, and patient-aware clinical reasoning.',
    signal: 'Inference',
    accent: 'red',
    telemetry: {
      status: 'Inference Ingest',
      subtext: 'Ollama MedGemma v2',
      stats: ['Model: MedGemma', 'Ctx: 8k Tokens', 'Latency: 142ms'],
    },
  },
  {
    icon: Cpu,
    label: 'Core Layer',
    description: 'MiniPC offline primary computing host running custom Ubuntu daemons, sqlite database scheduling, and local router loops.',
    signal: 'Runtime',
    accent: 'red',
    telemetry: {
      status: 'Local first runtime',
      subtext: 'Ubuntu OS Daemon',
      stats: ['CPU load: 12.4%', 'Engine: Go Engine', 'Uptime: 24d 6h'],
    },
  },
  {
    icon: Router,
    label: 'Backend Layer',
    description: 'FastAPI core orchestration microservices, WebSocket connection gateways, event contracts, and service boundary routes.',
    signal: 'Control',
    accent: 'blue',
    telemetry: {
      status: 'Gateway Active',
      subtext: 'FastAPI / WebSocket',
      stats: ['Ping: 2.1ms', 'Channels: 8 Active', 'Queue: 0 Tasks'],
    },
  },
  {
    icon: Zap,
    label: 'Automation Layer',
    description: 'Local rule execution engine, safety workflows, escalation ladders, and Home Assistant Zigbee/MQTT routines.',
    signal: 'Action',
    accent: 'emerald',
    telemetry: {
      status: 'Broker Sync',
      subtext: 'Home Assistant Core',
      stats: ['Devices: 34 Online', 'Routines: 12 Active', 'Bus: MQTT v5'],
    },
  },
  {
    icon: Shield,
    label: 'Safety Layer',
    description: 'Autonomous emergency hardware triggers, independent RAQEEB gas overrides, and direct physical alerts.',
    signal: 'Protection',
    accent: 'amber',
    telemetry: {
      status: 'Shield Active',
      subtext: 'Safety Override MCU',
      stats: ['Priority: Level 0', 'Failover: Hardware', 'Override: Enabled'],
    },
  },
  {
    icon: Watch,
    label: 'Wearable Layer',
    description: 'ESP32 watch telemetry ingestion, BLE transport channels, heart rate metrics, and fall sensor diagnostics.',
    signal: 'Vitals',
    accent: 'red',
    telemetry: {
      status: 'BLE Connected',
      subtext: 'ESP32 Smart MCU',
      stats: ['BPM: 72 (Normal)', 'RSSI: -64dBm', 'BLE Bandwidth: 112kb/s'],
    },
  },
  {
    icon: Bot,
    label: 'GUI Layer',
    description: 'Avatar animation state machine, text-to-speech voice pipeline, system presence display, and responsive audio.',
    signal: 'Presence',
    accent: 'white',
    telemetry: {
      status: 'Speech Ingest',
      subtext: 'Avatar Render Loop',
      stats: ['FPS: 60 (WebGL)', 'Audio: Piper Local', 'Expression: Calm'],
    },
  },
  {
    icon: Cloud,
    label: 'Cloud Layer',
    description: 'Best-effort Supabase synchronization replication queues, remote notification pipelines, and transaction buffering.',
    signal: 'Continuity',
    accent: 'blue',
    telemetry: {
      status: 'Best effort Sync',
      subtext: 'Supabase Replica',
      stats: ['Sync Lag: 1.1s', 'Buffer: 0 Pending', 'Security: TLS v1.3'],
    },
  },
];

const ECOSYSTEM_NODES: EcosystemNode[] = [
  { id: 'sensors', label: 'Sensors', sublabel: 'BLE / gas / smart devices', icon: RadioTower, x: 90, y: 305, group: 'edge', detail: 'Physical telemetry and control inputs enter RAFIQ from wearable, gas, and home devices.', accent: 'blue' },
  { id: 'edge', label: 'ESP32 Edge', sublabel: 'wearable + device MCUs', icon: Cpu, x: 245, y: 305, group: 'edge', detail: 'Edge devices normalize sensor readings and publish events without relying on the cloud.', accent: 'amber' },
  { id: 'mqtt', label: 'MQTT Broker', sublabel: 'Mosquitto message bus', icon: MessageSquare, x: 400, y: 305, group: 'local', detail: 'The broker routes telemetry, device control, emergency topics, and retained state.', accent: 'emerald' },
  { id: 'core', label: 'RAFIQ Core', sublabel: 'MiniPC / Ubuntu / event engine', icon: CircuitBoard, x: 570, y: 305, group: 'local', detail: 'The local operating core persists, routes, classifies, syncs, and dispatches actions.', accent: 'red' },
  { id: 'router', label: 'Core Routing', sublabel: 'events / priorities / policies', icon: GitBranch, x: 735, y: 305, group: 'local', detail: 'Core routing splits traffic into AI, voice, GUI, automation, sync, and alert paths.', accent: 'white' },

  { id: 'ai-router', label: 'AI Router', sublabel: 'internet-aware routing', icon: Brain, x: 810, y: 105, group: 'ai', detail: 'Selects offline, online, or hybrid models based on availability and latency budget.', accent: 'red' },
  { id: 'offline-ai', label: 'Offline AI', sublabel: 'Ollama / MedGemma / Qwen', icon: Server, x: 1030, y: 35, group: 'ai', detail: 'Local inference remains available when the internet is gone.', accent: 'red' },
  { id: 'online-ai', label: 'Online AI', sublabel: 'cloud APIs', icon: Cloud, x: 1030, y: 125, group: 'ai', detail: 'Cloud fallback is used for complex requests when connectivity allows it.', accent: 'blue' },
  { id: 'hybrid-ai', label: 'Hybrid AI', sublabel: 'local + cloud arbitration', icon: Layers3, x: 1030, y: 215, group: 'ai', detail: 'Hybrid mode balances latency, confidence, and local safety constraints.', accent: 'white' },
  { id: 'analysis', label: 'AI Analysis', sublabel: 'context + vitals + intent', icon: Activity, x: 1040, y: 310, group: 'ai', detail: 'AI analysis merges patient context, live telemetry, and voice intent.', accent: 'red' },
  { id: 'decision', label: 'Decision Engine', sublabel: 'rules + AI judgement', icon: Shield, x: 1010, y: 410, group: 'ai', detail: 'The decision layer converts analysis into actions and escalation levels.', accent: 'amber' },
  { id: 'classification', label: 'Classification', sublabel: 'risk / health / emergency', icon: Gauge, x: 850, y: 440, group: 'ai', detail: 'Classifies the outcome into normal, warning, risk, health, or emergency states.', accent: 'red' },
  { id: 'memory', label: 'AI Memory', sublabel: 'patient context', icon: Database, x: 840, y: 555, group: 'ai', detail: 'Long-term patient memory and recent reasoning are stored for future context.', accent: 'blue' },
  { id: 'response', label: 'AI Response', sublabel: 'actionable output', icon: Sparkles, x: 665, y: 520, group: 'ai', detail: 'The response layer publishes instructions to GUI, app, automation, and alerts.', accent: 'white' },

  { id: 'stt', label: 'STT', sublabel: 'Whisper command input', icon: Mic, x: 370, y: 80, group: 'voice', detail: 'Speech-to-text turns user voice into structured intent for the AI layer.', accent: 'blue' },
  { id: 'understanding', label: 'Understanding', sublabel: 'intent + context', icon: Brain, x: 535, y: 80, group: 'voice', detail: 'Voice intent is grounded in patient context before reaching the decision layer.', accent: 'red' },
  { id: 'tts', label: 'TTS', sublabel: 'Piper voice output', icon: Volume2, x: 500, y: 560, group: 'voice', detail: 'Text-to-speech converts RAFIQ responses into audible guidance.', accent: 'emerald' },
  { id: 'gui', label: 'GUI', sublabel: 'system interface', icon: Bot, x: 330, y: 560, group: 'interface', detail: 'The GUI is fed by AI response, TTS, avatar state, and live system events.', accent: 'white' },
  { id: 'avatar', label: 'Avatar', sublabel: 'visual presence', icon: Bot, x: 175, y: 520, group: 'interface', detail: 'Avatar rendering shows the current speaking, listening, thinking, or alert mode.', accent: 'white' },
  { id: 'emotion', label: 'Emotional State', sublabel: 'calm / alert / emergency', icon: Activity, x: 95, y: 420, group: 'interface', detail: 'Emotional state transforms AI classification into a readable human-facing posture.', accent: 'red' },
  { id: 'feedback', label: 'User Feedback', sublabel: 'voice + visual response', icon: Volume2, x: 185, y: 80, group: 'interface', detail: 'Feedback returns to the user through voice, avatar, app, and visible state.', accent: 'emerald' },

  { id: 'ha', label: 'Home Assistant', sublabel: 'local automation core', icon: Home, x: 520, y: 700, group: 'home', detail: 'Home Assistant owns local routines, automations, and device service calls.', accent: 'emerald' },
  { id: 'devices', label: 'Home Devices', sublabel: 'lights / AC / TV / curtains / alarms / valves', icon: Lightbulb, x: 285, y: 690, group: 'home', detail: 'Automation controls lights, AC, TV, curtains, alarms, valves, and environmental devices.', accent: 'emerald' },
  { id: 'sqlite', label: 'SQLite', sublabel: 'local database', icon: Database, x: 640, y: 690, group: 'sync', detail: 'All writes commit locally first; SQLite is the primary source during offline operation.', accent: 'white' },
  { id: 'sync-queue', label: 'Sync Queue', sublabel: 'push / pull / retry', icon: RefreshCw, x: 815, y: 690, group: 'sync', detail: 'The queue persists outbound changes and drains when Supabase is reachable.', accent: 'amber' },
  { id: 'supabase', label: 'Supabase', sublabel: 'cloud replica', icon: Cloud, x: 985, y: 690, group: 'cloud', detail: 'Supabase mirrors critical tables, enables remote access, and feeds realtime app state.', accent: 'blue' },
  { id: 'app', label: 'RAFIQ App', sublabel: 'everything-connected client', icon: Smartphone, x: 1125, y: 525, group: 'app', detail: 'The app subscribes to AI, core, alerts, GUI, watch, automation, emergency, and sync state.', accent: 'white' },

  { id: 'mq-sensors', label: 'MQ Sensors', sublabel: 'gas array', icon: Flame, x: 65, y: 650, group: 'raqeeb', detail: 'RAQEEB starts at the gas sensor array and does not need the MiniPC to act.', accent: 'amber' },
  { id: 'raqeeb-logic', label: 'Local Logic', sublabel: 'ESP32 threshold engine', icon: ShieldAlert, x: 65, y: 735, group: 'raqeeb', detail: 'Local firmware evaluates thresholds and escalates without cloud or core dependency.', accent: 'red' },
  { id: 'valve', label: 'Valve Shutdown', sublabel: 'GPIO relay', icon: Zap, x: 225, y: 805, group: 'raqeeb', detail: 'Gas valves close through hardware relay control.', accent: 'red' },
  { id: 'window-open', label: 'Window Open', sublabel: 'ventilation', icon: Blinds, x: 405, y: 805, group: 'raqeeb', detail: 'Ventilation actions open windows or curtains through local automation.', accent: 'emerald' },
  { id: 'siren', label: 'Siren', sublabel: 'audible alarm', icon: Bell, x: 585, y: 805, group: 'raqeeb', detail: 'Siren activation is a local safety action, not a cloud notification.', accent: 'red' },
  { id: 'emergency-alert', label: 'Emergency Alert', sublabel: 'SMS / app / retained event', icon: AlertTriangle, x: 765, y: 805, group: 'raqeeb', detail: 'Emergency alerts can notify users and optionally publish into RAFIQ Core.', accent: 'red' },
];

const ECOSYSTEM_CONNECTIONS: EcosystemConnection[] = [
  { from: 'sensors', to: 'edge', tone: 'blue', label: 'BLE / ADC / Zigbee' },
  { from: 'edge', to: 'mqtt', tone: 'emerald', label: 'MQTT publish' },
  { from: 'mqtt', to: 'core', tone: 'emerald', label: 'subscribe / event ingest' },
  { from: 'core', to: 'router', tone: 'red', label: 'event routing' },
  { from: 'router', to: 'ai-router', tone: 'red' },
  { from: 'ai-router', to: 'offline-ai', tone: 'red', label: 'offline' },
  { from: 'ai-router', to: 'online-ai', tone: 'blue', label: 'online' },
  { from: 'ai-router', to: 'hybrid-ai', tone: 'white', label: 'hybrid' },
  { from: 'offline-ai', to: 'analysis', tone: 'red' },
  { from: 'online-ai', to: 'analysis', tone: 'blue' },
  { from: 'hybrid-ai', to: 'analysis', tone: 'white' },
  { from: 'analysis', to: 'decision', tone: 'red' },
  { from: 'decision', to: 'classification', tone: 'amber' },
  { from: 'classification', to: 'memory', tone: 'blue' },
  { from: 'memory', to: 'response', tone: 'blue' },
  { from: 'response', to: 'gui', tone: 'white' },
  { from: 'stt', to: 'understanding', tone: 'blue', label: 'voice intent' },
  { from: 'understanding', to: 'decision', tone: 'red' },
  { from: 'response', to: 'tts', tone: 'emerald' },
  { from: 'tts', to: 'gui', tone: 'emerald' },
  { from: 'gui', to: 'avatar', tone: 'white' },
  { from: 'avatar', to: 'emotion', tone: 'red' },
  { from: 'emotion', to: 'feedback', tone: 'emerald' },
  { from: 'router', to: 'mqtt', tone: 'emerald', label: 'device commands' },
  { from: 'mqtt', to: 'ha', tone: 'emerald' },
  { from: 'ha', to: 'devices', tone: 'emerald' },
  { from: 'core', to: 'sqlite', tone: 'white' },
  { from: 'sqlite', to: 'sync-queue', tone: 'amber', label: 'enqueue' },
  { from: 'sync-queue', to: 'supabase', tone: 'blue', label: 'push / pull / retry' },
  { from: 'supabase', to: 'app', tone: 'blue', label: 'realtime' },
  { from: 'app', to: 'core', tone: 'white', label: 'APIs / WebSocket' },
  { from: 'app', to: 'response', tone: 'white', optional: true },
  { from: 'app', to: 'gui', tone: 'white', optional: true },
  { from: 'app', to: 'sensors', tone: 'blue', optional: true },
  { from: 'app', to: 'ha', tone: 'emerald', optional: true },
  { from: 'app', to: 'emergency-alert', tone: 'red', optional: true },
  { from: 'mq-sensors', to: 'raqeeb-logic', tone: 'amber' },
  { from: 'raqeeb-logic', to: 'valve', tone: 'red' },
  { from: 'valve', to: 'window-open', tone: 'emerald' },
  { from: 'window-open', to: 'siren', tone: 'red' },
  { from: 'siren', to: 'emergency-alert', tone: 'red' },
  { from: 'emergency-alert', to: 'mqtt', tone: 'red', label: 'optional notify', optional: true },
];

const PREVIEW_CARDS: PreviewCard[] = [
  {
    title: 'AI',
    href: '/rafiq/ai',
    description: 'Local model stack, voice pipeline, anomaly reasoning, and emotional states.',
    status: 'Local inference',
    icon: Brain,
    accent: 'red',
    gridClass: 'lg:col-span-2 lg:row-span-2 md:col-span-2',
    coordinate: '[SYS-AI-01]',
    diagnostic: 'SYS_INFERENCE: ACTIVE',
  },
  {
    title: 'Backend',
    href: '/rafiq/core',
    description: 'Core orchestration, runtime services, threading, and local execution model.',
    status: 'Runtime core',
    icon: Cpu,
    accent: 'blue',
    gridClass: 'lg:col-span-2 lg:row-span-1 md:col-span-2',
    coordinate: '[SYS-CORE-02]',
    diagnostic: 'CORE_DAEMON: NOMINAL',
  },
  {
    title: 'Database',
    href: '/rafiq/database',
    description: 'SQLite-first storage, Supabase replica, schema ownership, and access matrix.',
    status: 'Offline-first',
    icon: Database,
    accent: 'emerald',
    gridClass: 'lg:col-span-1 md:col-span-1',
    coordinate: '[SYS-DB-03]',
    diagnostic: 'DB_POOL: 12_CONN',
  },
  {
    title: 'Data Flow',
    href: '/rafiq/data-flow',
    description: 'Sensor-to-AI-to-cloud paths, emergency pipelines, and latency budgets.',
    status: 'Pipeline map',
    icon: GitBranch,
    accent: 'blue',
    gridClass: 'lg:col-span-1 md:col-span-1',
    coordinate: '[SYS-FLOW-04]',
    diagnostic: 'BUS_RATE: 1.2MB/S',
  },
  {
    title: 'Emulator',
    href: '/rafiq/emulator',
    description: 'Dedicated simulation page for scenario playback and controlled system event demos.',
    status: 'Separate page',
    icon: Terminal,
    accent: 'red',
    gridClass: 'lg:col-span-2 lg:row-span-2 md:col-span-2',
    coordinate: '[SYS-EMU-05]',
    diagnostic: 'SANDBOX: ACTIVE',
  },
  {
    title: 'Smart Home',
    href: '/rafiq/smart-home',
    description: 'Home Assistant, MQTT automations, devices, routines, and emergency overrides.',
    status: 'Automation mesh',
    icon: Home,
    accent: 'emerald',
    gridClass: 'lg:col-span-1 md:col-span-1',
    coordinate: '[SYS-HOME-06]',
    diagnostic: 'HA_BRIDGE: ONLINE',
  },
  {
    title: 'Wearable',
    href: '/rafiq/wearable',
    description: 'ESP32 watch, biometric sensors, BLE transport, and patient telemetry.',
    status: 'Edge sensor',
    icon: Watch,
    accent: 'amber',
    gridClass: 'lg:col-span-1 md:col-span-1',
    coordinate: '[SYS-WEAR-07]',
    diagnostic: 'BLE_VITAL: SYNCING',
  },
  {
    title: 'GUI',
    href: '/rafiq/gui',
    description: 'Avatar state machine, voice synchronization, and visible AI presence.',
    status: 'Interface layer',
    icon: Bot,
    accent: 'white',
    gridClass: 'lg:col-span-1 md:col-span-1',
    coordinate: '[SYS-GUI-08]',
    diagnostic: 'RENDER_THREAD: 60FPS',
  },
  {
    title: 'Security',
    href: '/rafiq/security',
    description: 'Trust boundaries, encryption, JWT, device access, and local threat model.',
    status: 'Protected edge',
    icon: Lock,
    accent: 'red',
    gridClass: 'lg:col-span-1 md:col-span-1',
    coordinate: '[SYS-SEC-09]',
    diagnostic: 'JWT_ENC: COMPLIANT',
  },
  {
    title: 'Raqeeb',
    href: '/rafiq/raqeeb',
    description: 'Gas detection hardware, valve control, alarms, and independent safety logic.',
    status: 'Safety MCU',
    icon: ShieldAlert,
    accent: 'amber',
    gridClass: 'lg:col-span-1 md:col-span-1',
    coordinate: '[SYS-RAQ-10]',
    diagnostic: 'EMERGENCY_BUS: STBY',
  },
  {
    title: 'Architecture',
    href: '/rafiq/architecture',
    description: 'System topology, service registry, layer ownership, and communication matrix.',
    status: 'System graph',
    icon: Network,
    accent: 'blue',
    gridClass: 'lg:col-span-2 lg:row-span-1 md:col-span-2',
    coordinate: '[SYS-ARCH-11]',
    diagnostic: 'GRAPH_ENGINE: SYNCED',
  },
  {
    title: 'APIs',
    href: '/rafiq/apis',
    description: 'REST, WebSocket, MQTT topics, gateway behavior, and payload schemas.',
    status: 'Contracts',
    icon: Code2,
    accent: 'emerald',
    gridClass: 'lg:col-span-1 md:col-span-1',
    coordinate: '[SYS-API-12]',
    diagnostic: 'CONTRACTS: VERIFIED',
  },
];

const accentStyles: Record<
  Accent,
  {
    icon: string;
    border: string;
    bg: string;
    text: string;
    glow: string;
    line: string;
  }
> = {
  red: {
    icon: 'text-[#FF3B3B]',
    border: 'border-[#FF3B3B]/22',
    bg: 'bg-[#FF3B3B]/8',
    text: 'text-[#FF3B3B]/75',
    glow: 'shadow-[0_0_35px_rgba(255,59,59,0.08)]',
    line: 'bg-[#FF3B3B]/55',
  },
  blue: {
    icon: 'text-blue-400',
    border: 'border-blue-400/18',
    bg: 'bg-blue-400/8',
    text: 'text-blue-400/70',
    glow: 'shadow-[0_0_35px_rgba(96,165,250,0.055)]',
    line: 'bg-blue-400/45',
  },
  emerald: {
    icon: 'text-emerald-400',
    border: 'border-emerald-400/18',
    bg: 'bg-emerald-400/8',
    text: 'text-emerald-400/70',
    glow: 'shadow-[0_0_35px_rgba(52,211,153,0.045)]',
    line: 'bg-emerald-400/45',
  },
  amber: {
    icon: 'text-amber-400',
    border: 'border-amber-400/18',
    bg: 'bg-amber-400/8',
    text: 'text-amber-400/70',
    glow: 'shadow-[0_0_35px_rgba(251,191,36,0.045)]',
    line: 'bg-amber-400/45',
  },
  white: {
    icon: 'text-white/80',
    border: 'border-white/12',
    bg: 'bg-white/6',
    text: 'text-white/55',
    glow: 'shadow-[0_0_35px_rgba(255,255,255,0.035)]',
    line: 'bg-white/35',
  },
};

const reveal = {
  initial: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

function SectionShell({
  eyebrow,
  title,
  description,
  children,
  className = '',
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative px-5 py-16 sm:px-8 lg:py-24 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <motion.div {...reveal} className="mb-9 max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[#FF3B3B]/70">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/45 sm:text-base">{description}</p>
        </motion.div>

        {children}
      </div>
    </section>
  );
}

function GlassPanel({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={[
        'relative overflow-hidden rounded-2xl border border-white/[0.08]',
        'bg-white/[0.025] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl',
        className,
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
}

function HeroTopology() {
  const shouldReduceMotion = useReducedMotion();

  const pulseAnimation = shouldReduceMotion
    ? undefined
    : {
        opacity: [0.18, 0.55, 0.18],
        scale: [0.98, 1.02, 0.98],
      };

  return (
    <GlassPanel className="min-h-[470px] p-5 sm:p-7 lg:min-h-[600px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 72%)',
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-10 rounded-[2rem] border border-[#FF3B3B]/10"
        animate={pulseAnimation}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative flex h-full min-h-[430px] items-center justify-center lg:min-h-[540px]">
        <div className="absolute left-[12%] right-[12%] top-1/2 h-px bg-linear-to-r from-transparent via-[#FF3B3B]/30 to-transparent" />
        <div className="absolute bottom-[18%] left-1/2 top-[16%] w-px bg-linear-to-b from-transparent via-white/16 to-transparent" />
        <div className="absolute left-[19%] right-[19%] top-[28%] h-px rotate-[22deg] bg-linear-to-r from-transparent via-blue-400/22 to-transparent" />
        <div className="absolute left-[19%] right-[19%] bottom-[28%] h-px -rotate-[22deg] bg-linear-to-r from-transparent via-emerald-400/18 to-transparent" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex h-48 w-48 items-center justify-center rounded-full border border-[#FF3B3B]/25 bg-black/60 shadow-[0_0_95px_rgba(255,59,59,0.10)] sm:h-60 sm:w-60"
        >
          <div className="absolute inset-4 rounded-full border border-white/8" />
          <div className="absolute inset-10 rounded-full border border-[#FF3B3B]/14" />
          <motion.div
            className="absolute inset-0 rounded-full border border-dashed border-white/10"
            animate={shouldReduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
          />
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#FF3B3B]/25 bg-[#FF3B3B]/10 text-[#FF3B3B]">
              <Activity size={22} strokeWidth={1.6} />
            </div>
            <div className="text-4xl font-black tracking-[0.16em] text-white sm:text-5xl">RAFIQ</div>
            <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.24em] text-white/28">
              Local Safety OS
            </div>
          </div>
        </motion.div>

        {[
          {
            label: 'Wearable',
            icon: Watch,
            className: 'left-0 top-[18%]',
            meta: 'BLE vitals',
            accent: 'blue' as Accent,
          },
          {
            label: 'RAQEEB',
            icon: ShieldAlert,
            className: 'right-0 top-[18%]',
            meta: 'Gas response',
            accent: 'amber' as Accent,
          },
          {
            label: 'Home',
            icon: Home,
            className: 'left-[5%] bottom-[15%]',
            meta: 'Automation',
            accent: 'emerald' as Accent,
          },
          {
            label: 'Cloud',
            icon: Cloud,
            className: 'right-[5%] bottom-[15%]',
            meta: 'Best-effort sync',
            accent: 'blue' as Accent,
          },
          {
            label: 'AI Core',
            icon: Brain,
            className: 'left-1/2 top-0 -translate-x-1/2',
            meta: 'Local models',
            accent: 'red' as Accent,
          },
          {
            label: 'App + GUI',
            icon: Bot,
            className: 'left-1/2 bottom-0 -translate-x-1/2',
            meta: 'Human interface',
            accent: 'white' as Accent,
          },
        ].map((node, index) => {
          const Icon = node.icon;
          const accent = accentStyles[node.accent];

          return (
            <motion.div
              key={node.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 + index * 0.06 }}
              className={`absolute ${node.className}`}
            >
              <div
                className={[
                  'flex w-32 items-center gap-2 rounded-2xl border px-3 py-2.5 sm:w-40',
                  'bg-black/70 backdrop-blur-xl',
                  accent.border,
                  accent.glow,
                ].join(' ')}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.icon}`}>
                  <Icon size={15} strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-bold text-white">{node.label}</div>
                  <div className="truncate font-mono text-[9px] text-white/28">{node.meta}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

function IdentityCard({ card, index }: { card: IdentityCard; index: number }) {
  const Icon = card.icon;
  const accent = accentStyles[card.accent];

  return (
    <motion.div
      {...reveal}
      transition={{ ...reveal.transition, delay: index * 0.045 }}
      className={[
        'group relative min-h-[260px] overflow-hidden rounded-2xl border border-white/[0.08]',
        'bg-white/[0.028] p-6 backdrop-blur-2xl transition-all duration-300',
        'hover:-translate-y-1.5 hover:border-white/16 hover:bg-white/[0.045]',
        accent.glow,
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/28 to-transparent" />
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/[0.035] blur-[55px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <motion.div
        className={`pointer-events-none absolute left-0 top-0 h-full w-px ${accent.line}`}
        animate={{ opacity: [0.14, 0.36, 0.14] }}
        transition={{ duration: 3.2, repeat: Infinity, delay: index * 0.18 }}
      />

      <div className="mb-7 flex items-start justify-between gap-4">
        <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl border ${accent.border} ${accent.bg} ${accent.icon}`}>
          <motion.span
            className={`absolute inset-0 rounded-xl ${accent.bg}`}
            animate={{ opacity: [0.2, 0.65, 0.2], scale: [1, 1.05, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.13 }}
          />
          <Icon size={20} strokeWidth={1.6} className="relative z-10" />
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/35 px-2.5 py-1">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[#FF3B3B]"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.12 }}
          />
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/38">
            {card.status}
          </span>
        </div>
      </div>

      <p className={`font-mono text-[9px] uppercase tracking-[0.24em] ${accent.text}`}>{card.kicker}</p>
      <h3 className="mt-2 text-2xl font-black tracking-tight text-white">{card.title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/45">{card.description}</p>

      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-white/24">
          {card.signal}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {card.capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/35"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 h-[1.5px] w-0 ${accent.line} transition-all duration-500 group-hover:w-full`} />
    </motion.div>
  );
}

function LayerStack() {
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const [focusedLayer, setFocusedLayer] = useState<number>(0); // Default to AI Layer focused

  const focusedLayerObj = UPGRADED_PLATFORM_LAYERS[focusedLayer];
  const FocusedIcon = focusedLayerObj.icon;
  const accent = accentStyles[focusedLayerObj.accent];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      {/* 3D INTERACTIVE OS STACK EXPLORER (Desktop Only) */}
      <div className="hidden lg:flex relative w-full h-[580px] items-center justify-center select-none overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 80%)',
          }}
        />

        {/* Central Dashboard Communication Laser Axis */}
        <div
          className="absolute w-0.5 bg-linear-to-b from-[#FF3B3B]/10 via-[#FF3B3B]/45 to-[#FF3B3B]/10 z-0 shadow-[0_0_12px_#FF3B3B]"
          style={{
            height: '420px',
            top: '80px',
            transform: 'rotateX(52deg) rotateY(0deg) rotateZ(-32deg) translateY(-20px)',
            willChange: 'transform',
          }}
        />

        {/* Floating Stack Slabs container with 3D Preserve context */}
        <div
          className="relative w-[340px] h-[480px] flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            perspective: '1200px',
          }}
        >
          {UPGRADED_PLATFORM_LAYERS.map((layer, index) => {
            const Icon = layer.icon;
            const isHovered = hoveredLayer === index;
            const isFocused = focusedLayer === index;
            const layerAccent = accentStyles[layer.accent];

            // 3D Isometric Stack Mathematics
            // Translate Z pushes layers higher physically vertically in isometric space
            let transZ = (7 - index) * 44; // standard stacking spacing
            let transY = 0;
            let transX = 0;

            if (isFocused) {
              transZ += 38; // Lift focused layer significantly higher
              transY -= 20; // Shift along Y axis to separate visually
              transX -= 10;
            } else if (isHovered) {
              transZ += 18;
              transY -= 8;
            }

            // Create visual separation slot around the clicked focused layer
            if (focusedLayer !== null && !isFocused) {
              if (index < focusedLayer) {
                transZ += 24; // Push higher indices (upper stack) upwards
              } else {
                transZ -= 24; // Push lower indices (lower stack) downwards
              }
            }

            return (
              <motion.div
                key={layer.label}
                onMouseEnter={() => setHoveredLayer(index)}
                onMouseLeave={() => setHoveredLayer(null)}
                onClick={() => setFocusedLayer(index)}
                style={{
                  position: 'absolute',
                  width: '280px',
                  height: '50px',
                  zIndex: 20 - index,
                  transformStyle: 'preserve-3d',
                }}
                animate={{
                  transform: `rotateX(52deg) rotateY(0deg) rotateZ(-32deg) translate3d(${transX}px, ${transY}px, ${transZ}px)`,
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className={[
                  'cursor-pointer rounded-xl border p-3.5 flex items-center gap-3 backdrop-blur-xl transition-all duration-300',
                  isFocused
                    ? 'bg-black/90 shadow-[0_12px_40px_rgba(0,0,0,0.5),_0_0_25px_rgba(255,59,59,0.06)]'
                    : 'bg-white/[0.025] hover:bg-white/[0.045] shadow-[0_8px_30px_rgba(0,0,0,0.25)]',
                  isFocused ? layerAccent.border : 'border-white/[0.08]',
                  isFocused ? 'scale-[1.02]' : 'hover:scale-[1.01]',
                ].join(' ')}
              >
                {/* 3D Laser Alignment Anchor Points */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/10 bg-black/80 flex items-center justify-center z-0 pointer-events-none opacity-0 group-hover:opacity-100">
                  <div className="w-1 h-1 rounded-full bg-[#FF3B3B] animate-ping" />
                </div>

                <div className={`relative z-10 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg border ${layerAccent.border} ${layerAccent.bg} ${layerAccent.icon}`}>
                  <Icon size={13} strokeWidth={1.7} />
                </div>

                <div className="relative z-10 flex-1 min-w-0 flex items-center justify-between">
                  <h4 className="text-[12.5px] font-bold text-white truncate">{layer.label}</h4>
                  <span className={`font-mono text-[7.5px] uppercase tracking-wider ${layerAccent.text} shrink-0 ml-1.5`}>
                    {layer.signal}
                  </span>
                </div>

                {/* Subtly glowing bottom plate for focused items */}
                {isFocused && (
                  <div className={`absolute inset-0 rounded-xl border border-transparent ${layerAccent.glow} opacity-60 pointer-events-none`} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* OS INSPECTION HUD PANEL (Dynamic detailed diagnostics panel) */}
      <div className="relative flex flex-col gap-5">
        <motion.div
          key={focusedLayer}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/60 p-6 shadow-2xl backdrop-blur-2xl"
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#FF3B3B]/80">
                [SYSTEM_INSPECTION_HUD]
              </span>
              <h3 className="mt-1.5 text-2xl font-black tracking-tight text-white select-none">
                {focusedLayerObj.label}
              </h3>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${accent.border} ${accent.bg} ${accent.icon}`}>
              <FocusedIcon size={20} strokeWidth={1.6} />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/24">
                Operational Status
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-wider text-white/80">
                  {focusedLayerObj.telemetry.status}
                </span>
                <span className="text-white/20">|</span>
                <span className="font-mono text-[10px] text-white/40">
                  {focusedLayerObj.telemetry.subtext}
                </span>
              </div>
            </div>

            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/24">
                Description
              </span>
              <p className="mt-1 text-sm leading-6 text-white/45">
                {focusedLayerObj.description}
              </p>
            </div>

            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/24">
                Telemetry Diagnostics
              </span>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {focusedLayerObj.telemetry.stats.map((stat, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-white/[0.015] p-2.5 font-mono text-[9.5px] text-white/60">
                    <span className="text-[#FF3B3B]/60 mr-1.5">&gt;</span>
                    {stat}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/24">
                Internal Routing Path
              </span>
              <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-black/40 p-2 font-mono text-[9px] text-[#FF3B3B]/70 border border-[#FF3B3B]/10">
                <span className="text-white/30">[IN_INGEST]</span>
                <span>-&gt;</span>
                <span className="text-white/70">{focusedLayerObj.signal.toUpperCase()}</span>
                <span>-&gt;</span>
                <span className="text-[#FF3B3B] font-bold">[OS_DISPATCH]</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ACCORDION FALLBACK LIST FOR MOBILE / TABLET VIEWPOTS */}
        <div className="flex flex-col gap-2.5 lg:hidden mt-2">
          <div className="px-1 py-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/24">
              OS Stack Layers List
            </span>
          </div>
          {UPGRADED_PLATFORM_LAYERS.map((layer, index) => {
            const Icon = layer.icon;
            const isFocused = focusedLayer === index;
            const layerAccent = accentStyles[layer.accent];

            return (
              <button
                key={layer.label}
                onClick={() => setFocusedLayer(index)}
                className={[
                  'w-full text-left rounded-xl border p-3 flex items-center justify-between backdrop-blur-xl transition-all duration-300',
                  isFocused
                    ? 'bg-black/90 shadow-[0_4px_20px_rgba(255,59,59,0.04)] border-[#FF3B3B]/25'
                    : 'bg-white/[0.015] border-white/[0.06] hover:bg-white/[0.035] hover:border-white/12',
                ].join(' ')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${layerAccent.border} ${layerAccent.bg} ${layerAccent.icon}`}>
                    <Icon size={12} strokeWidth={1.7} />
                  </div>
                  <span className="text-[13px] font-bold text-white truncate">{layer.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-white/25">
                  <span className={isFocused ? layerAccent.text : ''}>{layer.signal}</span>
                  <ChevronRight size={10} className={isFocused ? 'rotate-90 text-[#FF3B3B]' : 'text-white/10'} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EcosystemMap() {
  const [activeNode, setActiveNode] = useState<string>('core');
  const [activeFilter, setActiveFilter] = useState<EcosystemFilter>('full');
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1220, height: 900 });
  const shouldReduceMotion = useReducedMotion();
  const nodeById = new Map(ECOSYSTEM_NODES.map((node) => [node.id, node]));
  const active = nodeById.get(activeNode) ?? nodeById.get('core')!;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  // Sync activeNode when filters change to ensure selected node stays highlighted
  useEffect(() => {
    if (activeFilter === 'full') {
      setActiveNode('core');
    } else {
      const activeFilterNodes = ECOSYSTEM_FILTERS[activeFilter].nodes;
      if (activeFilterNodes.length > 0 && !activeFilterNodes.includes(activeNode)) {
        setActiveNode(activeFilterNodes[0]);
      }
    }
  }, [activeFilter, activeNode]);

  const topologyScale = useMemo(() => {
    const fitScale = Math.min(viewportSize.width / 1220, viewportSize.height / 900);
    return Math.min(1, Math.max(0.58, fitScale));
  }, [viewportSize.height, viewportSize.width]);

  const scaledTopology = {
    width: 1220 * topologyScale,
    height: 900 * topologyScale,
  };

  const dragConstraints = {
    left: -Math.max(0, scaledTopology.width - viewportSize.width),
    right: 0,
    top: -Math.max(0, scaledTopology.height - viewportSize.height),
    bottom: 0,
  };

  const lineTone: Record<EcosystemConnection['tone'], { stroke: string; glow: string; text: string }> = {
    red: { stroke: 'rgba(255,59,59,0.46)', glow: 'rgba(255,59,59,0.18)', text: '#ff6b6b' },
    blue: { stroke: 'rgba(96,165,250,0.38)', glow: 'rgba(96,165,250,0.14)', text: '#93c5fd' },
    emerald: { stroke: 'rgba(52,211,153,0.34)', glow: 'rgba(52,211,153,0.12)', text: '#6ee7b7' },
    amber: { stroke: 'rgba(251,191,36,0.38)', glow: 'rgba(251,191,36,0.12)', text: '#fcd34d' },
    white: { stroke: 'rgba(255,255,255,0.30)', glow: 'rgba(255,255,255,0.10)', text: 'rgba(255,255,255,0.62)' },
  };

  const makePath = (connection: EcosystemConnection) => {
    const from = nodeById.get(connection.from)!;
    const to = nodeById.get(connection.to)!;
    const direction = to.x >= from.x ? 1 : -1;
    const spread = Math.min(190, Math.max(70, Math.abs(to.x - from.x) * 0.46));
    return `M ${from.x} ${from.y} C ${from.x + spread * direction} ${from.y}, ${to.x - spread * direction} ${to.y}, ${to.x} ${to.y}`;
  };

  return (
    <motion.div {...reveal}>
      <GlassPanel className="p-4 sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.028) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.028) 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
            maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
          }}
        />

        {/* Cyber glass topology control bar */}
        <div className="mb-6 flex flex-col gap-4 border-b border-white/[0.06] pb-5 select-none relative z-30">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/35">
              [SYSTEM_COMPOSTIONS_DESTRUCT_GRID]
            </span>
            <span className="font-mono text-[8px] text-[#FF3B3B]/60 tracking-widest uppercase">
              ACTIVE_COMPOSITION: {activeFilter.toUpperCase()}_ISOLATION
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {(Object.keys(ECOSYSTEM_FILTERS) as EcosystemFilter[]).map((filterKey) => {
              const filterObj = ECOSYSTEM_FILTERS[filterKey];
              const isSelected = activeFilter === filterKey;
              return (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setActiveFilter(filterKey)}
                  className={[
                    'relative overflow-hidden rounded-lg px-4 py-2.5 text-left sm:text-center transition-all duration-300',
                    'backdrop-blur-md border font-mono text-[10px] font-bold uppercase tracking-wider',
                    isSelected
                      ? 'bg-[#FF3B3B]/8 border-[#FF3B3B]/38 text-white shadow-[0_0_15px_rgba(255,59,59,0.12)]'
                      : 'bg-white/[0.025] border-white/[0.06] text-white/40 hover:text-white/80 hover:bg-white/[0.05] hover:border-white/12',
                  ].join(' ')}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span className={[
                      'h-1.5 w-1.5 rounded-full transition-all duration-300',
                      isSelected ? 'bg-[#FF3B3B] scale-110 shadow-[0_0_8px_#FF3B3B]' : 'bg-white/20',
                    ].join(' ')} />
                    {filterObj.label}
                  </span>
                  {isSelected && (
                    <motion.div
                      layoutId="ecosystem-filter-glow"
                      className="absolute inset-0 bg-[#FF3B3B]/5 mix-blend-color-dodge pointer-events-none"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={viewportRef}
          className="relative h-[620px] overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-black/20 sm:h-[720px] lg:h-[820px] xl:h-[900px]"
        >
          <motion.div
            className="absolute left-0 top-0 h-[900px] w-[1220px] origin-top-left touch-none cursor-grab active:cursor-grabbing"
            drag
            dragMomentum={false}
            dragElastic={0.06}
            dragConstraints={dragConstraints}
            style={{
              left: Math.max(0, (viewportSize.width - scaledTopology.width) / 2),
              top: Math.max(0, (viewportSize.height - scaledTopology.height) / 2),
              scale: topologyScale,
            }}
          >
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1220 900" aria-hidden="true">
              <defs>
                <filter id="rafiq-ecosystem-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect x="25" y="20" width="1165" height="850" rx="34" fill="rgba(255,255,255,0.012)" stroke="rgba(255,255,255,0.055)" />
              <rect x="35" y="620" width="845" height="235" rx="28" fill="rgba(255,59,59,0.018)" stroke="rgba(255,59,59,0.10)" />
              <rect x="760" y="18" width="405" height="540" rx="28" fill="rgba(255,59,59,0.014)" stroke="rgba(255,59,59,0.09)" />
              <rect x="145" y="36" width="490" height="600" rx="28" fill="rgba(96,165,250,0.010)" stroke="rgba(255,255,255,0.055)" />

              {[
                { x: 50, y: 640, label: 'RAQEEB INDEPENDENT SAFETY PATH' },
                { x: 780, y: 42, label: 'AI ROUTING + PROCESSING' },
                { x: 155, y: 58, label: 'VOICE / GUI FEEDBACK LOOP' },
                { x: 500, y: 660, label: 'LOCAL DATA + CLOUD SYNC' },
              ].map((label) => (
                <text key={label.label} x={label.x} y={label.y} fill="rgba(255,255,255,0.22)" fontSize="10" fontFamily="monospace" letterSpacing="2">
                  {label.label}
                </text>
              ))}

              {ECOSYSTEM_CONNECTIONS.map((connection, index) => {
                const from = nodeById.get(connection.from)!;
                const to = nodeById.get(connection.to)!;
                const tone = lineTone[connection.tone];
                const path = makePath(connection);
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;

                // Path Filtering logic
                const isConnFiltered = isConnectionActive(connection.from, connection.to, activeFilter);
                const isActive = (activeNode === connection.from || activeNode === connection.to) && isConnFiltered;

                return (
                  <g key={`${connection.from}-${connection.to}`} className="transition-all duration-300" style={{ opacity: isConnFiltered ? 1 : 0.08 }}>
                    <motion.path
                      d={path}
                      fill="none"
                      stroke={isActive ? tone.stroke : (isConnFiltered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.035)')}
                      strokeWidth={isActive ? 1.65 : 1}
                      strokeDasharray={connection.optional ? '7 8' : undefined}
                      filter={isActive ? 'url(#rafiq-ecosystem-glow)' : undefined}
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: connection.optional ? 0.62 : 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.85, delay: index * 0.018 }}
                    />
                    {!shouldReduceMotion && isConnFiltered && (
                      <motion.circle
                        cx={midX}
                        cy={midY}
                        r={isActive ? 3.2 : 2.1}
                        fill={tone.stroke}
                        animate={{ opacity: [0.15, 0.95, 0.15], scale: [0.7, 1.25, 0.7] }}
                        transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.08 }}
                      />
                    )}
                    {connection.label && isActive && (
                      <text x={midX + 8} y={midY - 7} fill={tone.text} fontSize="9" fontFamily="monospace" letterSpacing="1">
                        {connection.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {ECOSYSTEM_NODES.map((node) => {
                const isNodeFiltered = isNodeActive(node.id, activeFilter);
                const isActive = activeNode === node.id && isNodeFiltered;
                const accent = accentStyles[node.accent];

                return (
                  <motion.circle
                    key={`${node.id}-halo`}
                    cx={node.x}
                    cy={node.y}
                    r={isActive ? 44 : 24}
                    fill="none"
                    stroke={node.accent === 'red' ? 'rgba(255,59,59,0.24)' : 'rgba(255,255,255,0.08)'}
                    strokeWidth="1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isActive ? [0.3, 0.75, 0.3] : (isNodeFiltered ? 0.18 : 0.02) }}
                    transition={{ duration: 2.4, repeat: isActive ? Infinity : 0 }}
                    className={`${accent.icon} transition-all duration-300`}
                  />
                );
              })}
            </svg>

            {ECOSYSTEM_NODES.map((node, index) => {
              const Icon = node.icon;
              const accent = accentStyles[node.accent];
              const isNodeFiltered = isNodeActive(node.id, activeFilter);
              const isActive = activeNode === node.id && isNodeFiltered;

              return (
                <motion.button
                  type="button"
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  onMouseEnter={() => {
                    if (isNodeFiltered) setActiveNode(node.id);
                  }}
                  onFocus={() => {
                    if (isNodeFiltered) setActiveNode(node.id);
                  }}
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={[
                    'absolute z-20 w-[148px] rounded-2xl border p-3 text-left backdrop-blur-xl transition-all duration-300',
                    isNodeFiltered ? (isActive ? 'bg-black/90' : 'bg-black/68') : 'bg-black/10 pointer-events-none',
                    isNodeFiltered ? (isActive ? 'scale-[1.05]' : 'hover:scale-[1.035]') : 'scale-95',
                    isNodeFiltered ? (isActive ? accent.border : 'border-white/[0.08]') : 'border-white/[0.02]',
                    isNodeFiltered && isActive ? accent.glow : '',
                  ].join(' ')}
                  transition={{ duration: 0.35, delay: index * 0.012 }}
                  disabled={!isNodeFiltered}
                >
                  <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/24 to-transparent" />
                  <span className="mb-2 flex items-center justify-between gap-2" style={{ opacity: isNodeFiltered ? 1 : 0.15 }}>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.bg} ${accent.icon}`}>
                      <Icon size={15} strokeWidth={1.6} />
                    </span>
                    <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/22">
                      {node.group}
                    </span>
                  </span>
                  <span className="block text-[12px] font-black leading-tight text-white" style={{ opacity: isNodeFiltered ? 1 : 0.15 }}>{node.label}</span>
                  <span className="mt-1 block font-mono text-[8.5px] leading-tight text-white/32" style={{ opacity: isNodeFiltered ? 1 : 0.1 }}>{node.sublabel}</span>
                  
                  {/* Frosted Glass Overlay for Inactive focus nodes */}
                  {!isNodeFiltered && (
                    <div className="absolute inset-0 bg-black/45 rounded-2xl backdrop-blur-[1px] border border-transparent pointer-events-none" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 grid gap-4 rounded-2xl border border-white/[0.07] bg-black/45 p-4 backdrop-blur-xl sm:grid-cols-[1fr_auto]"
        >
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#FF3B3B]/65">
              Active node / {active.group}
            </div>
            <h3 className="mt-2 text-xl font-black text-white">{active.label}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">{active.detail}</p>
          </div>
          <div className="flex items-center gap-2 self-end rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-[#FF3B3B]"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/32">
              Routing visible
            </span>
          </div>
        </motion.div>
      </GlassPanel>
    </motion.div>
  );
}

function PreviewCard({ card, index }: { card: PreviewCard; index: number }) {
  const Icon = card.icon;
  const accent = accentStyles[card.accent];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      {...reveal}
      transition={{ ...reveal.transition, delay: index * 0.035 }}
      className={card.gridClass || ''}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ willChange: 'transform, opacity' }}
    >
      <Link href={card.href} className="group block h-full select-none">
        <div
          className={[
            'relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border border-white/[0.08]',
            'bg-white/[0.025] p-5 backdrop-blur-xl transition-all duration-300',
            'hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.045]',
            accent.glow,
          ].join(' ')}
        >
          {/* Bento Coordinates HUD Details */}
          <div className="absolute top-3.5 right-4 font-mono text-[8px] font-bold text-white/15 transition-all group-hover:text-[#FF3B3B]/60 tracking-widest">
            {card.coordinate || '[MOD-00]'}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${accent.bg} ${accent.icon}`}>
              {/* Radar Ripple active circle glow */}
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    className="absolute inset-0 rounded-xl border border-[#FF3B3B]/30 pointer-events-none"
                    initial={{ scale: 0.95, opacity: 0.8 }}
                    animate={{ scale: 1.15, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    style={{ willChange: 'transform, opacity' }}
                  />
                )}
              </AnimatePresence>
              <Icon size={18} strokeWidth={1.6} />
            </div>
            
            <div className="flex flex-col items-end gap-1 select-none">
              <span className={`rounded-md border ${accent.border} ${accent.bg} px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] ${accent.text}`}>
                {card.status}
              </span>
              <span className="font-mono text-[6.5px] uppercase tracking-wider text-emerald-400/50 mt-0.5 animate-pulse">
                {card.diagnostic || 'SYS_STATE: NOMINAL'}
              </span>
            </div>
          </div>

          <h3 className="mt-6 text-xl font-black text-white">{card.title}</h3>
          <p className="mt-3 flex-1 text-sm leading-6 text-white/42">{card.description}</p>
          <div className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/28 transition-colors group-hover:text-white/65">
            Open page
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
          </div>
          <div className={`absolute bottom-0 left-0 h-[1.5px] w-0 ${accent.line} transition-all duration-500 group-hover:w-full`} />
        </div>
      </Link>
    </motion.div>
  );
}

export default function RafiqPlatformLanding() {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
        <div className="min-h-screen overflow-hidden bg-[#000109] text-white">
          <section className="relative px-5 pb-16 pt-10 sm:px-8 sm:pb-20 lg:pb-28 lg:pt-16">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(120deg, rgba(255,59,59,0.075), transparent 28%, transparent 72%, rgba(30,58,138,0.065))',
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-8 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[#FF3B3B]/22 bg-[#FF3B3B]/8 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF3B3B]/75">
                    Phantoms Platform
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Human Safety Operating System
                  </span>
                </div>

                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-white/32">
                  Offline-First AI Infrastructure
                </p>
                <h1 className="mt-4 text-6xl font-black leading-[0.92] tracking-tight text-white sm:text-7xl lg:text-8xl">
                  RAFIQ
                </h1>
                <div className="mt-5 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/38">
                  <span>Edge Intelligence Platform</span>
                  <span className="text-[#FF3B3B]/60">/</span>
                  <span>Safety Automation Core</span>
                  <span className="text-[#FF3B3B]/60">/</span>
                  <span>Local AI OS</span>
                </div>

                <p className="mt-7 max-w-xl text-base leading-8 text-white/52 sm:text-lg">
                  RAFIQ is an offline-first AI infrastructure platform for human safety:
                  a MiniPC core, wearable telemetry, RAQEEB hardware protection, smart home automation,
                  local AI reasoning, and optional cloud sync working as one resilient system.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    href="/rafiq/architecture"
                    className="group flex items-center gap-2 rounded-xl bg-[#FF3B3B] px-5 py-3 text-sm font-black text-white shadow-[0_0_34px_rgba(255,59,59,0.24)] transition-all duration-300 hover:bg-[#ff5151] hover:shadow-[0_0_44px_rgba(255,59,59,0.32)]"
                  >
                    View Architecture
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="#system-preview"
                    className="group flex items-center gap-2 rounded-xl border border-white/11 bg-white/[0.035] px-5 py-3 text-sm font-bold text-white/72 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:text-white"
                  >
                    Explore Infrastructure
                    <ChevronRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>

                <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                  {[
                    { value: 'Edge', label: 'Primary compute' },
                    { value: 'Local', label: 'Safety decisions' },
                    { value: 'Cloud', label: 'Optional sync' },
                  ].map((item) => (
                    <div key={item.label} className="border-l border-white/10 pl-4">
                      <div className="font-mono text-lg font-black text-white">{item.value}</div>
                      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/25">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <HeroTopology />
            </div>
          </section>

          <SectionShell
            eyebrow="What is RAFIQ"
            title="Capability architecture for an AI operating system."
            description="RAFIQ is not a list of features. It is a set of coordinated infrastructure capabilities: intelligence, access, interface, backend, local core, independent safety, and home automation working as one system."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {IDENTITY_CARDS.map((card, index) => (
                <div key={card.title}>
                  <IdentityCard card={card} index={index} />
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            eyebrow="Platform Layers"
            title="The system is organized like infrastructure."
            description="Each layer has a clear job. Safety stays local, AI reasons at the edge, data writes first to the machine in the home, and the cloud becomes a continuity layer instead of a dependency."
            className="border-y border-white/[0.06] bg-black/10"
          >
            <LayerStack />
          </SectionShell>

          <SectionShell
            eyebrow="RAFIQ Ecosystem"
            title="A connected topology, not a decorative diagram."
            description="Sensor traffic enters through edge devices and MQTT, reaches the local core, then routes into AI, voice, GUI, automation, sync, cloud, app, and RAQEEB safety paths with clear ownership."
          >
            <EcosystemMap />
          </SectionShell>

          <SectionShell
            eyebrow="System Preview Grid"
            title="AI Module Mission Control"
            description="The root page now introduces the platform. From here, every card opens a dedicated system page with the deeper technical surface."
            className="border-t border-white/[0.06]"
          >
            {/* Custom high-density asymmetric bento architecture layout */}
            <div id="system-preview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {PREVIEW_CARDS.map((card, index) => (
                <PreviewCard key={card.href} card={card} index={index} />
              ))}
            </div>
          </SectionShell>

          <section className="relative px-5 py-16 sm:px-8 lg:py-24">
            <div className="mx-auto max-w-7xl">
              <GlassPanel className="p-8 sm:p-10 lg:p-12">
                <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF3B3B]/22 bg-[#FF3B3B]/8 text-[#FF3B3B]">
                        <Sparkles size={18} strokeWidth={1.6} />
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/28">
                        RAFIQ platform
                      </p>
                    </div>
                    <h2 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                      Enter the infrastructure behind offline human safety.
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
                      Continue into the architecture, inspect the core services, or open the emulator when you want the dedicated live simulation surface.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link
                      href="/rafiq/architecture"
                      className="group flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-black transition-all duration-300 hover:bg-white/88"
                    >
                      Explore Architecture
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/rafiq/core"
                      className="group flex items-center justify-center gap-2 rounded-xl border border-[#FF3B3B]/22 bg-[#FF3B3B]/8 px-5 py-3 text-sm font-black text-[#FF3B3B] transition-all duration-300 hover:bg-[#FF3B3B]/13"
                    >
                      Enter RAFIQ System
                      <RadioTower size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </section>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
