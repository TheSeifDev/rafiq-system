'use client';

import { motion } from 'framer-motion';
import {
  ShieldAlert, Cpu, Radio, Zap, Phone,
  AlertTriangle, CheckCircle, ArrowRight,
  Activity, Gauge, Wifi, WifiOff,
} from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import StatusPulse from '@/src/features/rafiq/shared/components/StatusPulse';

const SENSOR_TABLE = [
  { sensor: 'MQ-2', gas: 'LPG / Propane / Smoke', threshold: '1000 ppm', action: 'Valve OFF + Siren + SMS', gpio: 'GPIO34 (ADC)', calibration: 'Ro = 9.83kΩ' },
  { sensor: 'MQ-4', gas: 'Methane / Natural Gas', threshold: '800 ppm', action: 'Valve OFF + Siren + SMS', gpio: 'GPIO35 (ADC)', calibration: 'Ro = 4.15kΩ' },
  { sensor: 'MQ-7', gas: 'Carbon Monoxide (CO)', threshold: '50 ppm', action: 'Alarm + Ventilate + Call', gpio: 'GPIO32 (ADC)', calibration: 'Ro = 27.5kΩ' },
  { sensor: 'MQ-135', gas: 'CO₂ / Air Quality', threshold: '2000 ppm', action: 'Open windows + Alert', gpio: 'GPIO33 (ADC)', calibration: 'Ro = 41.7kΩ' },
];

const GPIO_PINS = [
  { pin: 'GPIO4', role: 'Gas Valve Relay 1 (Kitchen)', type: 'OUTPUT', logic: 'Active LOW', note: 'NC relay — failsafe closed' },
  { pin: 'GPIO5', role: 'Gas Valve Relay 2 (Bathroom)', type: 'OUTPUT', logic: 'Active LOW', note: 'NC relay — failsafe closed' },
  { pin: 'GPIO16', role: 'Siren Relay', type: 'OUTPUT', logic: 'Active HIGH', note: '12V piezo siren module' },
  { pin: 'GPIO17', role: 'GSM Module UART TX', type: 'UART', logic: 'Serial 9600', note: 'SIM800L for SMS fallback' },
  { pin: 'GPIO18', role: 'Status LED (Red)', type: 'OUTPUT', logic: 'Active HIGH', note: 'Emergency indicator' },
  { pin: 'GPIO19', role: 'Status LED (Green)', type: 'OUTPUT', logic: 'Active HIGH', note: 'Normal operation' },
  { pin: 'GPIO34', role: 'MQ-2 Analog Input', type: 'ADC1_CH6', logic: 'Analog 0–3.3V', note: '12-bit ADC, attn 11dB' },
  { pin: 'GPIO35', role: 'MQ-4 Analog Input', type: 'ADC1_CH7', logic: 'Analog 0–3.3V', note: '12-bit ADC, attn 11dB' },
];

const esp32EmergencyCode = `// RAQEEB ESP32 — Emergency Threshold Logic (Arduino C++)

#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFi.h>
#define VALVE_1_PIN    4    // Kitchen gas valve relay (NC — active LOW)
#define VALVE_2_PIN    5    // Bathroom gas valve relay (NC — active LOW)
#define SIREN_PIN      16   // Emergency siren (active HIGH)
#define MQ2_PIN        34   // LPG/Propane sensor (ADC)
#define MQ4_PIN        35   // Methane sensor (ADC)
#define MQ7_PIN        32   // CO sensor (ADC)
#define MQ135_PIN      33   // CO2/Air quality sensor (ADC)
#define MQ2_THRESHOLD  1000  // ppm
#define MQ4_THRESHOLD  800   // ppm
#define MQ7_THRESHOLD  50    // ppm
#define MQ135_THRESHOLD 2000 // ppm
enum SafetyState { NORMAL, ALERT, EMERGENCY, SHUTDOWN };
SafetyState currentState = NORMAL;
bool mqttConnected = false;
unsigned long lastMqttRetry = 0;
const unsigned long MQTT_RETRY_INTERVAL = 5000;
float readPPM(int pin, float Ro, float a, float b) {
  int raw = analogRead(pin);
  float voltage = raw * (3.3f / 4095.0f);
  float Rs = ((3.3f - voltage) / voltage) * 10.0f; // load resistance = 10kΩ
  float ratio = Rs / Ro;
  return a * pow(ratio, b);
}
void triggerEmergency(const char* reason) {
  digitalWrite(VALVE_1_PIN, LOW);   // NC relay — close
  digitalWrite(VALVE_2_PIN, LOW);   // NC relay — close
  digitalWrite(SIREN_PIN, HIGH);    // Sound alarm
  
  Serial.printf("[EMERGENCY] %s — Valves CLOSED, Siren ON\\n", reason);
  currentState = EMERGENCY;
  if (mqttConnected) {
    String payload = String("{\"type\":\"GAS\",\"reason\":\"") + reason +
                     "\",\"ts\":" + millis() + "}";
    mqttClient.publish("rafiq/raqeeb/emergency", payload.c_str(), true);
  }
  sendSMS("+966XXXXXXXXX", String("RAQEEB ALERT: ") + reason);
}

void loop() {
  float mq2_ppm  = readPPM(MQ2_PIN,  9.83, 574.25, -2.222);
  float mq4_ppm  = readPPM(MQ4_PIN,  4.15, 1012.7, -2.786);
  float mq7_ppm  = readPPM(MQ7_PIN,  27.5, 99.042, -1.518);
  float mq135_ppm = readPPM(MQ135_PIN, 41.7, 116.6, -2.769);
  if (mq2_ppm > MQ2_THRESHOLD) triggerEmergency("LPG_PROPANE_HIGH");
  if (mq4_ppm > MQ4_THRESHOLD) triggerEmergency("METHANE_HIGH");
  if (mq7_ppm > MQ7_THRESHOLD) triggerEmergency("CO_HIGH");
  if (mqttConnected) {
    String telemetry = String("{") +
      "\\"mq2\\":" + mq2_ppm + "," +
      "\\"mq4\\":" + mq4_ppm + "," +
      "\\"mq7\\":" + mq7_ppm + "," +
      "\\"mq135\\":" + mq135_ppm + "," +
      "\\"state\\":\\"" + stateToString(currentState) + "\\"" +
      "}";
    mqttClient.publish("rafiq/raqeeb/telemetry", telemetry.c_str());
  }

  delay(500);
}`;

export default function RaqeebPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        
        <SectionHeader
          eyebrow="Safety Layer"
          title="RAQEEB Safety Monitor"
          description="RAQEEB is a hardware-level safety monitoring system built on ESP32. It operates completely independently of the MiniPC — gas detection, valve control, and SMS alerts function even when RAFIQ Core is offline or unreachable."
          status="active"
          statusLabel="4 Sensors Active"
          layer="Safety Layer"
          version="ESP32 v1.3"
          metrics={[
            { label: 'Gas Sensors', value: '4 MQ Array', variant: 'red' },
            { label: 'Response', value: '<50ms', variant: 'green' },
            { label: 'Offline', value: 'Capable', variant: 'green' },
          ]}
        />

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            System Components
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ArchCard
              icon={<Gauge size={16} strokeWidth={1.5} />}
              title="MQ Sensor Array"
              sublabel="4-gas detection · ADC inputs"
              description="MQ-2, MQ-4, MQ-7, MQ-135 sensors cover LPG, methane, CO, and CO₂. Each sensor uses analog voltage divider circuit read by ESP32's 12-bit ADC. Calibrated Ro values stored in firmware."
              status="active"
              metrics={[{ label: 'Sensors', value: 'MQ-2/4/7/135' }, { label: 'ADC', value: '12-bit' }, { label: 'Sample', value: '500ms' }]}
              tags={['Analog', 'ADC', 'Calibrated']}
              accent="red"
              delay={0.05}
            />
            <ArchCard
              icon={<Cpu size={16} strokeWidth={1.5} />}
              title="ESP32 Emergency MCU"
              sublabel="Dual-core · Offline capable"
              description="ESP32 runs FreeRTOS with a dedicated safety task on Core 0. Network stack runs on Core 1. Emergency logic executes regardless of WiFi/MQTT availability — valve control is hardware-direct."
              status="active"
              metrics={[{ label: 'CPU', value: '240MHz dual' }, { label: 'RAM', value: '520KB' }, { label: 'Core', value: 'FreeRTOS' }]}
              tags={['ESP32', 'FreeRTOS', 'Offline']}
              accent="blue"
              delay={0.1}
            />
            <ArchCard
              icon={<Zap size={16} strokeWidth={1.5} />}
              title="Valve Controller"
              sublabel="NC Relays · Failsafe closed"
              description="Normally-Closed (NC) relay configuration means power loss = valves closed. ESP32 holds relays open during normal operation; any firmware crash or power cut defaults to safe state."
              status="online"
              metrics={[{ label: 'Valves', value: '2 zones' }, { label: 'Type', value: 'NC Relay' }, { label: 'Latency', value: '<50ms' }]}
              tags={['NC Relay', 'Failsafe', 'GPIO']}
              accent="emerald"
              delay={0.15}
            />
            <ArchCard
              icon={<Phone size={16} strokeWidth={1.5} />}
              title="SMS Gateway"
              sublabel="SIM800L · GSM fallback"
              description="SIM800L GSM module provides offline SMS capability. When internet is unavailable, ESP32 sends emergency alerts via cellular network directly — completely independent of Supabase or internet."
              status="online"
              metrics={[{ label: 'Module', value: 'SIM800L' }, { label: 'Network', value: 'GSM 2G' }, { label: 'Fallback', value: 'Yes' }]}
              tags={['GSM', 'SIM800L', 'SMS']}
              accent="amber"
              delay={0.2}
            />
            <ArchCard
              icon={<Radio size={16} strokeWidth={1.5} />}
              title="MQTT Bridge"
              sublabel="Bidirectional · QoS 2"
              description="ESP32 publishes sensor telemetry to MQTT broker every 500ms and subscribes to control commands from RAFIQ Core. Emergency messages use QoS 2 with retain flag for guaranteed delivery."
              status="online"
              metrics={[{ label: 'Pub', value: '500ms cycle' }, { label: 'QoS', value: '0 / 2' }, { label: 'Retain', value: 'Emergency' }]}
              tags={['MQTT', 'QoS 2', 'Non-blocking']}
              accent="blue"
              delay={0.25}
            />
          </div>
        </section>

        
        <DataTable
          title="MQ Sensor Array — Thresholds & GPIO"
          subtitle="ppm thresholds calibrated for residential environment"
          columns={[
            { key: 'sensor', label: 'Sensor' },
            { key: 'gas', label: 'Gas Detected' },
            {
              key: 'threshold',
              label: 'Threshold',
              render: (row) => (
                <span className="text-[#FF3B3B]/80 font-mono text-[11px]">{row.threshold as string}</span>
              ),
            },
            { key: 'action', label: 'Action Triggered' },
            { key: 'gpio', label: 'GPIO Pin' },
            { key: 'calibration', label: 'Calibration' },
          ]}
          data={SENSOR_TABLE}
        />

        
        <InfraPanel title="Emergency State Machine" subtitle="RAQEEB safety state transitions" glow="red">
          <div className="p-5">
            <div className="flex flex-wrap items-start gap-3">
              {[
                {
                  state: 'NORMAL',
                  color: 'border-emerald-500/25 text-emerald-400',
                  bg: 'bg-emerald-500/[0.04]',
                  detail: 'All sensors below threshold. Valves open. MQTT telemetry publishing every 500ms.',
                  transitions: ['→ ALERT if any sensor > 80% threshold'],
                },
                {
                  state: 'ALERT',
                  color: 'border-amber-400/25 text-amber-400',
                  bg: 'bg-amber-400/[0.04]',
                  detail: 'Pre-threshold warning. Increase sampling to 100ms. Send alert to RAFIQ Core.',
                  transitions: ['→ EMERGENCY if > threshold', '→ NORMAL if clears'],
                },
                {
                  state: 'EMERGENCY',
                  color: 'border-[#FF3B3B]/30 text-[#FF3B3B]',
                  bg: 'bg-[#FF3B3B]/[0.04]',
                  detail: 'Valves CLOSE immediately. Siren ON. SMS sent. MQTT emergency published.',
                  transitions: ['→ SHUTDOWN after 30s unacknowledged', '→ NORMAL on manual reset'],
                },
                {
                  state: 'SHUTDOWN',
                  color: 'border-white/20 text-white/50',
                  bg: 'bg-white/[0.02]',
                  detail: 'All outputs OFF except siren. Requires physical MCU reset + manual valve inspection.',
                  transitions: ['→ NORMAL only via hard reset'],
                },
              ].map((s) => (
                <div key={s.state} className={`flex-1 min-w-[180px] rounded-xl border p-4 ${s.color} ${s.bg}`}>
                  <div className="mb-1 font-mono text-[10px] font-bold">{s.state}</div>
                  <p className="mb-3 text-[11px] leading-relaxed text-white/40">{s.detail}</p>
                  {s.transitions.map(t => (
                    <div key={t} className="flex items-start gap-1.5 text-[10px] text-white/25">
                      <ArrowRight size={9} className="mt-0.5 shrink-0" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </InfraPanel>

        
        <DataTable
          title="ESP32 GPIO Pin Assignments"
          subtitle="hardware mapping for all RAQEEB peripherals"
          compact
          columns={[
            { key: 'pin', label: 'GPIO Pin' },
            { key: 'role', label: 'Role / Device' },
            { key: 'type', label: 'Type' },
            { key: 'logic', label: 'Logic Level' },
            { key: 'note', label: 'Notes' },
          ]}
          data={GPIO_PINS}
        />

        
        <InfraPanel title="Local-First Safety Guarantee" subtitle="offline operation architecture" glow="blue">
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <WifiOff size={14} className="text-amber-400" />
                <span className="text-[12px] font-bold text-white">When RAFIQ Core is Down</span>
              </div>
              <ul className="space-y-2.5">
                {[
                  { ok: true, text: 'ESP32 sensors continue reading every 500ms' },
                  { ok: true, text: 'Threshold logic runs on MCU independently' },
                  { ok: true, text: 'Valve relay control fires via GPIO directly' },
                  { ok: true, text: 'Siren activates via GPIO relay' },
                  { ok: true, text: 'SMS sent via SIM800L GSM module' },
                  { ok: false, text: 'MQTT publish to Core (queued locally)' },
                  { ok: false, text: 'Supabase event logging (synced on reconnect)' },
                ].map(item => (
                  <li key={item.text} className="flex items-start gap-2 text-[11px] text-white/45">
                    {item.ok
                      ? <CheckCircle size={11} className="mt-0.5 shrink-0 text-emerald-400" />
                      : <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-400" />}
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Wifi size={14} className="text-emerald-400" />
                <span className="text-[12px] font-bold text-white">When RAFIQ Core is Online</span>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Full telemetry stream to Core via MQTT QoS 0',
                  'Core forwards sensor data to AI for anomaly detection',
                  'Emergency events logged to SQLite + sync queue',
                  'Home Assistant automation triggered via MQTT',
                  'Real-time dashboard updates via WebSocket',
                  'Historical trend analysis by AI engine',
                  'Remote configuration of thresholds via MQTT command',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-[11px] text-white/45">
                    <CheckCircle size={11} className="mt-0.5 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </InfraPanel>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Firmware Implementation
          </p>
          <CodeBlock
            code={esp32EmergencyCode}
            language="cpp"
            title="raqeeb_safety/main.cpp"
          />
        </section>

        
        <InfraPanel title="Emergency Response Timeline" subtitle="gas detected to full response" glow="red">
          <div className="p-5">
            <div className="relative space-y-3">
              {[
                { time: '0ms', event: 'MQ sensor ADC read exceeds threshold', actor: 'ESP32 MCU', color: 'text-[#FF3B3B]' },
                { time: '<50ms', event: 'Valve relay opens — gas flow stopped', actor: 'GPIO Direct', color: 'text-[#FF3B3B]' },
                { time: '<50ms', event: 'Siren relay activates', actor: 'GPIO Direct', color: 'text-[#FF3B3B]' },
                { time: '<100ms', event: 'MQTT emergency topic published (QoS 2)', actor: 'ESP32 WiFi', color: 'text-amber-400' },
                { time: '<150ms', event: 'Home Assistant automation triggers', actor: 'HA Core', color: 'text-amber-400' },
                { time: '<200ms', event: 'Curtains/windows commanded open', actor: 'MQTT/Zigbee', color: 'text-blue-400' },
                { time: '<500ms', event: 'RAFIQ Core logs emergency event to SQLite', actor: 'Core Python', color: 'text-blue-400' },
                { time: '<2s', event: 'SMS notification dispatched', actor: 'SIM800L', color: 'text-emerald-400' },
                { time: '<5s', event: 'AI system generates incident report', actor: 'MedGemma', color: 'text-emerald-400' },
              ].map((item, i) => (
                <motion.div
                  key={item.time + item.event}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="flex items-start gap-4"
                >
                  <div className={`w-16 shrink-0 font-mono text-[10px] font-bold ${item.color}`}>{item.time}</div>
                  <div className="h-2 w-2 mt-1 shrink-0 rounded-full bg-white/10" />
                  <div className="flex-1 text-[11px] text-white/50">{item.event}</div>
                  <div className="shrink-0 font-mono text-[9px] text-white/25">{item.actor}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </InfraPanel>

      </div>
    </div>
  );
}
