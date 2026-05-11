import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-rafiq-bg"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute border border-rafiq-glow/10 rounded-full"
            initial={{ width: 100, height: 100, opacity: 0.3 }}
            animate={{
              width: 100 + i * 100,
              height: 100 + i * 100,
              opacity: [0.3, 0.1, 0.3]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <motion.div
        className="relative z-10 mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #00d4ff, #0066cc)',
            boxShadow: '0 0 60px rgba(0, 212, 255, 0.6), inset 0 0 30px rgba(0, 212, 255, 0.3)'
          }}
        >
          <motion.div
            className="text-5xl font-bold text-white"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            R
          </motion.div>
        </div>
      </motion.div>

      {/* Brand name */}
      <motion.h1
        className="text-4xl font-bold text-rafiq-glow mb-2 tracking-wider"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        RAFIQ
      </motion.h1>

      <motion.p
        className="text-rafiq-text-dim text-sm mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        AI Healthcare Assistant
      </motion.p>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-rafiq-bg/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #00d4ff, #00ffcc)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
          }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Loading text */}
      <motion.p
        className="mt-4 text-rafiq-text-dim text-xs"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {progress < 30 && 'Initializing AI...'}
        {progress >= 30 && progress < 60 && 'Loading components...'}
        {progress >= 60 && progress < 90 && 'Connecting to services...'}
        {progress >= 90 && progress < 100 && 'Almost ready...'}
        {progress >= 100 && 'Ready!'}
      </motion.p>
    </motion.div>
  );
};

export default LoadingScreen;