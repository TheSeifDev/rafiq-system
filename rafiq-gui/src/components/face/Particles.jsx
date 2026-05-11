import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

const Particles = () => {
  const { aiState } = useAIStore();

  const particles = useMemo(() => {
    const count = aiState === 'thinking' ? 12 :
                  aiState === 'speaking' ? 8 : 6;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i,
      size: 2 + Math.random() * 4,
      distance: 80 + Math.random() * 40
    }));
  }, [aiState]);

  if (aiState === 'idle' || aiState === 'sleep' || aiState === 'offline') {
    return null;
  }

  const config = {
    thinking: { speed: 8, color: '#a855f7', glow: '#7c3aed' },
    speaking: { speed: 6, color: '#00ffcc', glow: '#00d4ff' },
    listening: { speed: 10, color: '#00d4ff', glow: '#00ffcc' },
    warning: { speed: 5, color: '#ff9500', glow: '#ffcc00' },
    emergency: { speed: 3, color: '#ff3b5c', glow: '#ff0000' }
  };

  const currentConfig = config[aiState] || config.thinking;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: currentConfig.color,
            boxShadow: `0 0 10px ${currentConfig.glow}`
          }}
          animate={{
            rotate: [particle.angle, particle.angle + 360],
            x: [
              Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
              Math.cos(((particle.angle + 120) * Math.PI) / 180) * (particle.distance + 20),
              Math.cos(((particle.angle + 240) * Math.PI) / 180) * particle.distance,
              Math.cos(((particle.angle + 360) * Math.PI) / 180) * (particle.distance + 10)
            ],
            y: [
              Math.sin((particle.angle * Math.PI) / 180) * particle.distance,
              Math.sin(((particle.angle + 120) * Math.PI) / 180) * (particle.distance + 20),
              Math.sin(((particle.angle + 240) * Math.PI) / 180) * particle.distance,
              Math.sin(((particle.angle + 360) * Math.PI) / 180) * (particle.distance + 10)
            ],
            opacity: [0.4, 1, 0.6, 0.4]
          }}
          transition={{
            duration: currentConfig.speed,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

export default Particles;