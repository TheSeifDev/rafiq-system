import React from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

const AudioRings = () => {
  const { aiState } = useAIStore();

  if (aiState !== 'listening') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="absolute border-2 border-rafiq-glow/40 rounded-full"
          initial={{ width: 100, height: 100, opacity: 0.8 }}
          animate={{
            width: 100 + i * 60,
            height: 100 + i * 60,
            opacity: [0.6, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeOut"
          }}
        />
      ))}

      {/* Center pulse */}
      <motion.div
        className="absolute w-24 h-24 border-2 border-rafiq-accent rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.8, 0.4, 0.8]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

export default AudioRings;