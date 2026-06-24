export type EcosystemFilter =
  | 'full'
  | 'ai'
  | 'app'
  | 'core'
  | 'home'
  | 'raqeeb'
  | 'cloud';

export interface FilterDefinition {
  id: EcosystemFilter;
  label: string;
  description: string;
  nodes: string[];
}

export const ECOSYSTEM_FILTERS: Record<EcosystemFilter, FilterDefinition> = {
  full: {
    id: 'full',
    label: 'Full System',
    description: 'Complete operational surface showing all active edge, local, and cloud components.',
    nodes: [], // Empty represents all nodes are active
  },
  ai: {
    id: 'ai',
    label: 'AI System',
    description: 'Decentralized local and hybrid AI processing, safety decision engine, and voice pipeline.',
    nodes: [
      'ai-router',
      'offline-ai',
      'online-ai',
      'hybrid-ai',
      'analysis',
      'decision',
      'memory',
      'stt',
      'tts',
      'gui',
    ],
  },
  app: {
    id: 'app',
    label: 'App & Sync',
    description: 'Realtime telemetry client, persistent outbound database sync queue, and remote alert streams.',
    nodes: [
      'supabase',
      'sync-queue',
      'app',
      'mqtt',
      'core',
      'emergency-alert',
    ],
  },
  core: {
    id: 'core',
    label: 'Core Engine',
    description: 'MiniPC local first operating core running Ubuntu services, local databases, and MQTT router.',
    nodes: [
      'core',
      'router',
      'mqtt',
      'sqlite',
      'ha',
    ],
  },
  home: {
    id: 'home',
    label: 'Smart Home',
    description: 'Home automation mesh, device routines, environmental sensors, and appliance control grids.',
    nodes: [
      'ha',
      'mqtt',
      'devices',
    ],
  },
  raqeeb: {
    id: 'raqeeb',
    label: 'RAQEEB Safety',
    description: 'Autonomous ESP32 emergency protection loop for gas levels, physical valve control, and alarm sirens.',
    nodes: [
      'mq-sensors',
      'raqeeb-logic',
      'valve',
      'window-open',
      'siren',
      'emergency-alert',
    ],
  },
  cloud: {
    id: 'cloud',
    label: 'Cloud Sync',
    description: 'Replicated database pipelines and best-effort web socket connections for cross-device telemetry.',
    nodes: [
      'supabase',
      'sync-queue',
      'online-ai',
    ],
  },
};

/**
 * Checks if a specific node ID is active under the given filter.
 */
export function isNodeActive(nodeId: string, filter: EcosystemFilter): boolean {
  if (filter === 'full') return true;
  return ECOSYSTEM_FILTERS[filter].nodes.includes(nodeId);
}

/**
 * Checks if a connection path is active under the given filter.
 * A connection is active if both nodes it connects are active.
 */
export function isConnectionActive(fromId: string, toId: string, filter: EcosystemFilter): boolean {
  if (filter === 'full') return true;
  const activeNodes = ECOSYSTEM_FILTERS[filter].nodes;
  return activeNodes.includes(fromId) && activeNodes.includes(toId);
}
