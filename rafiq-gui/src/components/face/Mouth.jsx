import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

// Mouth configurations per state
const STATE_MOUTH_CONFIG = {
  idle: {
    type: 'neutral',
    color: '#00d4ff',
    width: 16,
    height: 6,
    curve: 0.3,
    opacity: 0.9
  },
  listening: {
    type: 'open',
    color: '#00ffcc',
    width: 28,
    height: 14,
    curve: 0.6,
    opacity: 1
  },
  thinking: {
    type: 'pursed',
    color: '#a855f7',
    width: 14,
    height: 10,
    curve: 0.2,
    opacity: 0.85
  },
  speaking: {
    type: 'talking',
    color: '#00ffcc',
    width: 32,
    height: 18,
    curve: 0.5,
    opacity: 1
  },
  sleep: {
    type: 'closed',
    color: '#334155',
    width: 12,
    height: 2,
    curve: 0.1,
    opacity: 0.4
  },
  warning: {
    type: 'concerned',
    color: '#ff9500',
    width: 22,
    height: 12,
    curve: 0.3,
    opacity: 1
  },
  emergency: {
    type: 'open',
    color: '#ff3b5c',
    width: 30,
    height: 20,
    curve: 0.5,
    opacity: 1
  },
  offline: {
    type: 'neutral',
    color: '#6b8fa3',
    width: 14,
    height: 5,
    curve: 0.2,
    opacity: 0.5
  }
};

// Emotion modifiers for mouth
const EMOTION_MOUTH_MODS = {
  neutral: { smile: 0, open: 0 },
  happy: { smile: 1, open: 0.2 },
  calm: { smile: 0.4, open: 0 },
  focused: { smile: 0.1, open: 0 },
  excited: { smile: 0.8, open: 0.3 },
  worried: { smile: -0.3, open: 0.1 },
  sleepy: { smile: 0.1, open: -0.1 }
};

const Mouth = () => {
  const { aiState, speakingText, emotion } = useAIStore();
  const [talkPhase, setTalkPhase] = useState(0);

  const mouthConfig = STATE_MOUTH_CONFIG[aiState] || STATE_MOUTH_CONFIG.idle;
  const emotionMod = EMOTION_MOUTH_MODS[emotion] || EMOTION_MOUTH_MODS.neutral;

  // Talking animation phase
  useEffect(() => {
    if (aiState !== 'speaking') {
      setTalkPhase(0);
      return;
    }

    const interval = setInterval(() => {
      setTalkPhase(prev => (prev + 1) % 8);
    }, 100); // 8 phases for smooth talking

    return () => clearInterval(interval);
  }, [aiState]);

  // Position: mouth at ~58% from top
  const mouthStyle = useMemo(() => ({
    top: '58%'
  }), []);

  // Calculate SVG path for mouth shape
  const getMouthPath = useMemo(() => {
    const baseWidth = mouthConfig.width + (emotionMod.smile * 8);
    const baseHeight = mouthConfig.height + (emotionMod.open * 4);
    const curve = mouthConfig.curve + (emotionMod.smile * 0.3);

    if (aiState === 'speaking') {
      // Talking mouth - animated opening/closing
      const openAmount = Math.sin((talkPhase / 8) * Math.PI * 2) * 0.5 + 0.5;
      const height = baseHeight * (0.5 + openAmount * 0.6);
      const width = baseWidth * (0.8 + openAmount * 0.2);

      return `M ${-width/2} ${-height/4}
              Q 0 ${height/2} ${width/2} ${-height/4}
              Q 0 ${height * 0.7} ${-width/2} ${-height/4}`;
    }

    if (aiState === 'sleep') {
      // Closed/sleeping mouth
      return `M ${-baseWidth/2} 0 Q 0 2 ${baseWidth/2} 0`;
    }

    if (aiState === 'listening' || aiState === 'emergency' || aiState === 'warning') {
      // Open mouth
      const height = baseHeight * 1.2;
      return `M ${-baseWidth/2} ${-height/3}
              Q 0 ${height/2} ${baseWidth/2} ${-height/3}
              Q 0 ${height * 0.8} ${-baseWidth/2} ${-height/3}`;
    }

    // Neutral/default - curved smile
    const smileCurve = emotionMod.smile * 8;
    return `M ${-baseWidth/2} ${smileCurve}
            Q 0 ${baseHeight + smileCurve} ${baseWidth/2} ${smileCurve}`;
  }, [aiState, mouthConfig, emotionMod, talkPhase]);

  // Voice waveform bars for speaking state
  const waveformBars = useMemo(() => {
    if (aiState !== 'speaking') return [];

    return Array.from({ length: 12 }, (_, i) => {
      const height = Math.sin((i / 12) * Math.PI) * 20 + 8;
      const phase = (talkPhase + i) % 8;
      const animHeight = height * (0.3 + (Math.sin(phase / 8 * Math.PI * 2) + 1) * 0.35);
      return { i, height: animHeight };
    });
  }, [aiState, talkPhase]);

  // Sleep Z's
  if (aiState === 'sleep') {
    return (
      <div
        className="absolute left-1/2 flex flex-col items-center"
        style={{ ...mouthStyle, transform: 'translateX(-50%)' }}
      >
        <motion.div
          className="flex gap-0.5"
          animate={{ opacity: [0.2, 0.5, 0.2], y: [0, -3, 0] }}
          transition={{ duration: 3.5, repeat: Infinity }}
        >
          <span className="text-rafiq-text-dim text-lg font-light">z</span>
          <span className="text-rafiq-text-dim text-sm font-light">z</span>
          <span className="text-rafiq-text-dim text-xs font-light opacity-60">z</span>
        </motion.div>
      </div>
    );
  }

  // Speaking state: show voice waveform
  if (aiState === 'speaking') {
    return (
      <div
        className="absolute left-1/2 flex flex-col items-center"
        style={{ ...mouthStyle, transform: 'translateX(-50%)' }}
      >
        {/* Voice waveform */}
        <div className="flex items-end gap-0.5 h-10">
          {waveformBars.map(({ i, height }) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{
                height: `${height}px`,
                background: `linear-gradient(to top, ${mouthConfig.color}, ${mouthConfig.color}80)`
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 0.2,
                repeat: Infinity,
                delay: i * 0.02
              }}
            />
          ))}
        </div>

        {/* Subtle mouth glow */}
        <div
          className="absolute w-16 h-8 rounded-full blur-md -bottom-2"
          style={{
            background: mouthConfig.color,
            opacity: 0.3
          }}
        />
      </div>
    );
  }

  // Animated SVG mouth
  return (
    <motion.div
      className="absolute left-1/2"
      style={{ ...mouthStyle, transform: 'translateX(-50%)' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: mouthConfig.opacity, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <svg
        width={mouthConfig.width + 20}
        height={mouthConfig.height + 15}
        viewBox={`${-(mouthConfig.width + 20)/2} ${-5} ${mouthConfig.width + 20} ${mouthConfig.height + 15}`}
        className="overflow-visible"
      >
        {/* Glow filter */}
        <defs>
          <filter id="mouthGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient fill */}
          <linearGradient id="mouthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={mouthConfig.color} />
            <stop offset="50%" stopColor={`${mouthConfig.color}cc`} />
            <stop offset="100%" stopColor={mouthConfig.color} />
          </linearGradient>
        </defs>

        {/* Mouth path */}
        <motion.path
          d={getMouthPath}
          fill="none"
          stroke={`url(#mouthGradient)`}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#mouthGlow)"
          animate={{
            d: getMouthPath
          }}
          transition={{ duration: 0.15 }}
        />

        {/* Inner fill for open mouth states */}
        {(aiState === 'listening' || aiState === 'emergency' || aiState === 'warning') && (
          <motion.path
            d={getMouthPath}
            fill={`${mouthConfig.color}30`}
            stroke="none"
            animate={{ d: getMouthPath }}
            transition={{ duration: 0.15 }}
          />
        )}
      </svg>

      {/* Mouth glow aura */}
      <div
        className="absolute inset-0 rounded-full blur-lg -z-10"
        style={{
          background: mouthConfig.color,
          opacity: mouthConfig.opacity * 0.2,
          transform: 'scale(1.5) translateY(20%)'
        }}
      />
    </motion.div>
  );
};

export default Mouth;