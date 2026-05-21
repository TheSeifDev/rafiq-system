'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  Mic,
  Volume2,
  GitBranch,
  Zap,
  Activity,
  AlertTriangle,
  Heart,
  MessageSquare,
  Cpu,
  ArrowRight,
  ChevronRight,
  Layers,
  Shield,
} from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import StatusPulse from '@/src/features/rafiq/shared/components/StatusPulse';

const MODEL_TABLE_DATA = [
  {
    name: 'MedGemma 4B',
    provider: 'Ollama / GGUF',
    size: '4B params',
    quant: 'Q4_K_M',
    latency: '~160ms',
    context: '8192 tok',
    useCase: 'Health analysis, clinical reasoning, anomaly detection',
  },
  {
    name: 'Qwen2.5:3b',
    provider: 'Ollama / GGUF',
    size: '3B params',
    quant: 'Q4_K_M',
    latency: '~90ms',
    context: '4096 tok',
    useCase: 'Reminders, conversation, simple queries',
  },
  {
    name: 'GPT-4o (cloud)',
    provider: 'OpenAI API',
    size: 'Cloud',
    quant: '—',
    latency: '~1200ms',
    context: '128k tok',
    useCase: 'Fallback when local models unavailable or insufficient',
  },
  {
    name: 'Whisper Small',
    provider: 'faster-whisper',
    size: '244M params',
    quant: 'INT8',
    latency: '~320ms',
    context: '30s audio',
    useCase: 'Speech-to-text, voice command recognition',
  },
  {
    name: 'Piper TTS',
    provider: 'piper-tts',
    size: '~28MB',
    quant: 'ONNX',
    latency: '~80ms',
    context: 'Streaming',
    useCase: 'Text-to-speech, RAFIQ voice output',
  },
] as const;

type ModelRow = {
  name: string;
  provider: string;
  size: string;
  quant: string;
  latency: string;
  context: string;
  useCase: string;
};

const modelTableData: ModelRow[] = MODEL_TABLE_DATA.map((r) => ({ ...r }));

const EMOTION_STATES = [
  {
    state: 'calm',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    dot: 'bg-emerald-400',
    trigger: 'All vitals nominal, no active alerts',
    voice: 'Soft, measured pace, lower frequency',
    avatar: 'Gentle idle animation, relaxed expression',
  },
  {
    state: 'concerned',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    dot: 'bg-amber-400',
    trigger: 'Minor anomaly detected, threshold soft-breach',
    voice: 'Slightly elevated, attentive tone',
    avatar: 'Eyebrow raise, leaning forward animation',
  },
  {
    state: 'alert',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    dot: 'bg-orange-400',
    trigger: 'Hard threshold breach, critical metric out of range',
    voice: 'Urgent, clear pronunciation, fast rate',
    avatar: 'Alert gesture, direct eye contact animation',
  },
  {
    state: 'emergency',
    color: 'text-[#FF3B3B]',
    bg: 'bg-[#FF3B3B]/10',
    border: 'border-[#FF3B3B]/25',
    dot: 'bg-[#FF3B3B]',
    trigger: 'Fall detected, SpO₂ < 88%, unresponsive user',
    voice: 'Maximum clarity, contact instructions only',
    avatar: 'Red pulse overlay, emergency action prompts',
  },
];

const ROUTING_CODE = `# ai/router.py — AI Routing Decision Engine
import asyncio
from enum import Enum
from dataclasses import dataclass
from typing import Optional

class ModelProvider(Enum):
    MEDGEMMA  = "medgemma:4b"        # Primary: health/clinical queries
    QWEN      = "qwen2.5:3b"         # Secondary: general conversation
    CLOUD_GPT = "gpt-4o"             # Fallback: complex or offline-failed

@dataclass
class RoutingContext:
    query_type: str        # "health" | "conversation" | "reminder" | "emergency"
    complexity: float      # 0.0 – 1.0 estimated reasoning depth
    is_emergency: bool
    local_available: bool
    latency_budget_ms: int # caller's max tolerable latency

class AIRouter:
    def __init__(self, ollama_client, openai_client):
        self.ollama = ollama_client
        self.openai = openai_client
        self._health_check_interval = 30  # seconds

    async def route(self, ctx: RoutingContext) -> ModelProvider:
        # Rule 1: Emergencies always go to MedGemma (lowest latency local model)
        if ctx.is_emergency:
            return ModelProvider.MEDGEMMA

        # Rule 2: Health / clinical queries → MedGemma
        if ctx.query_type in ("health", "anomaly", "vitals"):
            if ctx.local_available:
                return ModelProvider.MEDGEMMA
            return ModelProvider.CLOUD_GPT  # cloud fallback

        # Rule 3: Conversation within latency budget → Qwen (faster)
        if ctx.query_type == "conversation":
            if ctx.local_available and ctx.latency_budget_ms >= 100:
                return ModelProvider.QWEN
            return ModelProvider.CLOUD_GPT

        # Rule 4: High-complexity reasoning → MedGemma or Cloud
        if ctx.complexity > 0.75:
            return ModelProvider.MEDGEMMA if ctx.local_available else ModelProvider.CLOUD_GPT

        # Default: Qwen for speed
        return ModelProvider.QWEN if ctx.local_available else ModelProvider.CLOUD_GPT

    async def infer(self, prompt: str, ctx: RoutingContext) -> str:
        provider = await self.route(ctx)
        try:
            if provider in (ModelProvider.MEDGEMMA, ModelProvider.QWEN):
                response = await self.ollama.generate(
                    model=provider.value,
                    prompt=prompt,
                    options={"temperature": 0.3, "num_ctx": 4096},
                )
                return response["response"]
            else:
                # Cloud fallback with retry
                return await self._cloud_infer(prompt)
        except Exception as exc:
            # Fallback chain: try other local model first
            return await self._fallback_infer(prompt, failed=provider, error=exc)

    async def _fallback_infer(self, prompt, failed, error) -> str:
        fallback_order = [
            ModelProvider.MEDGEMMA,
            ModelProvider.QWEN,
            ModelProvider.CLOUD_GPT,
        ]
        for model in fallback_order:
            if model == failed:
                continue
            try:
                if model == ModelProvider.CLOUD_GPT:
                    return await self._cloud_infer(prompt)
                resp = await self.ollama.generate(model=model.value, prompt=prompt)
                return resp["response"]
            except Exception:
                continue
        return "AI system unavailable. Please check local model status."`;

const VOICE_PIPELINE_CODE = `# voice/pipeline.py — Voice Processing Pipeline
import asyncio
from faster_whisper import WhisperModel
from pvporcupine import Porcupine          # Wake word detection
import piper                               # TTS engine

class VoicePipeline:
    def __init__(self, ai_router):
        # STT: faster-whisper with INT8 quantization for edge performance
        self.stt = WhisperModel("small", device="cpu", compute_type="int8")

        # Wake word: "Hey RAFIQ" via Picovoice Porcupine
        self.porcupine = Porcupine(
            access_key=PICOVOICE_KEY,
            keywords=["rafiq"],
            sensitivities=[0.6],
        )

        # TTS: Piper with Arabic/English voice model
        self.tts = piper.PiperVoice.load(
            model_path="models/en_US-lessac-medium.onnx",
            config_path="models/en_US-lessac-medium.onnx.json",
        )

        self.router = ai_router
        self.is_listening = False

    async def listen_for_wake_word(self):
        """Continuously monitor audio for wake word activation."""
        async for audio_frame in self._mic_stream(frame_length=512):
            keyword_index = self.porcupine.process(audio_frame)
            if keyword_index >= 0:
                await self.on_wake_word_detected()

    async def on_wake_word_detected(self):
        """Capture, transcribe, route, and respond to user utterance."""
        self.is_listening = True
        audio = await self._capture_utterance(timeout_ms=5000)

        # STT: transcribe with beam search
        segments, _ = self.stt.transcribe(audio, beam_size=5, language="en")
        transcript = " ".join(seg.text for seg in segments).strip()

        if not transcript:
            return

        # Route to AI
        ctx = RoutingContext(
            query_type=classify_query(transcript),
            complexity=estimate_complexity(transcript),
            is_emergency=False,
            local_available=True,
            latency_budget_ms=2000,
        )
        response_text = await self.router.infer(transcript, ctx)

        # TTS: synthesize and stream audio output
        await self._speak(response_text)
        self.is_listening = False

    async def _speak(self, text: str):
        audio_bytes = self.tts.synthesize(text, streaming=True)
        await self._audio_output(audio_bytes)`;

export default function AIPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        
        <SectionHeader
          eyebrow="AI System"
          title="AI Orchestration Layer"
          description="RAFIQ runs a multi-model AI stack entirely at the edge. MedGemma 4B handles clinical reasoning; Qwen2.5 handles conversation; Whisper and Piper provide the voice interface. All inference is local-first with cloud fallback via OpenAI when models are unavailable."
          status="online"
          statusLabel="AI Online"
          layer="Local AI Layer"
          version="v2.1"
          metrics={[
            { label: 'Avg Latency', value: '160ms', variant: 'green' },
            { label: 'Models Active', value: '2', variant: 'blue' },
            { label: 'Context Window', value: '4096 tok', variant: 'default' },
          ]}
        />

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            AI Components
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ArchCard
              icon={<Brain size={16} strokeWidth={1.5} />}
              title="MedGemma 4B"
              sublabel="Medical AI · GGUF quantized"
              description="Primary inference model trained on medical corpora. Handles vital sign analysis, anomaly detection, clinical reasoning, and emergency classification."
              status="online"
              metrics={[
                { label: 'Size', value: '4B params' },
                { label: 'Quant', value: 'Q4_K_M' },
                { label: 'Latency', value: '~160ms' },
              ]}
              tags={['GGUF', 'llama.cpp', 'Medical', 'Ollama']}
              accent="red"
              delay={0.04}
            />
            <ArchCard
              icon={<MessageSquare size={16} strokeWidth={1.5} />}
              title="Qwen2.5:3b"
              sublabel="Conversational AI · GGUF"
              description="Lightweight general-purpose model for reminders, scheduling, and daily conversation. Lower latency makes it ideal for interactive use-cases."
              status="online"
              metrics={[
                { label: 'Size', value: '3B params' },
                { label: 'Quant', value: 'Q4_K_M' },
                { label: 'Latency', value: '~90ms' },
              ]}
              tags={['GGUF', 'Qwen', 'Fast', 'Ollama']}
              accent="blue"
              delay={0.08}
            />
            <ArchCard
              icon={<Mic size={16} strokeWidth={1.5} />}
              title="Whisper STT"
              sublabel="Speech-to-Text · faster-whisper"
              description="OpenAI Whisper Small running on faster-whisper with INT8 quantization. Processes 30s audio chunks at ~320ms on CPU for real-time voice commands."
              status="online"
              metrics={[
                { label: 'Model', value: 'small' },
                { label: 'Quant', value: 'INT8' },
                { label: 'RTF', value: '< 0.3x' },
              ]}
              tags={['Whisper', 'STT', 'INT8', 'CPU']}
              accent="emerald"
              delay={0.12}
            />
            <ArchCard
              icon={<Volume2 size={16} strokeWidth={1.5} />}
              title="Piper TTS"
              sublabel="Text-to-Speech · ONNX"
              description="Piper neural TTS with English and Arabic voice models. Generates natural speech audio in ~80ms via ONNX runtime, streamed directly to audio output."
              status="online"
              metrics={[
                { label: 'Engine', value: 'ONNX' },
                { label: 'Latency', value: '~80ms' },
                { label: 'Model Size', value: '~28MB' },
              ]}
              tags={['Piper', 'TTS', 'ONNX', 'Streaming']}
              accent="blue"
              delay={0.16}
            />
            <ArchCard
              icon={<GitBranch size={16} strokeWidth={1.5} />}
              title="AI Orchestrator"
              sublabel="Routing · Fallback · Context"
              description="Central routing engine that selects models based on query type, complexity score, latency budget, and local availability. Implements a cascading fallback chain."
              status="online"
              metrics={[
                { label: 'Fallback Levels', value: '3' },
                { label: 'Routing Rules', value: '8' },
                { label: 'Providers', value: '3' },
              ]}
              tags={['Router', 'Fallback', 'asyncio']}
              accent="red"
              delay={0.20}
            />
            <ArchCard
              icon={<Zap size={16} strokeWidth={1.5} />}
              title="Picovoice / Silero"
              sublabel="Wake Word · VAD"
              description="Always-on wake word engine ('Hey RAFIQ') powered by Picovoice Porcupine with < 1% CPU. Silero VAD used as fallback for voice activity detection in noisy environments."
              status="online"
              metrics={[
                { label: 'CPU Usage', value: '< 1%' },
                { label: 'Latency', value: '< 20ms' },
                { label: 'False Positive', value: '< 0.1/hr' },
              ]}
              tags={['Porcupine', 'VAD', 'Silero', 'Edge']}
              accent="amber"
              delay={0.24}
            />
          </div>
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Routing Architecture
          </p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            
            <InfraPanel title="Model Routing Decision Tree" subtitle="rule-based cascade" glow="red">
              <div className="space-y-0 p-2">

                
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.05 }}
                  className="flex gap-3 rounded-lg p-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#FF3B3B]/15 font-mono text-[9px] font-bold text-[#FF3B3B]">1</div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Emergency Query?</p>
                    <p className="mt-0.5 text-[10px] text-white/40">Fall detected / SpO₂ critical / unresponsive</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <ChevronRight size={9} className="text-[#FF3B3B]/60" />
                      <span className="font-mono text-[9px] text-[#FF3B3B]/70">→ MedGemma 4B (always)</span>
                    </div>
                  </div>
                </motion.div>

                <div className="ml-6 h-4 w-px bg-white/[0.06]" />

                
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="flex gap-3 rounded-lg p-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#FF3B3B]/15 font-mono text-[9px] font-bold text-[#FF3B3B]">2</div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Health / Clinical Query?</p>
                    <p className="mt-0.5 text-[10px] text-white/40">vitals, anomaly, symptoms, drug interactions</p>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <ChevronRight size={9} className="text-emerald-400/60" />
                        <span className="font-mono text-[9px] text-emerald-400/70">Local available → MedGemma 4B</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ChevronRight size={9} className="text-blue-400/60" />
                        <span className="font-mono text-[9px] text-blue-400/70">Local down → GPT-4o (cloud)</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="ml-6 h-4 w-px bg-white/[0.06]" />

                
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.15 }}
                  className="flex gap-3 rounded-lg p-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-500/15 font-mono text-[9px] font-bold text-blue-400">3</div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Conversational Query?</p>
                    <p className="mt-0.5 text-[10px] text-white/40">reminders, questions, casual interaction</p>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <ChevronRight size={9} className="text-emerald-400/60" />
                        <span className="font-mono text-[9px] text-emerald-400/70">Latency OK → Qwen2.5:3b (faster)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ChevronRight size={9} className="text-blue-400/60" />
                        <span className="font-mono text-[9px] text-blue-400/70">Latency budget strict → Qwen or Cloud</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="ml-6 h-4 w-px bg-white/[0.06]" />

                
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.20 }}
                  className="flex gap-3 rounded-lg p-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-400/15 font-mono text-[9px] font-bold text-amber-400">4</div>
                  <div>
                    <p className="text-[11px] font-bold text-white">High Complexity (&gt; 0.75)?</p>
                    <p className="mt-0.5 text-[10px] text-white/40">multi-step reasoning, differential diagnosis</p>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <ChevronRight size={9} className="text-emerald-400/60" />
                        <span className="font-mono text-[9px] text-emerald-400/70">Local → MedGemma 4B</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ChevronRight size={9} className="text-blue-400/60" />
                        <span className="font-mono text-[9px] text-blue-400/70">No local → GPT-4o</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="ml-6 h-4 w-px bg-white/[0.06]" />

                
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.25 }}
                  className="flex gap-3 rounded-lg border border-white/[0.05] bg-white/[0.01] p-3"
                >
                  <Shield size={14} className="mt-0.5 shrink-0 text-white/30" />
                  <div>
                    <p className="text-[11px] font-bold text-white">Fallback Chain</p>
                    <div className="mt-1.5 flex items-center gap-1 font-mono text-[9px] text-white/35">
                      <span className="rounded bg-[#FF3B3B]/10 px-1.5 py-px text-[#FF3B3B]/70">MedGemma</span>
                      <ArrowRight size={8} />
                      <span className="rounded bg-blue-500/10 px-1.5 py-px text-blue-400/70">Qwen</span>
                      <ArrowRight size={8} />
                      <span className="rounded bg-white/[0.06] px-1.5 py-px text-white/40">GPT-4o</span>
                      <ArrowRight size={8} />
                      <span className="rounded bg-white/[0.04] px-1.5 py-px text-white/25">Static Response</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </InfraPanel>

            
            <InfraPanel title="Ollama Runtime Architecture" subtitle="llama.cpp inference engine" glow="blue">
              <div className="space-y-4 p-1">

                <div className="space-y-3">
                  {[
                    {
                      label: 'Runtime Engine',
                      value: 'llama.cpp (C++)',
                      detail: 'GGUF model format, SIMD-optimized',
                      color: 'text-[#FF3B3B]',
                    },
                    {
                      label: 'Quantization',
                      value: 'Q4_K_M',
                      detail: '4-bit mixed precision, 35% size reduction',
                      color: 'text-amber-400',
                    },
                    {
                      label: 'Threading',
                      value: 'OpenMP',
                      detail: 'Auto thread detection, pinned to performance cores',
                      color: 'text-blue-400',
                    },
                    {
                      label: 'Context Cache',
                      value: 'KV Cache',
                      detail: 'Persistent key-value cache across turns',
                      color: 'text-emerald-400',
                    },
                    {
                      label: 'Memory Layout',
                      value: 'mmap()',
                      detail: 'Memory-mapped model weights, zero-copy load',
                      color: 'text-purple-400',
                    },
                    {
                      label: 'API Server',
                      value: 'Ollama REST',
                      detail: 'OpenAI-compatible /api/generate endpoint',
                      color: 'text-white/60',
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.01] px-3.5 py-2.5"
                    >
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-wider text-white/28">{item.label}</p>
                        <p className="mt-0.5 text-[10px] text-white/40">{item.detail}</p>
                      </div>
                      <span className={`shrink-0 font-mono text-[11px] font-bold ${item.color}`}>{item.value}</span>
                    </motion.div>
                  ))}
                </div>

                
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.01] p-3">
                  <p className="mb-2.5 font-mono text-[9px] uppercase tracking-wider text-white/25">RAM Footprint</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'MedGemma 4B Q4_K_M', pct: 72, color: 'bg-[#FF3B3B]/50', value: '~2.8 GB' },
                      { label: 'Qwen2.5:3b Q4_K_M', pct: 48, color: 'bg-blue-400/50', value: '~1.9 GB' },
                      { label: 'Whisper Small INT8', pct: 8, color: 'bg-emerald-400/40', value: '~280 MB' },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-mono text-[9px] text-white/35">{bar.label}</span>
                          <span className="font-mono text-[9px] text-white/45">{bar.value}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${bar.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className={`h-full rounded-full ${bar.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </InfraPanel>
          </div>
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Implementation
          </p>
          <CodeBlock
            code={ROUTING_CODE}
            language="python"
            title="ai/router.py"
          />
        </section>

        
        <section>
          <CodeBlock
            code={VOICE_PIPELINE_CODE}
            language="python"
            title="voice/pipeline.py"
          />
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Model Registry
          </p>
          <DataTable<ModelRow>
            title="AI Model Comparison"
            subtitle="All models registered in RAFIQ runtime"
            columns={[
              {
                key: 'name',
                label: 'Model',
                render: (row) => (
                  <span className="font-bold text-white/80">{row.name}</span>
                ),
              },
              { key: 'provider', label: 'Provider' },
              { key: 'size', label: 'Size' },
              { key: 'quant', label: 'Quantization' },
              {
                key: 'latency',
                label: 'Latency',
                render: (row) => (
                  <span className="text-emerald-400/80">{row.latency}</span>
                ),
              },
              { key: 'context', label: 'Context' },
              { key: 'useCase', label: 'Primary Use-Case', className: 'max-w-xs' },
            ]}
            data={modelTableData}
          />
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Health Analysis Pipeline
          </p>
          <InfraPanel title="Vital Signs → LLM → Decision → Action" subtitle="end-to-end processing chain" glow="red">
            <div className="p-2">
              <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch sm:gap-0">
                {[
                  {
                    step: '01',
                    label: 'Sensor Input',
                    items: ['Heart Rate (BPM)', 'SpO₂ (%)', 'Blood Pressure', 'Temperature', 'Motion / Fall'],
                    color: 'border-amber-400/20 bg-amber-400/5',
                    badge: 'text-amber-400',
                  },
                  {
                    step: '02',
                    label: 'Threshold Check',
                    items: ['Rule-based filters', 'Soft alert zone', 'Hard alert zone', 'Emergency zone', 'Trend analysis'],
                    color: 'border-blue-400/20 bg-blue-400/5',
                    badge: 'text-blue-400',
                  },
                  {
                    step: '03',
                    label: 'LLM Reasoning',
                    items: ['MedGemma analysis', 'Context injection', 'Patient history', 'Differential dx', 'Confidence score'],
                    color: 'border-[#FF3B3B]/20 bg-[#FF3B3B]/5',
                    badge: 'text-[#FF3B3B]',
                  },
                  {
                    step: '04',
                    label: 'Decision + Action',
                    items: ['Alert generation', 'TTS announcement', 'SMS / call family', 'Home automation', 'Emergency 911'],
                    color: 'border-emerald-400/20 bg-emerald-400/5',
                    badge: 'text-emerald-400',
                  },
                ].map((stage, i) => (
                  <motion.div
                    key={stage.step}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.08 }}
                    className="flex flex-1 flex-col"
                  >
                    <div className={`flex flex-1 flex-col rounded-xl border p-4 ${stage.color}`}>
                      <div className={`mb-3 font-mono text-[9px] font-bold uppercase tracking-wider ${stage.badge}`}>
                        Step {stage.step} · {stage.label}
                      </div>
                      <ul className="space-y-1.5">
                        {stage.items.map((item) => (
                          <li key={item} className="flex items-center gap-1.5 text-[10px] text-white/45">
                            <span className={`h-1 w-1 rounded-full ${stage.badge.replace('text-', 'bg-').replace('/80', '/50').replace('/70', '/50')}`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {i < 3 && (
                      <div className="hidden items-center justify-center py-2 sm:flex">
                        <ArrowRight size={12} className="text-white/20 sm:rotate-0 rotate-90" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </InfraPanel>
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Anomaly Detection &amp; Emergency Classification
          </p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <InfraPanel title="Anomaly Detection Logic" subtitle="threshold rules + LLM reasoning" glow="red">
              <div className="space-y-3 p-1">
                <p className="text-[11px] leading-relaxed text-white/40">
                  RAFIQ uses a two-phase anomaly engine. Phase 1 applies deterministic threshold rules for known vital sign ranges. Phase 2 passes borderline cases to MedGemma with a structured prompt including patient history, recent metrics, and the suspected anomaly for probabilistic reasoning.
                </p>
                <div className="space-y-2">
                  {[
                    { metric: 'Heart Rate', soft: '< 50 or > 110 BPM', hard: '< 40 or > 140 BPM', emerg: '< 30 or > 180 BPM' },
                    { metric: 'SpO₂', soft: '< 94%', hard: '< 91%', emerg: '< 88%' },
                    { metric: 'Temperature', soft: '> 37.8°C', hard: '> 38.5°C', emerg: '> 40°C or < 35°C' },
                    { metric: 'Systolic BP', soft: '> 140 mmHg', hard: '> 160 mmHg', emerg: '> 180 mmHg' },
                  ].map((row) => (
                    <div key={row.metric} className="rounded-lg border border-white/[0.05] bg-white/[0.01] p-3">
                      <p className="mb-2 font-mono text-[10px] font-bold text-white/70">{row.metric}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="font-mono text-[8px] uppercase text-amber-400/50">Soft</p>
                          <p className="font-mono text-[9px] text-amber-400/70">{row.soft}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[8px] uppercase text-orange-400/50">Hard</p>
                          <p className="font-mono text-[9px] text-orange-400/70">{row.hard}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[8px] uppercase text-[#FF3B3B]/50">Emerg</p>
                          <p className="font-mono text-[9px] text-[#FF3B3B]/70">{row.emerg}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </InfraPanel>

            <InfraPanel title="Emergency Classification" subtitle="severity levels & escalation" glow="blue">
              <div className="space-y-3 p-1">
                {[
                  {
                    level: 'SEV-1',
                    label: 'Critical',
                    color: 'text-[#FF3B3B]',
                    bg: 'bg-[#FF3B3B]/10 border-[#FF3B3B]/20',
                    triggers: 'Fall + unresponsive, SpO₂ < 88%, cardiac rhythm anomaly',
                    action: 'Emergency 911 call, family SMS, all home devices alert, voice emergency mode',
                    sla: '< 5s',
                  },
                  {
                    level: 'SEV-2',
                    label: 'Urgent',
                    color: 'text-orange-400',
                    bg: 'bg-orange-400/10 border-orange-400/20',
                    triggers: 'Hard threshold breach, gas detected, temperature critical',
                    action: 'Family SMS, voice alert, automatic valve close (gas), doctor notification',
                    sla: '< 15s',
                  },
                  {
                    level: 'SEV-3',
                    label: 'Warning',
                    color: 'text-amber-400',
                    bg: 'bg-amber-400/10 border-amber-400/20',
                    triggers: 'Soft threshold, irregular pattern, medication miss',
                    action: 'Voice reminder, mobile push notification, dashboard alert',
                    sla: '< 60s',
                  },
                  {
                    level: 'SEV-4',
                    label: 'Informational',
                    color: 'text-blue-400',
                    bg: 'bg-blue-400/10 border-blue-400/20',
                    triggers: 'Trend anomaly, slight deviation, hydration low',
                    action: 'Dashboard log, next-interaction voice mention',
                    sla: 'async',
                  },
                ].map((sev, i) => (
                  <motion.div
                    key={sev.level}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.07 }}
                    className={`rounded-xl border p-3.5 ${sev.bg}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={11} className={sev.color} />
                        <span className={`font-mono text-[10px] font-bold ${sev.color}`}>{sev.level} · {sev.label}</span>
                      </div>
                      <span className="font-mono text-[9px] text-white/30">SLA: {sev.sla}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-white/40"><span className="text-white/55">Triggers:</span> {sev.triggers}</p>
                    <p className="mt-1 text-[10px] text-white/40"><span className="text-white/55">Actions:</span> {sev.action}</p>
                  </motion.div>
                ))}
              </div>
            </InfraPanel>
          </div>
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Conversational Memory System
          </p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ArchCard
              icon={<Layers size={16} strokeWidth={1.5} />}
              title="Context Window"
              sublabel="Short-term memory · 4096 tokens"
              description="Active conversation kept in a rolling 4096-token context window. Older turns are summarized and compressed when the window fills, using MedGemma's summarize prompt."
              status="online"
              metrics={[
                { label: 'Window Size', value: '4096 tok' },
                { label: 'Summary Model', value: 'MedGemma' },
                { label: 'Compression', value: '~80%' },
              ]}
              tags={['KV Cache', 'Rolling Window', 'Compression']}
              accent="red"
              delay={0.05}
            />
            <ArchCard
              icon={<Activity size={16} strokeWidth={1.5} />}
              title="Long-term Memory"
              sublabel="SQLite ai_memory table"
              description="Compressed summaries, patient preferences, and AI observations stored in the ai_memory SQLite table. Retrieved via FTS5 semantic search on each new conversation."
              status="online"
              metrics={[
                { label: 'Storage', value: 'SQLite FTS5' },
                { label: 'Retrieval', value: 'keyword match' },
                { label: 'Max Entries', value: '10,000' },
              ]}
              tags={['FTS5', 'SQLite', 'Long-term']}
              accent="blue"
              delay={0.1}
            />
            <ArchCard
              icon={<Heart size={16} strokeWidth={1.5} />}
              title="Patient Profile"
              sublabel="Injected context · every turn"
              description="Structured patient profile (age, conditions, medications, allergies, preferences) injected into every LLM prompt as a system context block, ensuring personalized health responses."
              status="online"
              metrics={[
                { label: 'Profile Format', value: 'JSON→Prompt' },
                { label: 'Token Cost', value: '~120 tok' },
                { label: 'Updated', value: 'Real-time' },
              ]}
              tags={['Profile', 'System Prompt', 'Personalized']}
              accent="emerald"
              delay={0.15}
            />
          </div>
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Emotional AI States
          </p>
          <InfraPanel title="RAFIQ Emotional State Machine" subtitle="4 operational modes" glow="none">
            <div className="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2">
              {EMOTION_STATES.map((s, i) => (
                <motion.div
                  key={s.state}
                  initial={{ opacity: 0, scale: 0.97 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.07 }}
                  className={`rounded-xl border p-4 ${s.bg} ${s.border}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${s.color}`}>
                      {s.state}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-white/25">Trigger Condition</p>
                      <p className="mt-0.5 text-[10px] text-white/50">{s.trigger}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-white/25">Voice Style</p>
                      <p className="mt-0.5 text-[10px] text-white/50">{s.voice}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-white/25">Avatar Behavior</p>
                      <p className="mt-0.5 text-[10px] text-white/50">{s.avatar}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </InfraPanel>
        </section>

        
        <section>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Runtime Status
          </p>
          <InfraPanel title="Ollama Service Endpoints" subtitle="localhost inference server" glow="none">
            <div className="divide-y divide-white/[0.05] p-1">
              {[
                { method: 'POST', path: '/api/generate', desc: 'Single-shot text completion', latency: '~160ms', status: 'online' as const },
                { method: 'POST', path: '/api/chat', desc: 'Multi-turn chat completion (OpenAI compat)', latency: '~160ms', status: 'online' as const },
                { method: 'POST', path: '/api/embeddings', desc: 'Text embedding generation', latency: '~40ms', status: 'online' as const },
                { method: 'GET',  path: '/api/tags', desc: 'List available models', latency: '< 5ms', status: 'online' as const },
                { method: 'GET',  path: '/api/ps', desc: 'Running model processes', latency: '< 5ms', status: 'online' as const },
                { method: 'POST', path: '/api/pull', desc: 'Pull model from Ollama registry', latency: 'async', status: 'idle' as const },
              ].map((ep, i) => (
                <motion.div
                  key={ep.path}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="flex items-center gap-3 px-2 py-3"
                >
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${ep.method === 'POST' ? 'bg-[#FF3B3B]/10 text-[#FF3B3B]/70' : 'bg-blue-400/10 text-blue-400/70'}`}>
                    {ep.method}
                  </span>
                  <span className="flex-1 font-mono text-[11px] text-white/60">{ep.path}</span>
                  <span className="hidden text-[10px] text-white/35 sm:block">{ep.desc}</span>
                  <span className="font-mono text-[10px] text-white/35">{ep.latency}</span>
                  <StatusPulse status={ep.status} size="xs" />
                </motion.div>
              ))}
            </div>
          </InfraPanel>
        </section>

      </div>
    </div>
  );
}
