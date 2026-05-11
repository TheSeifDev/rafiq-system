import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

const EmergencyOverlay = ({ onDismiss }) => {
  const { emergency, emergencyLevel, clearEmergency } = useAIStore();

  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    } else {
      clearEmergency();
    }
  }, [onDismiss, clearEmergency]);

  const levelConfig = {
    low: {
      color: '#ff9500',
      bgColor: 'rgba(255, 149, 0, 0.15)',
      borderColor: 'rgba(255, 149, 0, 0.5)',
      pulseSpeed: 2
    },
    medium: {
      color: '#ff6b35',
      bgColor: 'rgba(255, 107, 53, 0.2)',
      borderColor: 'rgba(255, 107, 53, 0.6)',
      pulseSpeed: 1.5
    },
    high: {
      color: '#ff3b5c',
      bgColor: 'rgba(255, 59, 92, 0.25)',
      borderColor: 'rgba(255, 59, 92, 0.8)',
      pulseSpeed: 0.8
    }
  };

  const config = levelConfig[emergencyLevel] || levelConfig.low;

  return (
    <AnimatePresence>
      {emergency && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleDismiss}
        >
          {/* Pulsing background */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: config.bgColor }}
            animate={{
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: config.pulseSpeed,
              repeat: Infinity
            }}
          />

          {/* Border pulse */}
          <motion.div
            className="absolute inset-4 rounded-3xl border-4 pointer-events-none"
            style={{
              borderColor: config.borderColor,
              boxShadow: `inset 0 0 60px ${config.color}40, 0 0 60px ${config.color}30`
            }}
            animate={{
              boxShadow: [
                `inset 0 0 60px ${config.color}40, 0 0 60px ${config.color}30`,
                `inset 0 0 100px ${config.color}60, 0 0 100px ${config.color}50`,
                `inset 0 0 60px ${config.color}40, 0 0 60px ${config.color}30`
              ]
            }}
            transition={{
              duration: config.pulseSpeed,
              repeat: Infinity
            }}
          />

          {/* Alert icon */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-6 p-8"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {/* Warning icon */}
            <motion.div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${config.color}40, transparent)`,
                boxShadow: `0 0 40px ${config.color}60`
              }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: config.pulseSpeed / 2,
                repeat: Infinity
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke={config.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </motion.div>

            {/* Alert text */}
            <motion.div className="text-center">
              <h2
                className="text-3xl font-bold mb-3"
                style={{ color: config.color }}
              >
                ALERT
              </h2>
              <p className="text-2xl text-rafiq-text max-w-md">
                {emergency}
              </p>
            </motion.div>

            {/* Tap to dismiss */}
            <p className="text-rafiq-text-dim text-lg mt-4">
              Tap anywhere to dismiss
            </p>

            {/* Pulsing rings */}
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border-2"
                style={{ borderColor: config.color }}
                initial={{ width: 96, height: 96 }}
                animate={{
                  width: 96 + i * 50,
                  height: 96 + i * 50,
                  opacity: [0.5 - i * 0.15, 0]
                }}
                transition={{
                  duration: config.pulseSpeed,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmergencyOverlay;