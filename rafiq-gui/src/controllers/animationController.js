/**
 * Animation Controller - Centralized animation orchestration for RAFIQ
 * Manages state-to-animation mapping and performance optimizations
 */

// AI States
export const AI_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  SLEEP: 'sleep',
  WARNING: 'warning',
  EMERGENCY: 'emergency',
  OFFLINE: 'offline'
};

// Emotions
export const EMOTIONS = {
  NEUTRAL: 'neutral',
  HAPPY: 'happy',
  SAD: 'sad',
  EXCITED: 'excited',
  CALM: 'calm',
  WORRIED: 'worried',
  ALERT: 'alert',
  CURIOUS: 'curious'
};

// State colors mapping
export const STATE_COLORS = {
  [AI_STATES.IDLE]: { primary: '#00d4ff', secondary: '#0066cc', intensity: 0.6 },
  [AI_STATES.LISTENING]: { primary: '#00ffcc', secondary: '#00d4ff', intensity: 1.0 },
  [AI_STATES.THINKING]: { primary: '#a855f7', secondary: '#7c3aed', intensity: 0.8 },
  [AI_STATES.SPEAKING]: { primary: '#00ffcc', secondary: '#00ff88', intensity: 1.0 },
  [AI_STATES.SLEEP]: { primary: '#334155', secondary: '#1e293b', intensity: 0.3 },
  [AI_STATES.WARNING]: { primary: '#ff9500', secondary: '#ffcc00', intensity: 0.9 },
  [AI_STATES.EMERGENCY]: { primary: '#ff3b5c', secondary: '#ff0000', intensity: 1.0 },
  [AI_STATES.OFFLINE]: { primary: '#6b8fa3', secondary: '#334155', intensity: 0.4 }
};

// Emotion colors mapping
export const EMOTION_COLORS = {
  [EMOTIONS.NEUTRAL]: { primary: '#00d4ff', glow: 0.6 },
  [EMOTIONS.HAPPY]: { primary: '#00ffcc', glow: 1.0 },
  [EMOTIONS.SAD]: { primary: '#6b8fa3', glow: 0.4 },
  [EMOTIONS.EXCITED]: { primary: '#ffcc00', glow: 1.0 },
  [EMOTIONS.CALM]: { primary: '#00d4ff', glow: 0.7 },
  [EMOTIONS.WORRIED]: { primary: '#ff9500', glow: 0.8 },
  [EMOTIONS.ALERT]: { primary: '#ff3b5c', glow: 1.0 },
  [EMOTIONS.CURIOUS]: { primary: '#a855f7', glow: 0.8 }
};

// Animation durations (in seconds)
export const ANIMATION_DURATIONS = {
  IDLE_BREATH: 4,
  LISTEN_RINGS: 1.5,
  THINK_ORBIT: 8,
  SPEAK_WAVE: 0.4,
  STATE_TRANSITION: 0.3,
  EMOJI_PULSE: 0.5,
  WARNING_PULSE: 1,
  EMERGENCY_PULSE: 0.8
};

// State-to-animation mapping
export const STATE_ANIMATIONS = {
  [AI_STATES.IDLE]: {
    type: 'breathing',
    duration: ANIMATION_DURATIONS.IDLE_BREATH,
    scale: [1, 1.03, 1],
    opacity: [0.8, 1, 0.8]
  },
  [AI_STATES.LISTENING]: {
    type: 'pulse',
    duration: ANIMATION_DURATIONS.LISTEN_RINGS,
    scale: [1, 1.05, 1],
    rings: true,
    ringsCount: 5
  },
  [AI_STATES.THINKING]: {
    type: 'orbit',
    duration: ANIMATION_DURATIONS.THINK_ORBIT,
    particles: 12,
    orbitRadius: [80, 100, 80]
  },
  [AI_STATES.SPEAKING]: {
    type: 'wave',
    duration: ANIMATION_DURATIONS.SPEAK_WAVE,
    bars: 5,
    waveHeight: [8, 24, 12, 28, 8]
  },
  [AI_STATES.SLEEP]: {
    type: 'dim',
    duration: 3,
    opacity: 0.3,
    showZZZ: true
  },
  [AI_STATES.WARNING]: {
    type: 'pulse',
    duration: ANIMATION_DURATIONS.WARNING_PULSE,
    scale: [1, 1.08, 1],
    color: STATE_COLORS[AI_STATES.WARNING].primary
  },
  [AI_STATES.EMERGENCY]: {
    type: 'alert',
    duration: ANIMATION_DURATIONS.EMERGENCY_PULSE,
    scale: [1, 1.1, 1],
    overlay: true
  },
  [AI_STATES.OFFLINE]: {
    type: 'dim',
    duration: 2,
    opacity: 0.4
  }
};

// Emotion modifiers (applied on top of state animations)
export const EMOTION_MODIFIERS = {
  [EMOTIONS.HAPPY]: {
    eyeSquint: true,
    smile: true,
    colorBoost: 0.2
  },
  [EMOTIONS.SAD]: {
    eyeDown: true,
    mouthFrown: true,
    colorDesaturate: 0.3
  },
  [EMOTIONS.EXCITED]: {
    eyeWide: true,
    mouthOpen: true,
    animationSpeed: 1.3,
    scaleBoost: 1.1
  },
  [EMOTIONS.CALM]: {
    eyeSoft: true,
    animationSpeed: 0.8,
    scaleBoost: 0.95
  },
  [EMOTIONS.WORRIED]: {
    eyeWide: true,
    mouthSmall: true,
    browFurrow: true
  },
  [EMOTIONS.ALERT]: {
    eyeWide: true,
    animationSpeed: 1.2,
    glowBoost: 0.3
  },
  [EMOTIONS.CURIOUS]: {
    headTilt: true,
    eyeFocus: true
  }
};

/**
 * Get animation config for a state
 */
export function getStateAnimation(state) {
  return STATE_ANIMATIONS[state] || STATE_ANIMATIONS[AI_STATES.IDLE];
}

/**
 * Get color config for a state
 */
export function getStateColor(state) {
  return STATE_COLORS[state] || STATE_COLORS[AI_STATES.IDLE];
}

/**
 * Get emotion modifier
 */
export function getEmotionModifier(emotion) {
  return EMOTION_MODIFIERS[emotion] || {};
}

/**
 * Combined animation config
 */
export function getAnimationConfig(state, emotion) {
  const stateAnim = getStateAnimation(state);
  const emotionMod = getEmotionModifier(emotion);
  const color = getStateColor(state);

  return {
    ...stateAnim,
    color,
    emotionModifier: emotionMod,
    duration: emotionMod.animationSpeed
      ? stateAnim.duration / emotionMod.animationSpeed
      : stateAnim.duration,
    scale: emotionMod.scaleBoost
      ? (stateAnim.scale || [1]).map(s => s * emotionMod.scaleBoost)
      : stateAnim.scale
  };
}

/**
 * Check if particles should be shown
 */
export function shouldShowParticles(state) {
  return [AI_STATES.THINKING, AI_STATES.LISTENING, AI_STATES.SPEAKING, AI_STATES.WARNING].includes(state);
}

/**
 * Check if audio rings should be shown
 */
export function shouldShowAudioRings(state) {
  return state === AI_STATES.LISTENING;
}

/**
 * Check if overlay is needed
 */
export function shouldShowOverlay(state) {
  return state === AI_STATES.EMERGENCY || state === AI_STATES.WARNING;
}

/**
 * Performance hint for GPU optimization
 */
export function getPerformanceHints(state) {
  return {
    willChange: ['transform', 'opacity'],
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    // Use transform instead of left/top for positioning
    useTransform: true
  };
}

export default {
  AI_STATES,
  EMOTIONS,
  STATE_COLORS,
  EMOTION_COLORS,
  ANIMATION_DURATIONS,
  getStateAnimation,
  getStateColor,
  getEmotionModifier,
  getAnimationConfig,
  shouldShowParticles,
  shouldShowAudioRings,
  shouldShowOverlay,
  getPerformanceHints
};