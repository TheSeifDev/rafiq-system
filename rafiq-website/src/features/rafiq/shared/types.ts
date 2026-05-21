export type SystemStatus =
  | 'online'
  | 'offline'
  | 'warning'
  | 'active'
  | 'syncing'
  | 'error'
  | 'idle';

export type LayerType = 'edge' | 'local' | 'cloud' | 'hybrid';

export type AIModel = 'medgemma' | 'qwen' | 'local' | 'cloud' | 'auto';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  service: string;
  message: string;
}

export interface MQTTMessage {
  topic: string;
  payload: Record<string, unknown>;
  qos: 0 | 1 | 2;
  timestamp: string;
  size?: number;
}

export interface SystemMetric {
  label: string;
  value: string | number;
  unit?: string;
  status?: SystemStatus;
  trend?: 'up' | 'down' | 'stable';
}

export interface ArchNode {
  id: string;
  label: string;
  sublabel?: string;
  type: string;
  layer: LayerType;
  status: SystemStatus;
  metrics?: SystemMetric[];
  connections?: string[];
  icon?: string;
}

export interface FlowStep {
  id: string;
  label: string;
  sublabel?: string;
  type: 'source' | 'processor' | 'ai' | 'storage' | 'network' | 'sink' | 'output';
  protocol?: string;
  latency?: string;
  layer: LayerType;
}

export interface EmergencyEvent {
  id: string;
  type: 'gas_leak' | 'fall_detected' | 'heart_anomaly' | 'fire' | 'intrusion';
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  status: 'active' | 'resolved' | 'investigating';
  source: string;
  actions: string[];
}

export interface WearableReading {
  timestamp: string;
  heartRate: number;
  spo2: number;
  steps: number;
  battery: number;
  connected: boolean;
  gps?: { lat: number; lng: number };
}

export interface SyncQueueEntry {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  status: 'pending' | 'syncing' | 'done' | 'failed';
  retries: number;
  timestamp: string;
  size: number;
}
