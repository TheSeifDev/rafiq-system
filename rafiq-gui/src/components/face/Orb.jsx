import React, { useMemo, useEffect, useRef } from 'react';
import { motion, useAnimation, useTransform, useSpring } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

// Color configurations for each AI state
const STATE_COLORS = {
  idle: { primary: '#00d4ff', secondary: '#0066cc', intensity: 0.7, glow: 1.0 },
  listening: { primary: '#00ffcc', secondary: '#00d4ff', intensity: 1.0, glow: 1.3 },
  thinking: { primary: '#a855f7', secondary: '#7c3aed', intensity: 0.9, glow: 1.2 },
  speaking: { primary: '#00ffcc', secondary: '#00ff88', intensity: 1.0, glow: 1.4 },
  sleep: { primary: '#334155', secondary: '#1e293b', intensity: 0.3, glow: 0.5 },
  warning: { primary: '#ff9500', secondary: '#ffcc00', intensity: 1.0, glow: 1.3 },
  emergency: { primary: '#ff3b5c', secondary: '#ff0000', intensity: 1.0, glow: 1.5 },
  offline: { primary: '#6b8fa3', secondary: '#334155', intensity: 0.4, glow: 0.6 }
};

// Emotion modifiers
const EMOTION_MODIFIERS = {
  neutral: { eyeScale: 1, smile: 0, excitement: 0 },
  happy: { eyeScale: 0.9, smile: 1, excitement: 0.3 },
  calm: { eyeScale: 1.1, smile: 0.3, excitement: -0.2 },
  focused: { eyeScale: 1, smile: 0, excitement: 0.2 },
  excited: { eyeScale: 0.85, smile: 0.8, excitement: 0.5 },
  worried: { eyeScale: 1.1, smile: -0.3, excitement: 0.2 },
  sleepy: { eyeScale: 0.95, smile: 0.1, excitement: -0.3 }
};

const Orb = () => {
  const { aiState, emotion } = useAIStore();
  const controls = useAnimation();
  const containerRef = useRef(null);

  // Get current color configuration
  const colors = STATE_COLORS[aiState] || STATE_COLORS.idle;
  const emotionMod = EMOTION_MODIFIERS[emotion] || EMOTION_MODIFIERS.neutral;

  // Breathing animation timing based on state
  const breatheDuration = useMemo(() => {
    const durations = {
      idle: 4,
      listening: 2.5,
      thinking: 3,
      speaking: 1.5,
      sleep: 6,
      warning: 1.5,
      emergency: 0.8,
      offline: 5
    };
    return durations[aiState] || 4;
  }, [aiState]);

  // Pulse intensity based on state
  const pulseIntensity = useMemo(() => {
    const intensities = {
      idle: 1,
      listening: 1.15,
      thinking: 1.1,
      speaking: 1.25,
      sleep: 0.7,
      warning: 1.2,
      emergency: 1.4,
      offline: 0.8
    };
    return intensities[aiState] || 1;
  }, [aiState]);

  // Start breathing animation
  useEffect(() => {
    const startBreathing = async () => {
      if (aiState === 'sleep') return;

      await controls.start({
        scale: [1, 1.03 * pulseIntensity, 1],
        opacity: [colors.intensity * 0.85, colors.intensity, colors.intensity * 0.85],
        transition: {
          duration: breatheDuration,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
    };

    startBreathing();

    if (aiState === 'sleep') {
      // Slow dim breathing for sleep
      controls.start({
        scale: [1, 1.015, 1],
        opacity: [0.25, 0.35, 0.25],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
    }
  }, [aiState, breatheDuration, pulseIntensity, colors.intensity, controls]);

  // Generate glow rings
  const glowRings = useMemo(() => {
    const count = aiState === 'emergency' ? 5 : aiState === 'warning' ? 4 : 3;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [aiState]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center" style={{ perspective: 800 }}>
      {/* Layer 1: Outer atmosphere / volumetric glow */}
      <motion.div
        className="absolute rounded-full"
        animate={controls}
        style={{
          width: 280,
          height: 280,
          background: `radial-gradient(circle at 40% 35%, ${colors.primary}20, transparent 70%)`,
          filter: 'blur(40px)',
          boxShadow: `0 0 80px ${colors.primary}30`,
          transform: 'translateZ(-30px)'
        }}
      />

      {/* Layer 2: Outer glow rings */}
      {glowRings.map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full"
          initial={{ width: 200, height: 200, opacity: 0.15 * colors.glow }}
          animate={{
            width: 200 + ring * 45,
            height: 200 + ring * 45,
            opacity: [0.15 * colors.glow, 0.05, 0.15 * colors.glow]
          }}
          transition={{
            duration: 3 + ring * 0.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            border: `1px solid ${colors.primary}30`,
            boxShadow: `0 0 ${20 + ring * 15}px ${colors.primary}20`,
            transform: `translateZ(${-10 - ring * 5}px)`
          }}
        />
      ))}

      {/* Layer 3: Mid glow layer */}
      <motion.div
        className="absolute rounded-full"
        animate={controls}
        style={{
          width: 220,
          height: 220,
          background: `radial-gradient(circle at 35% 30%, ${colors.primary}50, ${colors.secondary}30 60%, transparent 80%)`,
          filter: 'blur(25px)',
          boxShadow: `0 0 60px ${colors.primary}40`,
          transform: 'translateZ(-10px)'
        }}
      />

      {/* Layer 4: Core orb with pseudo-3D effect */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{
          width: 180,
          height: 180,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Main orb body - pseudo-3D with gradients */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                ellipse at 30% 25%,
                ${colors.primary}cc 0%,
                ${colors.secondary}99 25%,
                ${colors.primary}66 50%,
                ${colors.secondary}44 75%,
                ${colors.secondary}22 100%
              )
            `,
            boxShadow: `
              inset -20px -20px 40px ${colors.secondary}40,
              inset 15px 15px 30px ${colors.primary}30,
              0 0 50px ${colors.primary}60,
              0 0 100px ${colors.primary}30
            `,
            transform: 'translateZ(20px)'
          }}
        />

        {/* Inner core glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: '60%',
            height: '60%',
            top: '20%',
            left: '20%',
            background: `radial-gradient(circle at 40% 40%, ${colors.primary}80, transparent)`,
            filter: 'blur(15px)',
            transform: 'translateZ(30px)'
          }}
        />

        {/* Specular highlight - top left */}
        <div
          className="absolute rounded-full"
          style={{
            width: '35%',
            height: '25%',
            top: '12%',
            left: '18%',
            background: `linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`,
            filter: 'blur(5px)',
            transform: 'translateZ(35px) rotateZ(-20deg)',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
          }}
        />

        {/* Secondary highlight */}
        <div
          className="absolute rounded-full opacity-40"
          style={{
            width: '15%',
            height: '10%',
            top: '20%',
            left: '55%',
            background: 'rgba(255,255,255,0.6)',
            filter: 'blur(3px)',
            transform: 'translateZ(32px)'
          }}
        />

        {/* Bottom rim light */}
        <div
          className="absolute rounded-full"
          style={{
            width: '70%',
            height: '30%',
            bottom: '10%',
            left: '15%',
            background: `linear-gradient(0deg, ${colors.primary}40, transparent)`,
            filter: 'blur(10px)',
            transform: 'translateZ(15px)',
            borderRadius: '50% 50% 0 0 / 100% 100% 0 0'
          }}
        />
      </motion.div>

      {/* Layer 5: Holographic shimmer effect */}
      <motion.div
        className="absolute w-64 h-64 rounded-full opacity-20 pointer-events-none"
        animate={{
          background: [
            `linear-gradient(135deg, transparent 40%, ${colors.primary}30 50%, transparent 60%)`,
            `linear-gradient(225deg, transparent 40%, ${colors.primary}30 50%, transparent 60%)`,
            `linear-gradient(315deg, transparent 40%, ${colors.primary}30 50%, transparent 60%)`,
            `linear-gradient(45deg, transparent 40%, ${colors.primary}30 50%, transparent 60%)`
          ],
          rotate: [0, 360]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          maskImage: 'radial-gradient(circle, black 50%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 70%)'
        }}
      />

      {/* State-specific effects */}
      {aiState === 'listening' && <ListeningPulse colors={colors} />}
      {aiState === 'thinking' && <ThinkingOrbit colors={colors} />}
      {aiState === 'speaking' && <SpeakingWave colors={colors} />}
    </div>
  );
};

// Listening state: expanding rings
const ListeningPulse = ({ colors }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {[1, 2, 3, 4, 5].map((i) => (
      <motion.div
        key={i}
        className="absolute border-2 rounded-full"
        style={{ borderColor: colors.primary }}
        initial={{ width: 100, height: 100, opacity: 0.6 }}
        animate={{
          width: 100 + i * 50,
          height: 100 + i * 50,
          opacity: [0.5, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: i * 0.25,
          ease: "easeOut"
        }}
      />
    ))}
  </div>
);

// Thinking state: orbital particles
const ThinkingOrbit = ({ colors }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full"
        style={{
          backgroundColor: colors.primary,
          boxShadow: `0 0 8px ${colors.primary}`
        }}
        animate={{
          rotate: [0, 360],
          x: [
            Math.cos((i * 30 * Math.PI) / 180) * 100,
            Math.cos(((i * 30 + 120) * Math.PI) / 180) * 115,
            Math.cos(((i * 30 + 240) * Math.PI) / 180) * 100,
            Math.cos(((i * 30 + 360) * Math.PI) / 180) * 90
          ],
          y: [
            Math.sin((i * 30 * Math.PI) / 180) * 100,
            Math.sin(((i * 30 + 120) * Math.PI) / 180) * 115,
            Math.sin(((i * 30 + 240) * Math.PI) / 180) * 100,
            Math.sin(((i * 30 + 360) * Math.PI) / 180) * 90
          ],
          opacity: [0.4, 1, 0.6, 0.4]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    ))}
  </div>
);

// Speaking state: voice wave visualization
const SpeakingWave = ({ colors }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="flex items-end gap-1 h-16">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <motion.div
          key={i}
          className="w-2 rounded-full"
          style={{ backgroundColor: colors.primary }}
          animate={{
            height: [8, 48, 24, 56, 12, 40, 20, 32, 8],
            opacity: [0.5, 1, 0.7, 1, 0.5, 1, 0.6, 1, 0.5]
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.06
          }}
        />
      ))}
    </div>
  </div>
);

export default Orb;