import { keyframes } from 'framer-motion';

export const breatheAnimation = {
  animate: {
    scale: [1, 1.03, 1],
    opacity: [0.8, 1, 0.8]
  },
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

export const pulseAnimation = {
  animate: {
    scale: [1, 1.1, 1],
    boxShadow: [
      '0 0 20px rgba(0, 212, 255, 0.3)',
      '0 0 40px rgba(0, 212, 255, 0.6)',
      '0 0 20px rgba(0, 212, 255, 0.3)'
    ]
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

export const spinAnimation = {
  animate: {
    rotate: 360
  },
  transition: {
    duration: 8,
    repeat: Infinity,
    ease: 'linear'
  }
};

export const waveAnimation = {
  animate: {
    scaleY: [1, 1.5, 1],
    opacity: [0.5, 1, 0.5]
  },
  transition: {
    duration: 0.4,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

export const fadeInAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export const slideUpAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export const scaleInAnimation = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { duration: 0.3 }
};

// Color configurations for different AI states
export const stateColors = {
  idle: { primary: '#00d4ff', secondary: '#0066cc', intensity: 0.6 },
  listening: { primary: '#00ffcc', secondary: '#00d4ff', intensity: 1.0 },
  thinking: { primary: '#a855f7', secondary: '#7c3aed', intensity: 0.8 },
  speaking: { primary: '#00ffcc', secondary: '#00ff88', intensity: 1.0 },
  sleep: { primary: '#334155', secondary: '#1e293b', intensity: 0.3 },
  warning: { primary: '#ff9500', secondary: '#ffcc00', intensity: 0.9 },
  emergency: { primary: '#ff3b5c', secondary: '#ff0000', intensity: 1.0 },
  offline: { primary: '#6b8fa3', secondary: '#334155', intensity: 0.4 }
};

export default {
  breatheAnimation,
  pulseAnimation,
  spinAnimation,
  waveAnimation,
  fadeInAnimation,
  slideUpAnimation,
  scaleInAnimation,
  stateColors
};