import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const SplashScreen = ({ onComplete, onError }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [phase, setPhase] = useState(0);

  const TIMEOUT = 20000; // 20 seconds max

  const updateProgress = useCallback((value, newStatus) => {
    setProgress(value);
    if (newStatus) setStatus(newStatus);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId;
    let phaseTimer;

    const checkBackend = async () => {
      updateProgress(15, 'Checking backend...');

      const healthy = await api.healthCheck();
      if (!mounted) return;

      if (healthy) {
        setBackendStatus('connected');
        updateProgress(50, 'Backend connected');

        // Check AI health
        const aiHealth = await api.getAIHealth();
        if (!mounted) return;

        if (aiHealth.success && aiHealth.configured) {
          updateProgress(80, 'AI engine ready');
        } else {
          updateProgress(80, 'AI not configured - offline mode');
        }

        // Initialize SSE
        updateProgress(90, 'Connecting to state bus...');
        await new Promise(resolve => setTimeout(resolve, 500));

        updateProgress(100, 'Ready');
        setTimeout(() => {
          if (mounted) onComplete(true);
        }, 800);
      } else {
        setBackendStatus('offline');
        updateProgress(60, 'Backend offline - continuing...');
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(100, 'Starting in offline mode');
        setTimeout(() => {
          if (mounted) onComplete(false);
        }, 600);
      }
    };

    const startSequence = () => {
      setPhase(1);
      updateProgress(0, 'Starting RAFIQ...');

      phaseTimer = setTimeout(() => {
        if (!mounted) return;
        setPhase(2);
        updateProgress(5, 'Loading system...');
      }, 300);

      setTimeout(() => {
        if (!mounted) return;
        setPhase(3);
        updateProgress(10, 'Initializing display...');
      }, 600);

      setTimeout(() => {
        if (!mounted) return;
        checkBackend();
      }, 1000);
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      if (mounted) {
        setError('Startup timeout - continuing anyway');
        if (onComplete) onComplete(false);
      }
    }, TIMEOUT);

    startSequence();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearTimeout(phaseTimer);
    };
  }, [onComplete, onError, updateProgress]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-rafiq-bg overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
          animate={{
            backgroundPosition: ['0 0', '50px 50px']
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Radial glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(0, 212, 255, 0.15) 0%, transparent 50%)'
        }}
        animate={{
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Logo container */}
      <motion.div
        className="relative z-10 mb-8"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Outer glow rings */}
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute border rounded-full"
            style={{
              borderColor: 'rgba(0, 212, 255, 0.15)',
              width: 120 + i * 40,
              height: 120 + i * 40,
              left: '50%',
              top: '50%',
              marginLeft: -(120 + i * 40) / 2,
              marginTop: -(120 + i * 40) / 2
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.15, 0.3, 0.15]
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3
            }}
          />
        ))}

        {/* Main orb */}
        <motion.div
          className="relative"
          animate={phase >= 2 ? {
            scale: [1, 1.03, 1],
            boxShadow: [
              '0 0 60px rgba(0, 212, 255, 0.6), inset 0 0 30px rgba(0, 212, 255, 0.3)',
              '0 0 80px rgba(0, 212, 255, 0.8), inset 0 0 40px rgba(0, 212, 255, 0.4)',
              '0 0 60px rgba(0, 212, 255, 0.6), inset 0 0 30px rgba(0, 212, 255, 0.3)'
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #00d4ff, #0066cc, #004488)',
              boxShadow: '0 0 60px rgba(0, 212, 255, 0.6), inset 0 0 30px rgba(0, 212, 255, 0.3)'
            }}
          >
            {/* Inner glow */}
            <div
              className="absolute inset-4 rounded-full opacity-50"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)',
                filter: 'blur(10px)'
              }}
            />

            {/* Logo letter */}
            <motion.div
              className="text-4xl font-bold text-white relative z-10"
              animate={phase >= 2 ? {
                opacity: [0.8, 1, 0.8]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              R
            </motion.div>
          </div>

          {/* Specular highlight */}
          <div
            className="absolute rounded-full"
            style={{
              width: '30%',
              height: '20%',
              top: '15%',
              left: '20%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.6), transparent)',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
            }}
          />
        </motion.div>

        {/* Breathing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: 'rgba(0, 212, 255, 0.4)' }}
          animate={phase >= 3 ? {
            scale: [1, 1.3, 1],
            opacity: [0.4, 0, 0.4]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Brand name */}
      <motion.h1
        className="text-3xl font-bold tracking-[0.3em] mb-1"
        style={{
          color: '#00d4ff',
          textShadow: '0 0 20px rgba(0, 212, 255, 0.5)'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        RAFIQ
      </motion.h1>

      <motion.p
        className="text-xs tracking-wider mb-8"
        style={{ color: '#6b8fa3' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        AI HEALTHCARE ASSISTANT
      </motion.p>

      {/* Status */}
      <motion.div
        className="text-sm mb-6 h-6"
        style={{ color: '#e0f7ff' }}
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {status}
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 h-1.5 rounded-full overflow-hidden backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #00d4ff, #00ffcc)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
          }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Status indicators */}
      <motion.div
        className="absolute bottom-10 flex items-center gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {/* Backend status */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: backendStatus === 'connected' ? '#00ffcc' :
                              backendStatus === 'offline' ? '#ff3b5c' : '#ff9500',
              boxShadow: `0 0 8px ${backendStatus === 'connected' ? '#00ffcc' :
                           backendStatus === 'offline' ? '#ff3b5c' : '#ff9500'}`
            }}
            animate={backendStatus === 'checking' ? {
              scale: [0.8, 1.2, 0.8],
              opacity: [0.4, 1, 0.4]
            } : {}}
            transition={{ duration: 1, repeat: backendStatus === 'checking' ? Infinity : 0 }}
          />
          <span className="text-xs" style={{ color: '#6b8fa3' }}>
            {backendStatus === 'connected' ? 'Connected' :
             backendStatus === 'offline' ? 'Offline' : 'Connecting...'}
          </span>
        </div>

        {/* Progress percentage */}
        <span className="text-xs opacity-50" style={{ color: '#6b8fa3' }}>
          {Math.round(progress)}%
        </span>
      </motion.div>

      {/* Error display */}
      {error && (
        <motion.div
          className="absolute bottom-24 px-4 py-2 rounded-lg backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: 'rgba(255, 59, 92, 0.2)',
            border: '1px solid rgba(255, 59, 92, 0.4)'
          }}
        >
          <span className="text-xs" style={{ color: '#ff3b5c' }}>{error}</span>
        </motion.div>
      )}

      {/* Version info */}
      <motion.div
        className="absolute bottom-2 text-xs opacity-30"
        style={{ color: '#6b8fa3' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
      >
        v1.0.0
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;