import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';
import Orb from './Orb';
import Eyes from './Eyes';
import Mouth from './Mouth';

// State transition spring configs
const STATE_TRANSITIONS = {
  idle: { type: "spring", stiffness: 100, damping: 15 },
  listening: { type: "spring", stiffness: 120, damping: 12 },
  thinking: { type: "spring", stiffness: 90, damping: 18 },
  speaking: { type: "spring", stiffness: 150, damping: 10 },
  sleep: { type: "spring", stiffness: 50, damping: 20 },
  warning: { type: "spring", stiffness: 180, damping: 8 },
  emergency: { type: "spring", stiffness: 200, damping: 6 },
  offline: { type: "spring", stiffness: 60, damping: 25 }
};

// Emotion-specific motion modifiers
const EMOTION_MOTION = {
  neutral: { swayX: 0.5, swayY: 0.3, tilt: 0 },
  happy: { swayX: 0.8, swayY: 0.5, tilt: 2 },
  calm: { swayX: 0.3, swayY: 0.2, tilt: 0 },
  focused: { swayX: 0.4, swayY: 0.3, tilt: 1 },
  excited: { swayX: 1.2, swayY: 0.8, tilt: 3 },
  worried: { swayX: 0.6, swayY: 0.4, tilt: -2 },
  sleepy: { swayX: 0.1, swayY: 0.1, tilt: 0 }
};

const Face = () => {
  const { aiState, emotion, handleTouch } = useAIStore();
  const containerRef = useRef(null);
  const controls = useAnimation();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Get transition config for current state
  const transition = STATE_TRANSITIONS[aiState] || STATE_TRANSITIONS.idle;
  const motionMod = EMOTION_MOTION[emotion] || EMOTION_MOTION.neutral;

  // Subtle parallax response to touch
  const handleClick = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;

      setMousePos({ x: x * 15, y: y * 15 });
      handleTouch(e.clientX - rect.left, e.clientY - rect.top);

      // Animate back to center
      setTimeout(() => {
        setMousePos({ x: 0, y: 0 });
      }, 500);
    }
  };

  // Ambient sway animation
  useEffect(() => {
    if (aiState === 'sleep' || aiState === 'offline') return;

    const startSway = async () => {
      await controls.start({
        rotateX: [motionMod.tilt + motionMod.swayY, motionMod.tilt - motionMod.swayY, motionMod.tilt],
        rotateY: [0, motionMod.swayX, -motionMod.swayX, 0],
        transition: {
          duration: 6 + Math.random() * 4,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
    };

    startSway();
  }, [aiState, motionMod, controls]);

  // Calculate parallax offset based on mouse/touch
  const parallaxStyle = useMemo(() => {
    const intensity = aiState === 'listening' || aiState === 'speaking' ? 1.2 : 1;
    return {
      rotateX: mousePos.y * intensity * 0.3 + (aiState === 'sleep' ? 5 : 0),
      rotateY: mousePos.x * intensity * 0.5,
      translateX: mousePos.x * 0.3,
      translateY: mousePos.y * 0.3
    };
  }, [mousePos, aiState]);

  // State-specific background effects
  const backgroundEffect = useMemo(() => {
    switch (aiState) {
      case 'emergency':
        return 'radial-gradient(circle at 50% 50%, rgba(255, 59, 92, 0.2) 0%, transparent 50%)';
      case 'warning':
        return 'radial-gradient(circle at 50% 50%, rgba(255, 149, 0, 0.15) 0%, transparent 50%)';
      case 'listening':
        return 'radial-gradient(circle at 50% 50%, rgba(0, 255, 204, 0.1) 0%, transparent 50%)';
      default:
        return 'radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.08) 0%, transparent 50%)';
    }
  }, [aiState]);

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center cursor-pointer"
      style={{
        perspective: 1000,
        transformStyle: 'preserve-3d'
      }}
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      animate={controls}
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [backgroundEffect, backgroundEffect],
        }}
        transition={{
          duration: aiState === 'emergency' ? 0.5 : 3,
          repeat: Infinity
        }}
      />

      {/* Particle layer - ambient floating particles */}
      <AmbientParticles aiState={aiState} />

      {/* Main face container with 3D transforms */}
      <motion.div
        className="relative"
        style={{
          transformStyle: 'preserve-3d',
          ...parallaxStyle
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition}
      >
        {/* Orb (multi-layer pseudo-3D orb) */}
        <div style={{ transform: 'translateZ(30px)' }}>
          <Orb />
        </div>

        {/* Eyes overlay - positioned above orb center */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'translateZ(50px)'
        }}>
          <Eyes />
        </div>

        {/* Mouth overlay - positioned below eyes */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'translateZ(40px)'
        }}>
          <Mouth />
        </div>
      </motion.div>

      {/* State indicator badge */}
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full backdrop-blur-md border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        style={{
          backgroundColor: 'rgba(10, 15, 26, 0.8)',
          borderColor: aiState === 'emergency' ? 'rgba(255, 59, 92, 0.4)' :
                       aiState === 'warning' ? 'rgba(255, 149, 0, 0.4)' :
                       'rgba(0, 212, 255, 0.3)'
        }}
      >
        <span
          className="text-sm capitalize font-medium"
          style={{
            color: aiState === 'emergency' ? '#ff3b5c' :
                   aiState === 'warning' ? '#ff9500' :
                   aiState === 'offline' ? '#6b8fa3' :
                   '#e0f7ff'
          }}
        >
          {aiState}
        </span>
      </motion.div>

      {/* Emotion indicator (subtle) */}
      {emotion !== 'neutral' && (
        <motion.div
          className="absolute top-4 right-4 px-2 py-1 rounded-full text-xs"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.7, scale: 1 }}
          style={{
            backgroundColor: 'rgba(10, 15, 26, 0.6)',
            color: '#6b8fa3'
          }}
        >
          {emotion}
        </motion.div>
      )}
    </motion.div>
  );
};

// Ambient floating particles
const AmbientParticles = ({ aiState }) => {
  const particles = useMemo(() => {
    const count = aiState === 'sleep' || aiState === 'offline' ? 4 :
                  aiState === 'thinking' ? 16 : 8;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: 2 + Math.random() * 3,
      duration: 8 + Math.random() * 6,
      delay: i * 0.5,
      startX: (Math.random() - 0.5) * 300,
      startY: (Math.random() - 0.5) * 300,
      driftX: (Math.random() - 0.5) * 100,
      driftY: (Math.random() - 0.5) * 100
    }));
  }, [aiState]);

  const particleColor = useMemo(() => {
    const colors = {
      idle: '#00d4ff',
      listening: '#00ffcc',
      thinking: '#a855f7',
      speaking: '#00ffcc',
      sleep: '#334155',
      warning: '#ff9500',
      emergency: '#ff3b5c',
      offline: '#6b8fa3'
    };
    return colors[aiState] || colors.idle;
  }, [aiState]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: particleColor,
            left: '50%',
            top: '50%',
            opacity: 0,
            boxShadow: `0 0 ${p.size * 2}px ${particleColor}`
          }}
          animate={{
            opacity: [0, 0.6, 0.6, 0],
            x: [p.startX, p.startX + p.driftX],
            y: [p.startY, p.startY + p.driftY],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export default Face;