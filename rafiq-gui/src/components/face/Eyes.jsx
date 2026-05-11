import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

// Eye colors based on state
const STATE_EYE_COLORS = {
  idle: { color: '#00d4ff', glow: 'rgba(0, 212, 255, 0.6)', size: 1 },
  listening: { color: '#00ffcc', glow: 'rgba(0, 255, 204, 0.7)', size: 1.1 },
  thinking: { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)', size: 1 },
  speaking: { color: '#00ffcc', glow: 'rgba(0, 255, 204, 0.8)', size: 1.1 },
  sleep: { color: '#334155', glow: 'rgba(51, 65, 85, 0.3)', size: 0.6 },
  warning: { color: '#ff9500', glow: 'rgba(255, 149, 0, 0.7)', size: 1.15 },
  emergency: { color: '#ff3b5c', glow: 'rgba(255, 59, 92, 0.8)', size: 1.2 },
  offline: { color: '#6b8fa3', glow: 'rgba(107, 143, 163, 0.4)', size: 0.8 }
};

// Emotion modifiers for eyes
const EMOTION_EYE_MODS = {
  neutral: { squint: 0, focus: 1, tilt: 0 },
  happy: { squint: 0.3, focus: 0.9, tilt: 0.05 },
  calm: { squint: 0.1, focus: 1, tilt: 0 },
  focused: { squint: -0.1, focus: 1.1, tilt: 0 },
  excited: { squint: 0.2, focus: 1.05, tilt: 0.08 },
  worried: { squint: 0.15, focus: 1.05, tilt: -0.03 },
  sleepy: { squint: 0.5, focus: 0.7, tilt: 0 }
};

const Eyes = () => {
  const { aiState, emotion } = useAIStore();
  const [blink, setBlink] = useState(false);
  const [microPos, setMicroPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Get current eye configuration
  const eyeConfig = STATE_EYE_COLORS[aiState] || STATE_EYE_COLORS.idle;
  const emotionMod = EMOTION_EYE_MODS[emotion] || EMOTION_EYE_MODS.neutral;

  // Position: eyes at ~42% from top
  const eyeStyle = useMemo(() => ({
    top: '42%',
    spacing: aiState === 'emergency' || aiState === 'warning' ? 52 : 48
  }), [aiState]);

  // Blink timer
  useEffect(() => {
    if (aiState === 'sleep') return;

    const blinkInterval = setInterval(() => {
      // Natural blink with slight randomness
      const delay = 2500 + Math.random() * 3000;
      setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 120);
      }, delay);
    }, 4000);

    return () => clearInterval(blinkInterval);
  }, [aiState]);

  // Micro movement - subtle random eye drift
  useEffect(() => {
    if (aiState === 'sleep' || aiState === 'offline') return;

    const microInterval = setInterval(() => {
      setMicroPos({
        x: (Math.random() - 0.5) * 4, // -2 to 2 pixels
        y: (Math.random() - 0.5) * 2  // -1 to 1 pixels
      });
    }, 800);

    return () => clearInterval(microInterval);
  }, [aiState]);

  // Calculate vertical position based on emotion
  const verticalOffset = useMemo(() => {
    const base = 42;
    const squintAdjust = emotionMod.squint * -1; // Happy squint moves eyes up slightly
    return base + squintAdjust;
  }, [emotionMod.squint]);

  // Calculate scale based on state and emotion
  const scaleY = useMemo(() => {
    if (blink || aiState === 'sleep') return 0.1;

    const baseScale = eyeConfig.size;
    const squintFactor = 1 - (emotionMod.squint * 0.15);
    return baseScale * squintFactor;
  }, [blink, aiState, eyeConfig.size, emotionMod.squint]);

  // Calculate opacity
  const opacity = useMemo(() => {
    if (aiState === 'sleep') return 0.3;
    if (aiState === 'offline') return 0.5;
    return 1;
  }, [aiState]);

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 flex items-center justify-center"
      style={{
        top: `${verticalOffset}%`,
        transform: `translate(-50%, -50%) rotateX(${emotionMod.tilt * 5}deg)`,
        gap: `${eyeStyle.spacing}px`
      }}
    >
      {/* Left Eye */}
      <div
        className="relative"
        style={{
          transform: `translate(${microPos.x}px, ${microPos.y}px)`,
          opacity
        }}
      >
        <motion.div
          className="relative"
          animate={{ scaleY }}
          transition={{ duration: 0.12 }}
          style={{ transformOrigin: 'center center' }}
        >
          {/* Eye glow aura */}
          <div
            className="absolute rounded-full"
            style={{
              width: 48,
              height: 48,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: eyeConfig.glow,
              filter: 'blur(12px)',
              opacity: 0.6
            }}
          />

          {/* Main eye */}
          <div
            className="relative w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${eyeConfig.color}60, ${eyeConfig.color})`,
              boxShadow: `
                0 0 20px ${eyeConfig.glow},
                inset 0 2px 4px rgba(255,255,255,0.3),
                inset 0 -2px 4px rgba(0,0,0,0.2)
              `
            }}
          >
            {/* Pupil */}
            <div
              className="w-5 h-5 rounded-full relative"
              style={{
                background: `radial-gradient(circle at 40% 40%, #111, ${eyeConfig.color})`
              }}
            >
              {/* Primary highlight */}
              <div
                className="absolute rounded-full"
                style={{
                  width: '35%',
                  height: '35%',
                  top: '15%',
                  left: '20%',
                  background: 'rgba(255,255,255,0.8)'
                }}
              />
              {/* Secondary highlight */}
              <div
                className="absolute rounded-full opacity-50"
                style={{
                  width: '20%',
                  height: '20%',
                  top: '55%',
                  left: '55%',
                  background: 'rgba(255,255,255,0.5)'
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Eye */}
      <div
        className="relative"
        style={{
          transform: `translate(${microPos.x}px, ${microPos.y}px)`,
          opacity
        }}
      >
        <motion.div
          className="relative"
          animate={{ scaleY }}
          transition={{ duration: 0.12 }}
          style={{ transformOrigin: 'center center' }}
        >
          {/* Eye glow aura */}
          <div
            className="absolute rounded-full"
            style={{
              width: 48,
              height: 48,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: eyeConfig.glow,
              filter: 'blur(12px)',
              opacity: 0.6
            }}
          />

          {/* Main eye */}
          <div
            className="relative w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${eyeConfig.color}60, ${eyeConfig.color})`,
              boxShadow: `
                0 0 20px ${eyeConfig.glow},
                inset 0 2px 4px rgba(255,255,255,0.3),
                inset 0 -2px 4px rgba(0,0,0,0.2)
              `
            }}
          >
            {/* Pupil */}
            <div
              className="w-5 h-5 rounded-full relative"
              style={{
                background: `radial-gradient(circle at 40% 40%, #111, ${eyeConfig.color})`
              }}
            >
              {/* Primary highlight */}
              <div
                className="absolute rounded-full"
                style={{
                  width: '35%',
                  height: '35%',
                  top: '15%',
                  left: '20%',
                  background: 'rgba(255,255,255,0.8)'
                }}
              />
              {/* Secondary highlight */}
              <div
                className="absolute rounded-full opacity-50"
                style={{
                  width: '20%',
                  height: '20%',
                  top: '55%',
                  left: '55%',
                  background: 'rgba(255,255,255,0.5)'
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sleep Z's */}
      <AnimatePresence>
        {aiState === 'sleep' && (
          <motion.div
            className="absolute -top-8 left-1/2 flex gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0.3, 0.8, 0.3], y: [0, -5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-rafiq-text-dim text-sm font-light">z</span>
            <span className="text-rafiq-text-dim text-xs font-light">z</span>
            <span className="text-rafiq-text-dim text-xs font-light opacity-70">z</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening indicator - listening focus rings */}
      <AnimatePresence>
        {aiState === 'listening' && (
          <motion.div
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full bg-rafiq-accent"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Eyes;