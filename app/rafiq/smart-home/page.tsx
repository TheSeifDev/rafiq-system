'use client';

import { motion } from 'framer-motion';
import {
  Home, Wifi, Zap, Shield, Tv, Wind, Lightbulb,
  Blinds, Bell, Droplets, Thermometer, Radio,
  AlertTriangle, CheckCircle, ArrowRight, GitBranch,
  Settings, Activity,
} from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import StatusPulse from '@/src/features/rafiq/shared/components/StatusPulse';

const DEVICES = [
  { icon: <Tv size={16} strokeWidth={1.5} />, label: 'Smart TV', zone: 'Living Room', protocol: 'MQTT', count: 1, color: 'text-blue-400' },
  { icon: <Wind size={16} strokeWidth={1.5} />, label: 'Air Conditioner', zone: 'All Zones', protocol: 'MQTT/IR', count: 4, color: 'text-blue-400' },
  { icon: <Lightbulb size={16} strokeWidth={1.5} />, label: 'Smart Lights', zone: '8 Zones', protocol: 'Zigbee', count: 8, color: 'text-amber-400' },
  { icon: <Blinds size={16} strokeWidth={1.5} />, label: 'Curtains', zone: 'Bedroom/Living', protocol: 'Zigbee', count: 3, color: 'text-emerald-400' },
  { icon: <Bell size={16} strokeWidth={1.5} />, label: 'Alarm Siren', zone: 'Hallway', protocol: 'MQTT', count: 1, color: 'text-[#FF3B3B]' },
  { icon: <Droplets size={16} strokeWidth={1.5} />, label: 'Water Valves', zone: 'Kitchen/Bath', protocol: 'MQTT/GPIO', count: 2, color: 'text-blue-400' },
  { icon: <Thermometer size={16} strokeWidth={1.5} />, label: 'Env Sensors', zone: 'All Rooms', protocol: 'Zigbee', count: 6, color: 'text-emerald-400' },
  { icon: <Radio size={16} strokeWidth={1.5} />, label: 'Motion Sensors', zone: 'Entry/Hall', protocol: 'Zigbee', count: 4, color: 'text-white/60' },
];

const AUTOMATIONS = [
  { name: 'Sleep Mode', trigger: 'Time 23:00 / Voice', actions: 'Lights off → AC 22°C → Curtains close → TV off', type: 'Routine' },
  { name: 'Morning Routine', trigger: 'Time 07:00', actions: 'Lights 30% → Curtains open → AC off → Alarm off', type: 'Routine' },
  { name: 'Gas Emergency', trigger: 'MQ-2/4 > threshold', actions: 'Valves off → Windows open → Alarm → SMS', type: 'Emergency' },
  { name: 'Fire Evacuation', trigger: 'Smoke + Temp spike', actions: 'All lights 100% → Doors unlock → Alarm → Call', type: 'Emergency' },
  { name: 'Away Mode', trigger: 'All phones off LAN', actions: 'Lights off → AC off → Alarm arm → Locks secure', type: 'Security' },
  { name: 'Welcome Home', trigger: 'Phone joins LAN', actions: 'Entry light on → AC on → Disarm alarm', type: 'Routine' },
  { name: 'Leak Detection', trigger: 'Water sensor wet', actions: 'Main valve off → Alert → Log event', type: 'Emergency' },
  { name: 'Night Security', trigger: 'Motion after 00:00', actions: 'Lights flash → Camera record → Alert', type: 'Security' },
];

const haAutomationYaml = `# Home Assistant Automation — Emergency Gas Protocol
alias: "RAQEEB Gas Emergency Response"
description: "Triggered when MQ-2 or MQ-4 exceeds safety threshold"
trigger:
  - platform: mqtt
    topic: "rafiq/raqeeb/alert"
    payload: "GAS_DETECTED"
  - platform: state
    entity_id: sensor.mq2_lpg_ppm
    above: 1000
  - platform: state
    entity_id: sensor.mq4_methane_ppm
    above: 800

condition:
  - condition: not
    conditions:
      - condition: state
        entity_id: input_boolean.emergency_acknowledged
        state: "on"

action:
  - service: switch.turn_off
    target:
      entity_id:
        - switch.gas_valve_kitchen
        - switch.gas_valve_bathroom
  - service: cover.open_cover
    target:
      entity_id: cover.living_room_curtains
  - service: siren.turn_on
    target:
      entity_id: siren.hallway_alarm
    data:
      tone: emergency
      volume_level: 1.0
  - service: notify.rafiq_sms_gateway
    data:
      message: "⚠️ GAS ALERT: Valves closed, evacuation initiated at {{ now() }}"
  - service: mqtt.publish
    data:
      topic: "rafiq/core/emergency"
      payload: '{"type":"GAS","level":"CRITICAL","ts":"{{ now().isoformat() }}"}'
      qos: 2
      retain: true

mode: single`;

const mqttCommandExample = `# MQTT Device Control — Direct Command Protocol
# Topic structure: rafiq/home/{zone}/{device}/{command}

# Turn off all lights in bedroom zone
mosquitto_pub -h localhost -p 1883 \\
  -t "rafiq/home/bedroom/lights/set" \\
  -m '{"state":"OFF","transition":2}' \\
  -q 1

# Set AC to sleep mode (22°C, low fan)
mosquitto_pub -h localhost -p 1883 \\
  -t "rafiq/home/bedroom/ac/set" \\
  -m '{"mode":"cool","temp":22,"fan":"low","swing":"auto"}' \\
  -q 1

# Emergency valve shutdown
mosquitto_pub -h localhost -p 1883 \\
  -t "rafiq/home/all/valves/emergency_close" \\
  -m '{"action":"CLOSE_ALL","reason":"GAS_DETECTED","ts":1716322231}' \\
  -q 2 --retain

# Subscribe to all device state changes
mosquitto_sub -h localhost -p 1883 \\
  -t "rafiq/home/#" \\
  -v

# Example state update received:
# rafiq/home/kitchen/valve → {"state":"CLOSED","psi":0,"ts":1716322231}
# rafiq/home/bedroom/lights → {"state":"OFF","brightness":0,"ts":1716322231}`;

export default function SmartHomePage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        
        <SectionHeader
          eyebrow="Automation Layer"
          title="Smart Home Control"
          description="Home Assistant orchestrates 22+ IoT devices across 8 zones using MQTT and Zigbee protocols. All automation rules execute locally — zero cloud dependency for critical operations including emergency shutdowns."
          status="online"
          statusLabel="22 Devices Active"
          layer="Automation Layer"
          version="HA 2024.4"
          metrics={[
            { label: 'Devices', value: '22', variant: 'green' },
            { label: 'Automations', value: '14', variant: 'green' },
            { label: 'Execution', value: 'Local-First', variant: 'blue' },
          ]}
        />

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Core Components
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ArchCard
              icon={<Home size={16} strokeWidth={1.5} />}
              title="Home Assistant Core"
              sublabel="WebSocket API · WAMP Protocol"
              description="Central automation controller running locally on the MiniPC. Manages device registry, automation rules, state machine, and exposes WebSocket API to RAFIQ Core for bidirectional control."
              status="online"
              metrics={[{ label: 'API', value: 'WebSocket' }, { label: 'Protocol', value: 'WAMP' }, { label: 'Port', value: '8123' }]}
              tags={['Local', 'WebSocket', 'Python']}
              accent="red"
              delay={0.05}
            />
            <ArchCard
              icon={<Radio size={16} strokeWidth={1.5} />}
              title="MQTT Broker (Mosquitto)"
              sublabel="Message Bus · QoS 0-2"
              description="Central message broker handling all device telemetry and command traffic. Runs on localhost:1883 with persistent sessions, retained messages, and LWT (Last Will & Testament) for device health."
              status="online"
              metrics={[{ label: 'Port', value: '1883' }, { label: 'QoS', value: '0–2' }, { label: 'TLS', value: 'Local' }]}
              tags={['MQTT', 'Mosquitto', 'Pub/Sub']}
              accent="blue"
              delay={0.1}
            />
            <ArchCard
              icon={<Zap size={16} strokeWidth={1.5} />}
              title="Automation Engine"
              sublabel="Local-First · Rule Executor"
              description="HA automation engine evaluates 14 active rules against real-time state. All emergency automations run synchronously with no external dependency — gas detection to valve close in under 200ms."
              status="online"
              metrics={[{ label: 'Rules', value: '14 active' }, { label: 'Response', value: '<200ms' }, { label: 'Cloud', value: 'Not required' }]}
              tags={['Local-First', 'Rule Engine', 'State Machine']}
              accent="emerald"
              delay={0.15}
            />
            <ArchCard
              icon={<GitBranch size={16} strokeWidth={1.5} />}
              title="Zigbee2MQTT Bridge"
              sublabel="Zigbee Coordinator · USB Dongle"
              description="Translates Zigbee protocol (IEEE 802.15.4) to MQTT. Manages pairing, device discovery, and OTA updates for 18 Zigbee devices including all lights, sensors, and curtain motors."
              status="online"
              metrics={[{ label: 'Devices', value: '18 Zigbee' }, { label: 'Channel', value: '15' }, { label: 'Dongle', value: 'CC2652P' }]}
              tags={['Zigbee', 'IEEE 802.15.4', 'Z2M']}
              accent="amber"
              delay={0.2}
            />
          </div>
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Device Catalog · 22 Total
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEVICES.map((device, i) => (
              <motion.div
                key={device.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
              >
                <div className={`mb-3 ${device.color}`}>{device.icon}</div>
                <div className="text-[12px] font-bold text-white">{device.label}</div>
                <div className="mt-1 font-mono text-[9px] text-white/30">{device.zone}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded border border-white/[0.07] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[8px] text-white/30">
                    {device.protocol}
                  </span>
                  <span className="font-mono text-[10px] text-white/45">×{device.count}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        
        <InfraPanel title="Local vs Cloud Automation Execution" subtitle="execution topology" glow="red">
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-[12px] font-bold text-emerald-400">Local Execution</span>
              </div>
              <ul className="space-y-2">
                {[
                  'Home Assistant runs on MiniPC (Ubuntu)',
                  'Automation rules stored in local YAML',
                  'MQTT broker on localhost — zero latency',
                  'Emergency gas/fire: <200ms response',
                  'Works without internet connection',
                  'Valve control direct via GPIO relay',
                  'State machine persisted to SQLite',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-white/45">
                    <ArrowRight size={10} className="mt-0.5 shrink-0 text-emerald-400/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wifi size={14} className="text-blue-400" />
                <span className="text-[12px] font-bold text-blue-400">Cloud-Enhanced (Optional)</span>
              </div>
              <ul className="space-y-2">
                {[
                  'Remote access via Supabase Realtime',
                  'Sync automation history to cloud',
                  'SMS alerts via cloud gateway (fallback)',
                  'Mobile app pushes via FCM',
                  'AI recommendations from health data',
                  'Dashboard accessible from phone remotely',
                  'Cloud status never blocks local actions',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-white/45">
                    <ArrowRight size={10} className="mt-0.5 shrink-0 text-blue-400/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </InfraPanel>

        
        <DataTable
          title="Active Automations"
          subtitle="14 automations · local-first execution"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'trigger', label: 'Trigger' },
            { key: 'actions', label: 'Actions' },
            {
              key: 'type',
              label: 'Type',
              render: (row) => {
                const colors: Record<string, string> = {
                  Emergency: 'text-[#FF3B3B] border-[#FF3B3B]/20 bg-[#FF3B3B]/5',
                  Security: 'text-amber-400 border-amber-400/20 bg-amber-400/5',
                  Routine: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5',
                };
                const c = colors[row.type as string] ?? 'text-white/40';
                return (
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${c}`}>
                    {row.type as string}
                  </span>
                );
              },
            },
          ]}
          data={AUTOMATIONS}
          compact
        />

        
        <InfraPanel title="Emergency Evacuation Sequence" subtitle="gas detected → full response" glow="red">
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { step: '01', label: 'Gas Sensor', detail: 'MQ-2 / MQ-4 threshold exceeded', color: 'border-[#FF3B3B]/25 text-[#FF3B3B]' },
                { step: '02', label: 'ESP32 MCU', detail: 'Independent threshold check', color: 'border-amber-400/25 text-amber-400' },
                { step: '03', label: 'Valve Close', detail: 'GPIO relay off in <50ms', color: 'border-amber-400/25 text-amber-400' },
                { step: '04', label: 'MQTT Alert', detail: 'Publish to rafiq/raqeeb/alert', color: 'border-blue-400/25 text-blue-400' },
                { step: '05', label: 'HA Trigger', detail: 'Automation fires instantly', color: 'border-blue-400/25 text-blue-400' },
                { step: '06', label: 'Open Windows', detail: 'Curtains → open position', color: 'border-emerald-400/25 text-emerald-400' },
                { step: '07', label: 'Alarm Siren', detail: '100% volume emergency tone', color: 'border-emerald-400/25 text-emerald-400' },
                { step: '08', label: 'Notify', detail: 'SMS + App + RAFIQ Core log', color: 'border-emerald-400/25 text-emerald-400' },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-2">
                  <div className={`rounded-xl border bg-white/[0.02] px-3 py-2 ${s.color}`}>
                    <div className="font-mono text-[8px] text-white/25">{s.step}</div>
                    <div className="text-[11px] font-bold text-white">{s.label}</div>
                    <div className="font-mono text-[9px] text-white/35">{s.detail}</div>
                  </div>
                  {i < 7 && <ArrowRight size={12} className="shrink-0 text-white/20" />}
                </div>
              ))}
            </div>
          </div>
        </InfraPanel>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Configuration Examples
          </p>
          <div className="space-y-5">
            <CodeBlock
              code={haAutomationYaml}
              language="yaml"
              title="automations/gas_emergency.yaml"
            />
            <CodeBlock
              code={mqttCommandExample}
              language="bash"
              title="mqtt_device_control.sh"
            />
          </div>
        </section>

        
        <InfraPanel title="HA WebSocket API Integration" subtitle="RAFIQ Core ↔ Home Assistant" glow="blue">
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            {[
              { icon: <Activity size={14} />, label: 'Subscribe Events', detail: 'RAFIQ Core subscribes to state_changed events via WebSocket. All device state updates stream in real-time to the event bus.', color: 'text-emerald-400' },
              { icon: <Settings size={14} />, label: 'Call Services', detail: 'RAFIQ triggers HA services (light.turn_on, climate.set_temperature) via JSON-RPC over WebSocket, authenticated by long-lived token.', color: 'text-blue-400' },
              { icon: <Shield size={14} />, label: 'Emergency Override', detail: 'RAQEEB ESP32 bypasses WebSocket via direct MQTT. HA listens to emergency topics and triggers automations even if RAFIQ Core is down.', color: 'text-[#FF3B3B]' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className={`mb-2 flex items-center gap-2 ${item.color}`}>
                  {item.icon}
                  <span className="text-[12px] font-bold text-white">{item.label}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-white/40">{item.detail}</p>
              </div>
            ))}
          </div>
        </InfraPanel>

      </div>
    </div>
  );
}
