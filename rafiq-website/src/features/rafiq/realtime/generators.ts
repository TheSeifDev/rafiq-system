import type { LogEntry, MQTTMessage, WearableReading, SyncQueueEntry } from '../shared/types';

let _logId = 0;
let _mqttId = 0;

const SERVICES = [
  'core-engine',
  'ai-orchestrator',
  'mqtt-broker',
  'sync-engine',
  'ha-bridge',
  'voice-stt',
  'decision-engine',
  'emergency-engine',
  'ble-gateway',
  'data-pipeline',
];

const MQTT_TOPICS = [
  'rafiq/wearable/heartrate',
  'rafiq/wearable/spo2',
  'rafiq/wearable/steps',
  'rafiq/sensor/gas/co2',
  'rafiq/sensor/gas/co',
  'rafiq/home/lights/bedroom',
  'rafiq/home/ac/living',
  'rafiq/home/curtains',
  'rafiq/emergency/alert',
  'rafiq/sync/status',
  'rafiq/ai/response',
  'rafiq/ai/reasoning',
];

const LOG_TEMPLATES: { level: LogEntry['level']; service: string; message: string }[] = [
  { level: 'info',    service: 'ble-gateway',       message: 'Wearable connected: device_id=watch-001, RSSI=-62dBm' },
  { level: 'success', service: 'ai-orchestrator',   message: 'Health analysis complete → patient stable, no intervention' },
  { level: 'info',    service: 'mqtt-broker',        message: '3 clients connected, 127 messages/min throughput' },
  { level: 'info',    service: 'sync-engine',        message: 'Sync cycle complete: 8 records → Supabase, 2 pending' },
  { level: 'info',    service: 'ha-bridge',          message: 'Home Assistant automation: bedroom_lights → OFF (sleep mode)' },
  { level: 'info',    service: 'voice-stt',          message: 'Wake word detected: "RAFIQ" — activating voice pipeline' },
  { level: 'success', service: 'emergency-engine',   message: 'All sensors nominal. Emergency state: CLEAR' },
  { level: 'info',    service: 'core-engine',        message: 'SQLite checkpoint: WAL flush complete, 0 dirty pages' },
  { level: 'info',    service: 'ble-gateway',        message: 'BLE scan: 1 device found (watch-001), signal stable' },
  { level: 'success', service: 'decision-engine',    message: 'Decision: heartrate 74bpm within normal range → no action' },
  { level: 'info',    service: 'sync-engine',        message: 'Supabase push: 12 records uploaded (34ms), 0 conflicts' },
  { level: 'debug',   service: 'data-pipeline',      message: 'Pipeline: BLE→MQTT→SQLite round-trip latency 23ms' },
  { level: 'info',    service: 'ai-orchestrator',    message: 'MedGemma inference: SpO₂ 97% — within safe range' },
  { level: 'warn',    service: 'mqtt-broker',        message: 'Message queue depth: 42 — within acceptable range' },
  { level: 'info',    service: 'ha-bridge',          message: 'MQTT → HA event: motion detected in living room' },
  { level: 'success', service: 'core-engine',        message: 'FastAPI health check: all endpoints responsive (2ms avg)' },
  { level: 'info',    service: 'emergency-engine',   message: 'RAQEEB gas sensor: CO₂=418ppm CO=0ppm — normal' },
  { level: 'debug',   service: 'decision-engine',    message: 'Reasoning chain: HR→SpO₂→Activity→Context → stable' },
  { level: 'warn',    service: 'sync-engine',        message: 'Retry queue: 2 items failed, scheduling retry in 30s' },
  { level: 'info',    service: 'voice-stt',          message: 'TTS output: "Good morning, Rafiq. Your vitals are normal."' },
  { level: 'error',   service: 'sync-engine',        message: 'Supabase unreachable — switching to offline queue mode' },
  { level: 'success', service: 'sync-engine',        message: 'Supabase reconnected — draining offline queue (8 items)' },
];

export function generateLogEntry(): LogEntry {
  _logId++;
  const now = new Date();
  const template = LOG_TEMPLATES[_logId % LOG_TEMPLATES.length];

  return {
    id: `log-${_logId}`,
    timestamp: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0').slice(0, 3)}`,
    level: template.level,
    service: template.service,
    message: template.message,
  };
}

export function generateMQTTMessage(): MQTTMessage {
  _mqttId++;
  const topic = MQTT_TOPICS[_mqttId % MQTT_TOPICS.length];
  const now = new Date();

  const payloads: Record<string, Record<string, unknown>> = {
    'rafiq/wearable/heartrate': { bpm: 68 + Math.floor(Math.random() * 18), device_id: 'watch-001', battery_pct: 82, rssi: -62 },
    'rafiq/wearable/spo2':      { spo2: 96 + Math.floor(Math.random() * 3), device_id: 'watch-001', confidence: 0.97 },
    'rafiq/wearable/steps':     { steps: 3200 + Math.floor(Math.random() * 200), device_id: 'watch-001', calories: 142 },
    'rafiq/sensor/gas/co2':     { ppm: 412 + Math.floor(Math.random() * 30), sensor_id: 'raqeeb-01', temp_c: 22.4 },
    'rafiq/sensor/gas/co':      { ppm: 0, sensor_id: 'raqeeb-01', alarm: false },
    'rafiq/home/lights/bedroom':{ state: 'off', brightness: 0, room: 'bedroom', trigger: 'sleep_mode' },
    'rafiq/home/ac/living':     { state: 'on', temp_set: 22, mode: 'cool', fan_speed: 'auto' },
    'rafiq/home/curtains':      { position: 0, room: 'living', trigger: 'sunset_automation' },
    'rafiq/emergency/alert':    { level: 'info', type: 'routine_check', cleared: true, source: 'emergency-engine' },
    'rafiq/sync/status':        { queue_size: Math.floor(Math.random() * 8), last_sync_ms: Date.now(), status: 'ok' },
    'rafiq/ai/response':        { model: 'medgemma', latency_ms: 160 + Math.floor(Math.random() * 80), tokens: 124, status: 'ok' },
    'rafiq/ai/reasoning':       { step: 'health_analysis', conclusion: 'stable', confidence: 0.94 + Math.random() * 0.05 },
  };

  return {
    topic,
    payload: payloads[topic] ?? {},
    qos: 1,
    timestamp: now.toISOString(),
    size: JSON.stringify(payloads[topic] ?? {}).length,
  };
}

let _baseHR = 72;
let _baseSpo2 = 97;

export function generateWearableReading(): WearableReading {
  _baseHR = Math.max(55, Math.min(100, _baseHR + (Math.random() - 0.5) * 2));
  _baseSpo2 = Math.max(94, Math.min(99, _baseSpo2 + (Math.random() - 0.5) * 0.5));

  return {
    timestamp: new Date().toISOString(),
    heartRate: Math.round(_baseHR),
    spo2: Math.round(_baseSpo2),
    steps: 3200 + Math.floor(Math.random() * 400),
    battery: 82,
    connected: true,
  };
}

const SYNC_TABLES = ['wearable_metrics', 'ai_logs', 'alerts', 'reminders', 'system_events'];

let _syncId = 0;

export function generateSyncEntry(): SyncQueueEntry {
  _syncId++;
  const ops: SyncQueueEntry['operation'][] = ['INSERT', 'INSERT', 'INSERT', 'UPDATE', 'UPDATE', 'DELETE'];
  const statuses: SyncQueueEntry['status'][] = ['pending', 'pending', 'syncing', 'done', 'done', 'done', 'failed'];

  return {
    id: `sync-${_syncId}`,
    table: SYNC_TABLES[_syncId % SYNC_TABLES.length],
    operation: ops[_syncId % ops.length],
    status: statuses[_syncId % statuses.length],
    retries: Math.floor(Math.random() * 2),
    timestamp: new Date().toISOString(),
    size: 120 + Math.floor(Math.random() * 480),
  };
}

interface AIReasoning {
  id: string;
  model: string;
  input: string;
  output: string;
  latencyMs: number;
  tokens: number;
  confidence: number;
}

const AI_REASONING_PAIRS = [
  { input: 'HR: 74bpm, SpO₂: 97%, Activity: resting', output: 'Patient stable. No intervention required. Continue monitoring.' },
  { input: 'HR: 88bpm, SpO₂: 96%, Activity: walking', output: 'Elevated HR consistent with physical activity. Normal range.' },
  { input: 'HR: 52bpm, SpO₂: 95%, Activity: sleeping', output: 'Low HR during sleep — expected. SpO₂ slightly below threshold. Watch for trend.' },
  { input: 'Reminder: medication at 08:00, not acknowledged', output: 'Sending reminder alert. Escalating to mobile app notification.' },
  { input: 'Gas sensor: CO₂=420ppm, CO=0ppm', output: 'CO₂ within acceptable range. CO clear. No emergency action required.' },
];

let _aiId = 0;
export function generateAIReasoning(): AIReasoning {
  _aiId++;
  const pair = AI_REASONING_PAIRS[_aiId % AI_REASONING_PAIRS.length];
  return {
    id: `ai-${_aiId}`,
    model: _aiId % 3 === 0 ? 'qwen2.5:3b' : 'medgemma:4b',
    input: pair.input,
    output: pair.output,
    latencyMs: 140 + Math.floor(Math.random() * 120),
    tokens: 90 + Math.floor(Math.random() * 80),
    confidence: 0.88 + Math.random() * 0.11,
  };
}
