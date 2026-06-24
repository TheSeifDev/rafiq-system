'use client';

import { Watch, Bluetooth, Battery, Heart, Wind, Navigation, Zap, Cpu, AlertTriangle } from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';

const SENSOR_SPEC = [
  { sensor: 'MAX30102',  measurement: 'Heart Rate + SpO₂', range: 'HR: 30–250bpm / SpO₂: 70–100%', accuracy: '±2bpm / ±1.5%', rate: '100Hz / 50Hz' },
  { sensor: 'ADXL345',   measurement: 'Acceleration (3-axis)', range: '±16g',                       accuracy: '±0.5g',        rate: '400Hz'       },
  { sensor: 'NEO-6M GPS',measurement: 'Latitude / Longitude', range: 'Global',                      accuracy: '2.5m CEP',     rate: '5Hz'         },
  { sensor: 'ADC (battery)', measurement: 'Battery voltage', range: '3.0–4.2V LiPo',               accuracy: '±10mV',        rate: '1Hz'         },
  { sensor: 'Push button',   measurement: 'Emergency trigger', range: 'Binary',                     accuracy: '—',            rate: 'Interrupt'   },
];

const BLE_PAYLOAD = `// Wearable MQTT payload schema (JSON)
{
  "device_id": "watch-001",
  "timestamp": "2024-11-15T08:32:14.231Z",
  "vitals": {
    "heart_rate": { "bpm": 72, "confidence": 0.96 },
    "spo2":       { "percent": 97, "confidence": 0.94 },
    "steps":      3420
  },
  "motion": {
    "activity": "walking",  // idle | walking | running | fall
    "fall_detected": false,
    "ax": 0.12, "ay": -0.08, "az": 9.78
  },
  "location": {
    "lat": 24.7136, "lng": 46.6753,
    "accuracy_m": 3.2,
    "source": "gps"  // gps | last_known | unavailable
  },
  "system": {
    "battery_pct": 82,
    "rssi_dbm": -62,
    "firmware": "v1.4.2"
  }
}`;

const FALL_ALGO = `// ESP32 fall detection (Arduino C++)
#define FALL_THRESHOLD    2.5f   // g-force spike
#define STILLNESS_PERIOD  2000   // ms after spike
#define SAMPLE_RATE_MS    10     // 100Hz

float magnitude(float ax, float ay, float az) {
  return sqrt(ax*ax + ay*ay + az*az);
}

void IRAM_ATTR accel_isr() {
  float g = magnitude(accel.ax, accel.ay, accel.az);
  
  if (g > FALL_THRESHOLD && !fall_candidate) {
    fall_candidate = true;
    fall_candidate_time = millis();
  }
  if (fall_candidate && millis() - fall_candidate_time > STILLNESS_PERIOD) {
    if (magnitude(accel.ax, accel.ay, accel.az) < 1.2f) {
      trigger_emergency_alert(FALL_DETECTED);
    }
    fall_candidate = false;
  }
}`;

export default function WearablePage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        <SectionHeader
          eyebrow="Wearable Layer"
          title="Smart Watch"
          description="ESP32-based wearable device with biometric sensing, fall detection, GPS tracking, and BLE emergency triggers. Runs independent firmware and functions as a standalone safety device even without smartphone connectivity."
          status="online"
          layer="Edge Layer"
          version="v1.4.2"
          metrics={[
            { label: 'Battery', value: '72hr' },
            { label: 'Protocol', value: 'BLE 5.0' },
            { label: 'Sensors', value: '4 active' },
          ]}
        />

        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Heart size={15} strokeWidth={1.5} />, title: 'MAX30102', sublabel: 'HR + SpO₂ Sensor', description: 'Optical heart rate and blood oxygen sensor via PPG. Integrated temperature compensation for accurate outdoor readings.', status: 'online' as const, accent: 'red' as const, tags: ['PPG', 'I2C', '100Hz'] },
            { icon: <Zap size={15} strokeWidth={1.5} />, title: 'ADXL345', sublabel: '3-Axis Accelerometer', description: 'High-resolution accelerometer for activity detection, step counting, and fall detection algorithm input at 400Hz.', status: 'online' as const, accent: 'blue' as const, tags: ['±16g', 'SPI', '400Hz'] },
            { icon: <Navigation size={15} strokeWidth={1.5} />, title: 'NEO-6M GPS', sublabel: 'Location Tracking', description: 'Satellite GPS for outdoor location tracking. Cached last-known position when signal unavailable. Power-gated when indoors.', status: 'online' as const, accent: 'red' as const, tags: ['2.5m CEP', 'UART', 'Power-gated'] },
            { icon: <Bluetooth size={15} strokeWidth={1.5} />, title: 'BLE 5.0 Stack', sublabel: 'GATT · ADV · Notify', description: 'Bluetooth LE for data streaming to gateway (MiniPC). Uses GATT notifications for real-time data and advertisements for emergency broadcast.', status: 'online' as const, accent: 'blue' as const, tags: ['GATT', 'Notify', 'ADV'] },
            { icon: <Battery size={15} strokeWidth={1.5} />, title: 'Power Manager', sublabel: '1100mAh LiPo · Sleep modes', description: 'Dynamic power management: full-rate sampling when active, reduced rate in sleep, GPS power-gated when indoor. 72hr typical life.', status: 'online' as const, accent: 'red' as const, tags: ['Deep sleep', 'Power-gate', 'ADC'] },
            { icon: <AlertTriangle size={15} strokeWidth={1.5} />, title: 'Emergency Trigger', sublabel: 'Fall · Button · BLE alert', description: 'Dual-trigger emergency: physical button press (3s hold) or automatic fall detection. Broadcasts via BLE advertisement + MQTT alert.', status: 'active' as const, accent: 'blue' as const, tags: ['Interrupt-driven', 'Fail-safe', 'BLE ADV'] },
          ].map((card, i) => <ArchCard key={card.title} {...card} delay={i * 0.05} />)}
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Sensor Specification Matrix</h2>
          <DataTable
            columns={[
              { key: 'sensor', label: 'Sensor', className: 'min-w-[120px]' },
              { key: 'measurement', label: 'Measurement' },
              { key: 'range', label: 'Range' },
              { key: 'accuracy', label: 'Accuracy' },
              { key: 'rate', label: 'Sample Rate' },
            ]}
            data={SENSOR_SPEC}
            subtitle="All sensors connected to ESP32-S3 · I2C bus @ 400kHz"
          />
        </div>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">MQTT Payload Schema</h2>
            <CodeBlock code={BLE_PAYLOAD} language="json" title="wearable/payload.json" />
          </div>
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Fall Detection Algorithm</h2>
            <CodeBlock code={FALL_ALGO} language="cpp" title="firmware/fall_detect.cpp" />
          </div>
        </div>

        
        <InfraPanel title="BLE Connection Lifecycle" subtitle="ESP32 ↔ MiniPC Gateway" glow="blue">
          <div className="overflow-x-auto p-5">
            <div className="flex min-w-max items-center gap-2">
              {[
                { label: 'Power On', sub: 'ADV broadcast', color: 'text-white/50 border-white/15' },
                { label: '↓', arrow: true },
                { label: 'Scan', sub: 'Gateway discovers', color: 'text-amber-400 border-amber-400/25' },
                { label: '↓', arrow: true },
                { label: 'Connect', sub: 'GATT pairing', color: 'text-blue-400 border-blue-400/25' },
                { label: '↓', arrow: true },
                { label: 'Stream', sub: 'Notify @ 100ms', color: 'text-emerald-400 border-emerald-400/25' },
                { label: '↓', arrow: true },
                { label: 'RSSI Drop', sub: 'Timeout 5s', color: 'text-amber-400 border-amber-400/25' },
                { label: '↓', arrow: true },
                { label: 'Auto-Reconnect', sub: 'Exponential backoff', color: 'text-[#FF3B3B] border-[#FF3B3B]/25' },
              ].map((step, i) => (
                <div key={i} className={step.arrow ? 'font-mono text-white/25 text-sm px-1' : `rounded-xl border px-3 py-2 font-mono ${step.color}`}>
                  {step.arrow ? '→' : (
                    <>
                      <div className="text-[11px] font-bold">{step.label}</div>
                      {'sub' in step && <div className="text-[9px] opacity-60">{step.sub}</div>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </InfraPanel>

      </div>
    </div>
  );
}
