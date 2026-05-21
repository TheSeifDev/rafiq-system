'use client';

import { motion } from 'framer-motion';
import {
  Smile, Mic, Monitor, Layers, Cpu, Volume2,
  GitBranch, Play, Palette, Eye, Radio, Zap,
} from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';

const EMOTIONAL_STATES = [
  { state: 'calm',      trigger: 'Idle / normal vitals',            animation: 'Slow breathe, neutral expression',   voice: 'Soft, measured tone',      duration: 'Sustained' },
  { state: 'listening', trigger: 'Wake-word detected',              animation: 'Ears perk, eyes widen slightly',     voice: 'Silent / receptive',       duration: '≤ 5s' },
  { state: 'thinking',  trigger: 'AI inference in progress',        animation: 'Eyes roll up, brow furrow pulse',    voice: 'Thinking hum (subtle)',    duration: 'Inference time' },
  { state: 'concerned', trigger: 'Anomaly / mild risk detected',    animation: 'Brow tilt, head tilt, amber glow',   voice: 'Lower, empathetic tone',   duration: 'Until resolved' },
  { state: 'alert',     trigger: 'Threshold breach',                animation: 'Rapid blink, red pulse ring',        voice: 'Elevated, clear diction',  duration: '≥ 10s' },
  { state: 'emergency', trigger: 'Emergency classification fired',  animation: 'Full-red flash, urgent shake',       voice: 'Commanding, fast cadence', duration: 'Until cleared' },
  { state: 'sleeping',  trigger: 'System idle > 10 min, night mode','animation': 'Eyes closed, slow chest rise',      voice: 'Silent',                   duration: 'Night window' },
];

const RENDERER_COMPARISON = [
  { renderer: 'Pygame',    platform: 'Desktop (Linux/Win)',  threeDCapable: 'No',  latency: '< 5ms',  complexity: 'Low',    status: 'Current' },
  { renderer: 'Electron',  platform: 'Desktop + Web hybrid', threeDCapable: 'No',  latency: '< 15ms', complexity: 'Medium', status: 'Current' },
  { renderer: 'Three.js',  platform: 'Web / Browser',        threeDCapable: 'Yes', latency: '< 16ms', complexity: 'High',   status: 'Planned' },
  { renderer: 'Tauri',     platform: 'Desktop (Rust)',        threeDCapable: 'Yes', latency: '< 8ms',  complexity: 'High',   status: 'Evaluated' },
];

const SPEAKING_STATES = [
  { phase: 'idle',                icon: '○', description: 'Avatar at rest, calm breathing loop', mouth: 'Closed, slight smile' },
  { phase: 'wake-word-detected',  icon: '◎', description: 'Name called — avatar perks up',       mouth: 'Slight open, eyebrows raise' },
  { phase: 'processing',          icon: '◌', description: 'AI inference running, thinking anim', mouth: 'Pursed, thinking expression' },
  { phase: 'speaking',            icon: '●', description: 'TTS audio playing, mouth synced',      mouth: 'Phoneme-driven viseme morph' },
  { phase: 'done',                icon: '○', description: 'Response complete, return to idle',    mouth: 'Closes, returns to calm' },
];

const STATE_MACHINE_CODE = `# RAFIQ Emotional State Machine (Python pseudocode)
from enum import Enum
from dataclasses import dataclass
import asyncio

class EmotionState(Enum):
    CALM      = "calm"
    LISTENING = "listening"
    THINKING  = "thinking"
    CONCERNED = "concerned"
    ALERT     = "alert"
    EMERGENCY = "emergency"
    SLEEPING  = "sleeping"

@dataclass
class StateTransition:
    from_state: EmotionState
    to_state: EmotionState
    trigger: str
    animation: str
    voice_tone: str

# Valid state transition matrix
TRANSITIONS = {
    EmotionState.CALM:      [EmotionState.LISTENING, EmotionState.CONCERNED, EmotionState.SLEEPING],
    EmotionState.LISTENING: [EmotionState.THINKING, EmotionState.CALM],
    EmotionState.THINKING:  [EmotionState.CALM, EmotionState.CONCERNED, EmotionState.ALERT],
    EmotionState.CONCERNED: [EmotionState.ALERT, EmotionState.CALM],
    EmotionState.ALERT:     [EmotionState.EMERGENCY, EmotionState.CALM],
    EmotionState.EMERGENCY: [EmotionState.CALM],   # Only cleared by operator
    EmotionState.SLEEPING:  [EmotionState.CALM, EmotionState.LISTENING],
}

class EmotionalStateMachine:
    def __init__(self):
        self.state = EmotionState.CALM
        self._listeners = []

    async def transition(self, new_state: EmotionState, reason: str = "") -> bool:
        if new_state not in TRANSITIONS.get(self.state, []):
            return False  # Invalid transition

        prev = self.state
        self.state = new_state
        await self._notify(prev, new_state, reason)
        return True

    async def _notify(self, prev, curr, reason):
        for listener in self._listeners:
            await listener(prev, curr, reason)

    def from_sentiment(self, sentiment_score: float, emergency: bool) -> EmotionState:
        if emergency:               return EmotionState.EMERGENCY
        if sentiment_score < -0.7:  return EmotionState.ALERT
        if sentiment_score < -0.3:  return EmotionState.CONCERNED
        if sentiment_score > 0.5:   return EmotionState.CALM
        return EmotionState.CALM`;

const AVATAR_SYNC_PIPELINE = `# Audio → Avatar Sync Pipeline
# TTS audio stream → waveform analysis → viseme mapping → avatar morph

async def audio_avatar_sync(tts_stream: AsyncIterator[bytes]):
    async for chunk in tts_stream:
        amplitude = compute_rms(chunk)          # Root mean square amplitude
        frequency  = fft_dominant(chunk)        # Dominant frequency band
        viseme     = phoneme_to_viseme(chunk)   # Phoneme detection → viseme code

        await avatar_renderer.update({
            "mouth_open":  amplitude * 0.8,     # 0.0–1.0 openness
            "mouth_shape": viseme,               # 'A', 'E', 'I', 'O', 'U', 'M', 'B'
            "expression":  "speaking",
        })
        await asyncio.sleep(1 / 30)             # 30fps sync rate`;

const ARCH_CARDS = [
  {
    icon: <Smile size={16} strokeWidth={1.5} />,
    title: 'Emotion Engine',
    sublabel: 'Sentiment → State · AI-driven',
    description: 'Analyzes AI response sentiment scores and emergency flags to drive avatar emotional state. Runs post-inference, adds < 2ms overhead to each response cycle.',
    status: 'online' as const,
    metrics: [{ label: 'States', value: '7' }, { label: 'Latency', value: '< 2ms' }, { label: 'Model', value: 'Sentiment NLP' }],
    tags: ['VADER', 'TextBlob', 'Rule-based'],
    accent: 'red' as const,
  },
  {
    icon: <Eye size={16} strokeWidth={1.5} />,
    title: 'Avatar Renderer',
    sublabel: 'Pygame 2D · CSS sprites · Canvas',
    description: 'Current 2D renderer using Pygame for desktop and CSS animations for web. Each emotional state maps to a sprite sheet sequence with smooth interpolation between frames.',
    status: 'online' as const,
    metrics: [{ label: 'FPS', value: '30' }, { label: 'States', value: '7 anims' }, { label: 'Mode', value: '2D sprites' }],
    tags: ['Pygame', 'CSS', 'Sprite sheets'],
    accent: 'blue' as const,
  },
  {
    icon: <Volume2 size={16} strokeWidth={1.5} />,
    title: 'Voice Sync',
    sublabel: 'TTS waveform → viseme morphing',
    description: 'Analyzes TTS audio chunks in real-time using FFT amplitude and phoneme detection to drive mouth animation at 30fps. Synchronized with audio playback to avoid lip-sync drift.',
    status: 'online' as const,
    metrics: [{ label: 'Sync rate', value: '30 fps' }, { label: 'Drift', value: '< 33ms' }, { label: 'Phonemes', value: '7 visemes' }],
    tags: ['FFT', 'Phoneme map', 'Piper TTS'],
    accent: 'emerald' as const,
  },
  {
    icon: <GitBranch size={16} strokeWidth={1.5} />,
    title: 'State Machine',
    sublabel: 'Finite state machine · async transitions',
    description: 'Enforces valid state transitions, preventing illegal emotional jumps (e.g. emergency → listening). Notifies all registered listeners on each transition for decoupled rendering.',
    status: 'online' as const,
    metrics: [{ label: 'Transition', value: '< 50ms' }, { label: 'States', value: '7' }, { label: 'Edges', value: '11 valid' }],
    tags: ['FSM', 'asyncio', 'Observer pattern'],
    accent: 'amber' as const,
  },
  {
    icon: <Radio size={16} strokeWidth={1.5} />,
    title: 'TTS Bridge',
    sublabel: 'Piper TTS · audio streaming · sync',
    description: 'Bridges the text-to-speech engine with the avatar renderer. Streams audio chunks through FFT analysis pipeline, controls playback timing, and signals end-of-speech to state machine.',
    status: 'online' as const,
    metrics: [{ label: 'Engine', value: 'Piper' }, { label: 'Format', value: 'WAV 22kHz' }, { label: 'Buffer', value: '512 samples' }],
    tags: ['Piper', 'WAV', 'asyncio', 'FFT'],
    accent: 'red' as const,
  },
];

export default function GUIPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        
        <SectionHeader
          eyebrow="Interface System"
          title="GUI & Emotional Avatar"
          description="RAFIQ's emotional interface layer: a state-machine-driven avatar that reflects AI emotional states through synchronized facial animation, voice tone modulation, and visual cues. Current 2D implementation in Pygame/Electron with a 3D Three.js roadmap."
          status="online"
          layer="Interface Layer"
          version="v1.3.0"
          metrics={[
            { label: 'Emotional States', value: '7', variant: 'green' },
            { label: 'State Transition', value: '< 50ms', variant: 'amber' },
            { label: 'Voice Sync', value: '30 fps', variant: 'blue' },
          ]}
        />

        
        <InfraPanel title="Emotional State Overview" subtitle="AI output → sentiment → state → animation → voice tone" glow="red">
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {[
                { state: 'calm',      color: 'text-emerald-400', bg: 'border-emerald-400/20 bg-emerald-400/5',  icon: '😌' },
                { state: 'listening', color: 'text-blue-400',    bg: 'border-blue-400/20 bg-blue-400/5',        icon: '👂' },
                { state: 'thinking',  color: 'text-amber-400',   bg: 'border-amber-400/20 bg-amber-400/5',      icon: '🤔' },
                { state: 'concerned', color: 'text-orange-400',  bg: 'border-orange-400/20 bg-orange-400/5',    icon: '😟' },
                { state: 'alert',     color: 'text-[#FF3B3B]',   bg: 'border-[#FF3B3B]/20 bg-[#FF3B3B]/5',     icon: '⚠️' },
                { state: 'emergency', color: 'text-red-500',     bg: 'border-red-500/30 bg-red-500/8',          icon: '🚨' },
                { state: 'sleeping',  color: 'text-white/30',    bg: 'border-white/10 bg-white/3',              icon: '😴' },
              ].map((s, i) => (
                <motion.div
                  key={s.state}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 ${s.bg}`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-wider ${s.color}`}>
                    {s.state}
                  </span>
                </motion.div>
              ))}
            </div>

            
            <div className="mt-6 border-t border-white/[0.05] pt-5">
              <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
                Speaking States Pipeline
              </p>
              <div className="flex flex-wrap items-center gap-0">
                {SPEAKING_STATES.map((phase, i) => (
                  <div key={phase.phase} className="flex items-center gap-0">
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2"
                    >
                      <span className="font-mono text-[11px] text-[#FF3B3B]/70">{phase.icon}</span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40 whitespace-nowrap">
                        {phase.phase}
                      </span>
                    </motion.div>
                    {i < SPEAKING_STATES.length - 1 && (
                      <span className="px-1 font-mono text-[10px] text-white/15">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </InfraPanel>

        
        <div>
          <div className="mb-6 flex items-center gap-3">
            <Layers size={13} className="text-white/30" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              Core Components · 5 subsystems
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ARCH_CARDS.map((card, i) => (
              <ArchCard key={card.title} {...card} delay={i * 0.05} />
            ))}
          </div>
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Emotional States Reference
          </h2>
          <DataTable
            columns={[
              {
                key: 'state',
                label: 'State',
                render: (row) => (
                  <span className="font-mono text-[11px] font-bold text-[#FF3B3B]/80 uppercase tracking-wider">
                    {String(row.state)}
                  </span>
                ),
              },
              { key: 'trigger', label: 'Trigger Condition' },
              { key: 'animation', label: 'Avatar Animation' },
              { key: 'voice', label: 'Voice Tone' },
              {
                key: 'duration',
                label: 'Duration',
                render: (row) => (
                  <span className="font-mono text-[10px] text-amber-400/70">{String(row.duration)}</span>
                ),
              },
            ]}
            data={EMOTIONAL_STATES}
            title="Emotional State Matrix"
            subtitle="Maps AI output classification to avatar animation and TTS voice modulation"
          />
        </div>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              State Machine Definition
            </h2>
            <CodeBlock
              code={STATE_MACHINE_CODE}
              language="python"
              title="gui/emotion_state_machine.py"
            />
          </div>

          
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
              Audio → Avatar Sync
            </h2>
            <InfraPanel title="Audio → Viseme Pipeline" subtitle="TTS stream → FFT → mouth morph" glow="blue">
              <div className="p-5 space-y-4">
                {[
                  { step: '01', label: 'TTS Audio Stream',   desc: 'Piper generates WAV chunks at 22kHz as RAFIQ speaks', color: 'text-blue-400' },
                  { step: '02', label: 'FFT Analysis',        desc: 'RMS amplitude + dominant frequency per 512-sample chunk', color: 'text-amber-400' },
                  { step: '03', label: 'Phoneme Detection',   desc: 'Neural phoneme classifier maps audio to IPA symbols', color: 'text-emerald-400' },
                  { step: '04', label: 'Viseme Mapping',      desc: '7 mouth shapes: A, E, I, O, U, M/B, Neutral', color: 'text-white/50' },
                  { step: '05', label: 'Avatar Morph Target', desc: 'Renderer blends between mouth shapes at 30fps', color: 'text-[#FF3B3B]/70' },
                ].map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                    className="flex items-start gap-3"
                  >
                    <span className={`font-mono text-[10px] font-bold shrink-0 ${item.color}`}>
                      {item.step}
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-white">{item.label}</p>
                      <p className="text-[10px] text-white/35 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </InfraPanel>
            <div className="mt-4">
              <CodeBlock
                code={AVATAR_SYNC_PIPELINE}
                language="python"
                title="gui/voice_sync.py"
              />
            </div>
          </div>
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Renderer Comparison
          </h2>
          <DataTable
            columns={[
              {
                key: 'renderer',
                label: 'Renderer',
                render: (row) => (
                  <span className="font-mono text-[11px] font-bold text-white">{String(row.renderer)}</span>
                ),
              },
              { key: 'platform', label: 'Platform' },
              {
                key: 'threeDCapable',
                label: '3D Capable',
                align: 'center',
                render: (row) => (
                  <span className={`font-mono text-[10px] ${row.threeDCapable === 'Yes' ? 'text-emerald-400' : 'text-white/25'}`}>
                    {String(row.threeDCapable)}
                  </span>
                ),
              },
              { key: 'latency', label: 'Latency', align: 'center' },
              { key: 'complexity', label: 'Complexity', align: 'center' },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <span className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider
                    ${row.status === 'Current'
                      ? 'border-emerald-400/25 text-emerald-400/80 bg-emerald-400/5'
                      : row.status === 'Planned'
                        ? 'border-blue-400/25 text-blue-400/80 bg-blue-400/5'
                        : 'border-white/10 text-white/30 bg-white/3'
                    }`}>
                    {String(row.status)}
                  </span>
                ),
              },
            ]}
            data={RENDERER_COMPARISON}
            title="Renderer Comparison Matrix"
            subtitle="2D current implementation vs 3D roadmap"
          />
        </div>

        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfraPanel title="2D GUI — Current" subtitle="Pygame + Electron · Active" glow="red">
            <div className="p-5 space-y-3">
              {[
                { icon: <Monitor size={13} className="text-[#FF3B3B]/60" />, label: 'Pygame Desktop', desc: 'Sprite-based 2D avatar on dedicated display or fullscreen overlay. 30fps sprite animation with state-driven frame selection.' },
                { icon: <Cpu size={13} className="text-amber-400/60" />,     label: 'Low CPU Usage',  desc: '< 5% CPU at idle, < 15% during speaking animation on base MiniPC hardware.' },
                { icon: <Play size={13} className="text-emerald-400/60" />,  label: 'Electron Shell', desc: 'Web-embedded version of the 2D avatar for kiosk mode on touch displays using Canvas 2D API.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-[11px] font-bold text-white">{item.label}</p>
                    <p className="text-[10px] leading-relaxed text-white/35">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </InfraPanel>

          <InfraPanel title="3D GUI — Roadmap" subtitle="Three.js + WebGL · Planned" glow="blue">
            <div className="p-5 space-y-3">
              {[
                { icon: <Layers size={13} className="text-blue-400/60" />,   label: 'Three.js Avatar',   desc: 'Full 3D rigged character with blend shape morphing. glTF model with 52 facial action units for hyper-realistic expressions.' },
                { icon: <Zap size={13} className="text-amber-400/60" />,     label: 'Shader-driven Glow', desc: 'Real-time post-processing: emotional state drives ambient light color, bloom intensity, and chromatic aberration.' },
                { icon: <Palette size={13} className="text-emerald-400/60" />, label: 'WebXR Ready',     desc: 'Planned WebXR support for AR overlay on smart glasses. Avatar projected into physical space for immersive care assistant.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-[11px] font-bold text-white">{item.label}</p>
                    <p className="text-[10px] leading-relaxed text-white/35">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </InfraPanel>
        </div>

      </div>
    </div>
  );
}
