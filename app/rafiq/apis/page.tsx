'use client';

import { motion } from 'framer-motion';
import {
  Globe, Zap, Radio, Shield, Lock, ArrowRight,
  Webhook, Wifi, Server,
} from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';

const REST_ENDPOINTS = [
  { method: 'GET',  path: '/api/v1/health',                  description: 'Full system health status, service states, uptime',     auth: 'None',   response: '200 HealthStatus' },
  { method: 'GET',  path: '/api/v1/patient/{id}',            description: 'Patient profile, demographics, linked devices',          auth: 'Bearer', response: '200 Patient' },
  { method: 'GET',  path: '/api/v1/wearable/latest',         description: 'Most recent wearable reading for active patient',        auth: 'Bearer', response: '200 WearableReading' },
  { method: 'POST', path: '/api/v1/wearable',                description: 'Push raw wearable sensor data into the pipeline',        auth: 'Bearer', response: '201 Created' },
  { method: 'GET',  path: '/api/v1/alerts?limit=20',         description: 'Paginated recent alert events, sorted by severity',     auth: 'Bearer', response: '200 Alert[]' },
  { method: 'POST', path: '/api/v1/alerts/{id}/acknowledge', description: 'Mark an alert as acknowledged with optional note',       auth: 'Bearer', response: '200 Alert' },
  { method: 'GET',  path: '/api/v1/ai/status',               description: 'AI engine status, loaded models, queue depth',          auth: 'Bearer', response: '200 AIStatus' },
  { method: 'POST', path: '/api/v1/ai/query',                description: 'Submit a health query to the AI reasoning engine',      auth: 'Bearer', response: '200 AIResponse' },
  { method: 'GET',  path: '/api/v1/sync/status',             description: 'Sync engine state, queue depth, last sync timestamp',   auth: 'Bearer', response: '200 SyncStatus' },
  { method: 'POST', path: '/api/v1/emergency/trigger',       description: 'Manually trigger emergency protocol (requires PIN)',    auth: 'Bearer', response: '202 Accepted' },
  { method: 'GET',  path: '/api/v1/home/devices',            description: 'All registered Home Assistant devices with state',      auth: 'Bearer', response: '200 Device[]' },
  { method: 'POST', path: '/api/v1/home/command',            description: 'Send a command to a specific home device',              auth: 'Bearer', response: '200 CommandResult' },
];

const WS_EVENTS = [
  { event: 'wearable_update',  direction: 'Server→Client', payload: '{ device_id, hr, spo2, temp, timestamp }',                   description: 'Real-time vitals from wearable device, emitted every 2s' },
  { event: 'ai_decision',      direction: 'Server→Client', payload: '{ decision_id, type, severity, reasoning, actions[] }',      description: 'AI engine decision output after health analysis' },
  { event: 'emergency_alert',  direction: 'Server→Client', payload: '{ alert_id, type, level, location, triggered_at }',          description: 'Critical safety event requiring immediate attention' },
  { event: 'sync_status',      direction: 'Server→Client', payload: '{ state, queue_depth, last_sync, pending_records }',         description: 'Sync engine heartbeat and queue state update' },
  { event: 'device_state',     direction: 'Server→Client', payload: '{ device_id, entity_id, state, attributes, changed_at }',   description: 'Home Assistant device state change broadcast' },
  { event: 'ping',             direction: 'Client→Server', payload: '{ ts: number }',                                             description: 'Client keepalive — server responds with pong' },
  { event: 'subscribe',        direction: 'Client→Server', payload: '{ topics: string[] }',                                       description: 'Subscribe to specific event streams by topic key' },
];

const MQTT_TOPICS = [
  { topic: 'rafiq/wearable/{device_id}/heartrate', qos: '1', retain: 'No',  publisher: 'Wearable',       payload: '{ bpm: int, quality: float, timestamp: str }' },
  { topic: 'rafiq/wearable/{device_id}/spo2',      qos: '1', retain: 'No',  publisher: 'Wearable',       payload: '{ spo2: float, pi: float, timestamp: str }' },
  { topic: 'rafiq/sensor/gas/{sensor_id}',          qos: '2', retain: 'No',  publisher: 'ESP32 MCU',      payload: '{ ppm: float, gas_type: str, alarm: bool }' },
  { topic: 'rafiq/emergency/alert',                 qos: '2', retain: 'Yes', publisher: 'Core Engine',    payload: '{ type: str, level: str, triggered_at: str }' },
  { topic: 'rafiq/home/{room}/{device}/command',    qos: '1', retain: 'No',  publisher: 'Core Engine',    payload: '{ action: str, params: {}, request_id: str }' },
  { topic: 'rafiq/ai/response',                     qos: '1', retain: 'No',  publisher: 'AI Orchestrator', payload: '{ query_id: str, decision: str, confidence: float }' },
  { topic: 'rafiq/sync/status',                     qos: '0', retain: 'Yes', publisher: 'Sync Engine',    payload: '{ state: str, queue_depth: int, last_sync: str }' },
];

const FAILURE_MATRIX = [
  { scenario: 'Internet Down',         detection: 'Supabase HTTP timeout >5s',   rto: '0s (offline queue)', rpm: '0 records', severity: 'Low' },
  { scenario: 'MQTT Broker Down',      detection: 'Client disconnect event',      rto: '< 3s (API fallback)', rpm: 'None', severity: 'Medium' },
  { scenario: 'AI Engine Timeout',     detection: 'Inference >5s watchdog',       rto: '< 1s (rules engine)', rpm: 'None', severity: 'Medium' },
];

const CURL_EXAMPLE = `# Authenticate and query AI engine
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{"patient_id": "pt-001", "pin": "1234"}' | jq -r .access_token)

# POST to AI query endpoint
curl -s -X POST http://localhost:8000/api/v1/ai/query \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Patient HR 118 bpm, SpO2 93%, temp 38.5°C. Assess urgency.",
    "context": "elderly_patient",
    "stream": false
  }' | jq .

# Get latest wearable reading
curl -s http://localhost:8000/api/v1/wearable/latest \\
  -H "Authorization: Bearer $TOKEN" | jq .`;

const WS_PYTHON = `import asyncio
import json
import websockets

async def monitor_rafiq():
    uri = "ws://localhost:8000/ws/monitor"
    
    async with websockets.connect(uri) as ws:
        # Subscribe to specific event streams
        await ws.send(json.dumps({
            "event": "subscribe",
            "topics": ["wearable_update", "ai_decision", "emergency_alert"]
        }))
        
        print("Connected to RAFIQ WebSocket monitor")
        
        async for message in ws:
            data = json.loads(message)
            event_type = data.get("event")
            
            if event_type == "wearable_update":
                print(f"[VITALS] HR={data['payload']['hr']} SpO2={data['payload']['spo2']}")
            
            elif event_type == "ai_decision":
                severity = data['payload']['severity']
                print(f"[AI] Severity={severity}: {data['payload']['reasoning'][:80]}")
            
            elif event_type == "emergency_alert":
                print(f"[EMERGENCY] {data['payload']['type']} — {data['payload']['level']}")
            
            # Send periodic keepalive
            await ws.send(json.dumps({"event": "ping", "ts": asyncio.get_event_loop().time()}))

asyncio.run(monitor_rafiq())`;

const MQTT_PYTHON = `import paho.mqtt.client as mqtt
import json

BROKER_HOST = "localhost"
BROKER_PORT = 1883

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker (rc={rc})")
    # Subscribe to all wearable data and emergency alerts
    client.subscribe("rafiq/wearable/#", qos=1)
    client.subscribe("rafiq/emergency/alert", qos=2)
    client.subscribe("rafiq/ai/response", qos=1)
    client.subscribe("rafiq/sync/status", qos=0)

def on_message(client, userdata, msg):
    topic = msg.topic
    try:
        payload = json.loads(msg.payload.decode())
    except json.JSONDecodeError:
        payload = msg.payload.decode()
    
    if "heartrate" in topic:
        print(f"[HR] {topic.split('/')[2]}: {payload['bpm']} bpm")
    elif "spo2" in topic:
        print(f"[SpO2] {topic.split('/')[2]}: {payload['spo2']}%")
    elif topic == "rafiq/emergency/alert":
        print(f"[ALERT] {payload['type']} — Level: {payload['level']}")
    elif topic == "rafiq/ai/response":
        print(f"[AI] Query {payload['query_id']}: {payload['decision']}")

client = mqtt.Client(client_id="rafiq-monitor", protocol=mqtt.MQTTv5)
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
client.loop_forever()`;

const AUTH_HEADER = `# JWT Bearer Token — included in all protected API requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Token payload structure
{
  "sub": "pt-001",           # Patient ID
  "role": "patient",         # Role: patient | caregiver | admin
  "iat": 1716000000,         # Issued at (Unix timestamp)
  "exp": 1716086400,         # Expires at (+24h)
  "device_ids": ["wb-a1b2"]  # Authorized wearable devices
}

# Token refresh — POST /api/v1/auth/refresh
curl -X POST http://localhost:8000/api/v1/auth/refresh \\
  -H "Authorization: Bearer <refresh_token>"`;

const API_GATEWAYS = [
  {
    icon: <Globe size={16} strokeWidth={1.5} />,
    title: 'REST API Gateway',
    sublabel: 'FastAPI · HTTP/1.1 · JSON · Port 8000',
    description: 'Full CRUD REST interface for all RAFIQ resources. Supports JSON request/response, pagination, filtering, and streaming. JWT authenticated. Rate limited to 500 req/min per client.',
    status: 'online' as const,
    metrics: [{ label: 'Endpoints', value: '24+' }, { label: 'Auth', value: 'JWT Bearer' }, { label: 'Timeout', value: '30s' }],
    tags: ['OpenAPI 3.1', 'FastAPI', 'Pydantic v2', 'asyncio'],
    accent: 'red' as const,
  },
  {
    icon: <Webhook size={16} strokeWidth={1.5} />,
    title: 'WebSocket Gateway',
    sublabel: 'WS · Async push · Event bus',
    description: 'Persistent bidirectional connection for real-time events. Multiplexes all system events over a single socket with topic-based subscription filtering. Handles up to 50 concurrent clients.',
    status: 'online' as const,
    metrics: [{ label: 'Events/s', value: '~15' }, { label: 'Clients', value: '50 max' }, { label: 'Protocol', value: 'WS/13' }],
    tags: ['WebSockets', 'asyncio', 'broadcast', 'topic filter'],
    accent: 'blue' as const,
  },
  {
    icon: <Wifi size={16} strokeWidth={1.5} />,
    title: 'MQTT Broker',
    sublabel: 'Mosquitto 2.0 · Port 1883 · QoS 0/1/2',
    description: 'Local MQTT broker for all IoT device communication. Handles wearable telemetry, gas sensor data, emergency signals, and home device commands with QoS guarantees and retained messages.',
    status: 'online' as const,
    metrics: [{ label: 'Topics', value: '15+ active' }, { label: 'QoS', value: '0 / 1 / 2' }, { label: 'LWT', value: 'enabled' }],
    tags: ['Mosquitto', 'TLS', 'Retained', 'Last-Will-Testament'],
    accent: 'red' as const,
  },
  {
    icon: <Lock size={16} strokeWidth={1.5} />,
    title: 'Authentication',
    sublabel: 'JWT · HS256 · 24h TTL',
    description: 'PIN-based patient authentication that issues short-lived JWT access tokens and long-lived refresh tokens. All API calls except /health require a valid Bearer token. Tokens embed patient ID and role.',
    status: 'online' as const,
    metrics: [{ label: 'Algorithm', value: 'HS256' }, { label: 'TTL', value: '24h' }, { label: 'Refresh', value: '7d' }],
    tags: ['JWT', 'HMAC-SHA256', 'RBAC', 'PIN auth'],
    accent: 'blue' as const,
  },
];

export default function ApisPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        
        <SectionHeader
          eyebrow="API Reference"
          title="RAFIQ API Layer"
          description="Complete interface documentation for all three API surfaces: REST HTTP endpoints, WebSocket real-time event streams, and MQTT IoT message topics. All interfaces operate locally and function without internet connectivity."
          status="online"
          layer="API Layer"
          version="v2.1.0"
          metrics={[
            { label: 'REST Endpoints', value: '24+', variant: 'green' },
            { label: 'WS Events', value: '7 types', variant: 'blue' },
            { label: 'MQTT Topics', value: '15 active', variant: 'green' },
          ]}
        />

        
        <div>
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            API Surfaces · 4 gateways
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {API_GATEWAYS.map((g, i) => (
              <ArchCard key={g.title} {...g} delay={i * 0.05} />
            ))}
          </div>
        </div>

        
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Globe size={13} className="text-[#FF3B3B]/60" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              REST Endpoints · Base URL: http://localhost:8000
            </h2>
          </div>
          <DataTable
            columns={[
              {
                key: 'method',
                label: 'Method',
                render: (row) => (
                  <span className={[
                    'rounded px-2 py-0.5 font-mono text-[9px] font-bold',
                    (row as typeof REST_ENDPOINTS[0]).method === 'GET'
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : 'bg-[#FF3B3B]/10 text-[#FF3B3B]',
                  ].join(' ')}>
                    {(row as typeof REST_ENDPOINTS[0]).method}
                  </span>
                ),
              },
              { key: 'path', label: 'Path', className: 'min-w-[240px]' },
              { key: 'description', label: 'Description', className: 'min-w-[280px]' },
              {
                key: 'auth',
                label: 'Auth',
                render: (row) => (
                  <span className={[
                    'font-mono text-[10px]',
                    (row as typeof REST_ENDPOINTS[0]).auth === 'None'
                      ? 'text-white/30'
                      : 'text-amber-400/70',
                  ].join(' ')}>
                    {(row as typeof REST_ENDPOINTS[0]).auth}
                  </span>
                ),
              },
              { key: 'response', label: 'Response' },
            ]}
            data={REST_ENDPOINTS as unknown as Record<string, unknown>[]}
            title="REST API Endpoints"
            subtitle="All endpoints return JSON. Non-200 responses include { error, code, detail } schema."
          />
        </div>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              cURL Example
            </h2>
            <CodeBlock code={CURL_EXAMPLE} language="bash" title="terminal" />
          </div>
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              Authentication Header
            </h2>
            <CodeBlock code={AUTH_HEADER} language="http" title="auth.http" />
          </div>
        </div>

        
        <div>
          <InfraPanel
            title="WebSocket Gateway"
            subtitle="ws://localhost:8000/ws/monitor — persistent bidirectional event stream"
            glow="red"
            noPadding
          >
            <div className="p-5 pb-0">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="font-mono text-[10px] text-emerald-400/70">Connection live · 7 event types</span>
              </div>
            </div>
            <DataTable
              columns={[
                { key: 'event', label: 'Event Type', className: 'min-w-[160px]' },
                {
                  key: 'direction',
                  label: 'Direction',
                  render: (row) => (
                    <span className={[
                      'font-mono text-[9px]',
                      (row as typeof WS_EVENTS[0]).direction.startsWith('Server')
                        ? 'text-blue-400/70'
                        : 'text-amber-400/70',
                    ].join(' ')}>
                      {(row as typeof WS_EVENTS[0]).direction}
                    </span>
                  ),
                },
                { key: 'payload', label: 'Payload Schema', className: 'min-w-[320px]' },
                { key: 'description', label: 'Description', className: 'min-w-[240px]' },
              ]}
              data={WS_EVENTS as unknown as Record<string, unknown>[]}
            />
          </InfraPanel>
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            WebSocket Client · Python
          </h2>
          <CodeBlock code={WS_PYTHON} language="python" title="ws_monitor.py" />
        </div>

        
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Radio size={13} className="text-white/30" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              MQTT Topics · Broker: localhost:1883
            </h2>
          </div>
          <DataTable
            columns={[
              { key: 'topic', label: 'Topic Pattern', className: 'min-w-[280px]' },
              {
                key: 'qos',
                label: 'QoS',
                align: 'center',
                render: (row) => (
                  <span className={[
                    'rounded px-1.5 py-0.5 font-mono text-[9px] font-bold',
                    (row as typeof MQTT_TOPICS[0]).qos === '2'
                      ? 'bg-[#FF3B3B]/10 text-[#FF3B3B]'
                      : (row as typeof MQTT_TOPICS[0]).qos === '1'
                        ? 'bg-amber-400/10 text-amber-400'
                        : 'bg-white/5 text-white/30',
                  ].join(' ')}>
                    QoS {(row as typeof MQTT_TOPICS[0]).qos}
                  </span>
                ),
              },
              {
                key: 'retain',
                label: 'Retain',
                align: 'center',
                render: (row) => (
                  <span className={(row as typeof MQTT_TOPICS[0]).retain === 'Yes' ? 'text-emerald-400/70' : 'text-white/25'}>
                    {(row as typeof MQTT_TOPICS[0]).retain}
                  </span>
                ),
              },
              { key: 'publisher', label: 'Publisher' },
              { key: 'payload', label: 'Payload Schema', className: 'min-w-[280px]' },
            ]}
            data={MQTT_TOPICS as unknown as Record<string, unknown>[]}
            title="MQTT Topic Map"
            subtitle="All topics use UTF-8 JSON payloads. Wildcards: + (single level), # (multi-level)"
          />
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            MQTT Subscriber · paho-mqtt Python
          </h2>
          <CodeBlock code={MQTT_PYTHON} language="python" title="mqtt_subscriber.py" />
        </div>

        
        <InfraPanel title="Rate Limits & Constraints" subtitle="Applied per client IP / token" glow="blue">
          <div className="grid grid-cols-2 gap-6 p-5 sm:grid-cols-4">
            {[
              { label: 'REST Rate Limit',    value: '500 req/min',    note: 'Per token' },
              { label: 'WS Max Clients',     value: '50 concurrent',  note: 'Local network' },
              { label: 'MQTT Max Payload',   value: '256 KB',         note: 'Per message' },
              { label: 'AI Query Timeout',   value: '30s',            note: 'Hard cutoff' },
              { label: 'Auth Token TTL',     value: '24h',            note: 'Access token' },
              { label: 'Refresh Token TTL',  value: '7 days',         note: 'Refresh token' },
              { label: 'Max Body Size',      value: '10 MB',          note: 'REST POST/PUT' },
              { label: 'WS Ping Interval',   value: '30s',            note: 'Keepalive' },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/22">
                  {item.label}
                </span>
                <span className="font-mono text-[12px] font-bold text-white/70">{item.value}</span>
                <span className="font-mono text-[9px] text-white/25">{item.note}</span>
              </div>
            ))}
          </div>
        </InfraPanel>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Error Response Schema
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CodeBlock
              code={`# Standard error envelope
{
  "error": "UNAUTHORIZED",
  "code": 401,
  "detail": "Token expired or invalid signature",
  "request_id": "req_xK9mN2pL",
  "timestamp": "2025-05-21T10:23:01Z"
}

# Validation error (422)
{
  "error": "VALIDATION_ERROR",
  "code": 422,
  "detail": [
    { "field": "hr", "msg": "must be between 20 and 250" }
  ]
}`}
              language="json"
              title="error_response.json"
            />
            <CodeBlock
              code={`# HTTP Status Code Reference
200  OK            — Successful GET / POST response
201  Created       — Resource created (POST /wearable)
202  Accepted      — Async operation started (emergency trigger)
400  Bad Request   — Invalid request body / params
401  Unauthorized  — Missing or expired JWT token
403  Forbidden     — Token lacks required role/scope
404  Not Found     — Resource does not exist
422  Unprocessable — Schema validation failure
429  Rate Limited  — Exceeded 500 req/min limit
500  Server Error  — Internal error (check logs)
503  Unavailable   — Service temporarily degraded`}
              language="bash"
              title="http_codes.txt"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
