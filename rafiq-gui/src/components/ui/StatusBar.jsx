import React from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

const StatusBar = ({ isOfflineMode = false }) => {
  const { connectionStatus, aiState, emergency } = useAIStore();

  // Show "Offline mode" when in offline mode and not connected
  const effectiveStatus = isOfflineMode && connectionStatus !== 'connected' ? 'offline' : connectionStatus;

  const statusConfig = {
    connected: { color: '#00ffcc', icon: 'wifi', text: 'Online' },
    disconnected: { color: '#ff3b5c', icon: 'wifi-off', text: 'Offline' },
    reconnecting: { color: '#ff9500', icon: 'refresh', text: 'Reconnecting...' }
  };

  const config = statusConfig[effectiveStatus] || statusConfig.disconnected;

  const WifiIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );

  const WifiOffIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );

  const RefreshIcon = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </motion.div>
  );

  const StatusIcon = () => {
    switch (config.icon) {
      case 'wifi': return <WifiIcon />;
      case 'wifi-off': return <WifiOffIcon />;
      case 'refresh': return <RefreshIcon />;
      default: return <WifiOffIcon />;
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 z-20">
      {/* Left: Connection status */}
      <motion.div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          backgroundColor: 'rgba(10, 15, 26, 0.8)',
          borderColor: `${config.color}40`,
          borderWidth: 1
        }}
        animate={{ opacity: connectionStatus === 'reconnecting' ? [0.6, 1, 0.6] : 1 }}
        transition={{ duration: 1, repeat: connectionStatus === 'reconnecting' ? Infinity : 0 }}
      >
        <span style={{ color: config.color }}>
          <StatusIcon />
        </span>
        <span className="text-xs font-medium" style={{ color: config.color }}>
          {config.text}
        </span>
      </motion.div>

      {/* Center: Emergency indicator */}
      {emergency && (
        <motion.div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rafiq-danger/20 border border-rafiq-danger/50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-rafiq-danger"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <span className="text-xs font-semibold text-rafiq-danger">
            ALERT ACTIVE
          </span>
        </motion.div>
      )}

      {/* Right: AI state indicator */}
      <motion.div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          backgroundColor: 'rgba(10, 15, 26, 0.8)',
          borderColor: 'rgba(0, 212, 255, 0.3)',
          borderWidth: 1
        }}
      >
        <motion.div
          className="w-2 h-2 rounded-full bg-rafiq-glow"
          animate={{
            opacity: aiState === 'idle' ? [0.5, 1, 0.5] : 1,
            scale: aiState === 'speaking' ? [1, 1.3, 1] : 1
          }}
          transition={{ duration: aiState === 'speaking' ? 0.5 : 2, repeat: Infinity }}
        />
        <span className="text-xs font-medium text-rafiq-glow capitalize">
          RAFIQ {aiState}
        </span>
      </motion.div>
    </div>
  );
};

export default StatusBar;