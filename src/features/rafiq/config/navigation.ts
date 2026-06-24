export type NavStatus = 'online' | 'active' | 'warning' | 'syncing' | 'offline';

export interface RafiqNavItem {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: string;
  status: NavStatus;
  badge?: string;
  isLive?: boolean;
  isWarning?: boolean;
}

export interface RafiqNavGroup {
  id: string;
  label: string;
  items: RafiqNavItem[];
}

export const rafiqNavGroups: RafiqNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'platform',
        label: 'Platform',
        sublabel: 'Ecosystem Overview',
        href: '/rafiq',
        icon: 'Layers',
        status: 'online',
      },
    ],
  },
  {
    id: 'core-system',
    label: 'Core System',
    items: [
      {
        id: 'core',
        label: 'Core Engine',
        sublabel: 'Ubuntu · FastAPI · SQLite',
        href: '/rafiq/core',
        icon: 'Cpu',
        status: 'online',
      },
      {
        id: 'ai',
        label: 'AI System',
        sublabel: 'Ollama · MedGemma · Qwen',
        href: '/rafiq/ai',
        icon: 'Brain',
        status: 'online',
      },
      {
        id: 'database',
        label: 'Database',
        sublabel: 'SQLite · Supabase · Sync',
        href: '/rafiq/database',
        icon: 'Database',
        status: 'online',
      },
      {
        id: 'data-flow',
        label: 'Data Flow',
        sublabel: 'BLE → MQTT → Cloud',
        href: '/rafiq/data-flow',
        icon: 'GitBranch',
        status: 'online',
      },
      {
        id: 'emulator',
        label: 'Emulator',
        sublabel: 'Live System Simulation',
        href: '/rafiq/emulator',
        icon: 'Terminal',
        status: 'active',
        badge: 'LIVE',
        isLive: true,
      },
      {
        id: 'sync-engine',
        label: 'Sync Engine',
        sublabel: 'Push · Pull · Retry Queue',
        href: '/rafiq/sync-engine',
        icon: 'RefreshCw',
        status: 'syncing',
      },
    ],
  },
  {
    id: 'hardware',
    label: 'Hardware & Automation',
    items: [
      {
        id: 'smart-home',
        label: 'Smart Home',
        sublabel: 'Home Assistant · MQTT',
        href: '/rafiq/smart-home',
        icon: 'Home',
        status: 'online',
      },
      {
        id: 'raqeeb',
        label: 'RAQEEB',
        sublabel: 'Gas Detection · Safety',
        href: '/rafiq/raqeeb',
        icon: 'ShieldAlert',
        status: 'online',
      },
      {
        id: 'wearable',
        label: 'Smart Watch',
        sublabel: 'ESP32 · BLE · Biometrics',
        href: '/rafiq/wearable',
        icon: 'Watch',
        status: 'online',
      },
      {
        id: 'gui',
        label: 'GUI / Avatar',
        sublabel: 'Emotional AI · Voice Sync',
        href: '/rafiq/gui',
        icon: 'Bot',
        status: 'online',
      },
    ],
  },
  {
    id: 'security-arch',
    label: 'Security & Arch',
    items: [
      {
        id: 'security',
        label: 'Security',
        sublabel: 'JWT · Encryption · Edge',
        href: '/rafiq/security',
        icon: 'Lock',
        status: 'online',
      },
      {
        id: 'architecture',
        label: 'Architecture',
        sublabel: 'Layers · Topology · Graph',
        href: '/rafiq/architecture',
        icon: 'Network',
        status: 'online',
      },
    ],
  },
  {
    id: 'reference',
    label: 'Reference',
    items: [
      {
        id: 'apis',
        label: 'APIs',
        sublabel: 'REST · WebSocket · MQTT',
        href: '/rafiq/apis',
        icon: 'Code2',
        status: 'online',
      },
      {
        id: 'failures',
        label: 'Failure Scenarios',
        sublabel: 'Detection · Fallback · Recovery',
        href: '/rafiq/failures',
        icon: 'AlertTriangle',
        status: 'warning',
        isWarning: true,
      },
      {
        id: 'docs',
        label: 'Documentation',
        sublabel: 'Guides · API · Specs',
        href: '/rafiq/docs',
        icon: 'BookOpen',
        status: 'online',
      },
    ],
  },
];
