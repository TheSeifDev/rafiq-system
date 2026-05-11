import { create } from 'zustand';

export const useAIStore = create((set, get) => ({
  // AI State
  aiState: 'idle', // idle, listening, thinking, speaking, sleep, warning, emergency, offline
  emotion: 'neutral', // neutral, happy, sad, excited, calm, worried, alert

  // Speaking
  subtitle: '',
  speakingText: '',

  // Connection
  connectionStatus: 'disconnected', // connected, disconnected, reconnecting
  isConnected: false,
  lastConnectedAt: null,

  // Emergency
  emergency: null,
  emergencyLevel: null, // low, medium, high
  emergencyId: null,

  // Touch
  lastTouch: null,

  // Backend health
  backendHealthy: false,
  lastHealthCheck: null,

  // Actions - AI State
  setAIState: (state) => set({ aiState: state }),

  setEmotion: (emotion) => set({ emotion: emotion }),

  setSubtitle: (text) => set({ subtitle: text }),

  setSpeakingText: (text) => set({ speakingText: text, subtitle: text }),

  clearSpeakingText: () => set({ speakingText: '', subtitle: '' }),

  // Actions - Connection
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setConnected: (connected) => set((state) => ({
    isConnected: connected,
    connectionStatus: connected ? 'connected' : 'disconnected',
    lastConnectedAt: connected ? Date.now() : state.lastConnectedAt,
    aiState: connected && state.aiState === 'offline' ? 'idle' : state.aiState
  })),

  // Actions - Backend Health
  setBackendHealthy: (healthy) => set({
    backendHealthy: healthy,
    lastHealthCheck: Date.now()
  }),

  // Actions - Emergency
  setEmergency: (data) => set((state) => ({
    emergency: data?.message || null,
    emergencyLevel: data?.level || null,
    emergencyId: data?.alert_id || null,
    aiState: data ? 'emergency' : (state.aiState === 'emergency' ? 'idle' : state.aiState)
  })),

  clearEmergency: () => set({
    emergency: null,
    emergencyLevel: null,
    emergencyId: null
  }),

  // Actions - Touch
  handleTouch: (x, y) => set({ lastTouch: { x, y, time: Date.now() } }),

  // Actions - Reset
  reset: () => set({
    aiState: 'idle',
    emotion: 'neutral',
    subtitle: '',
    speakingText: '',
    emergency: null,
    emergencyLevel: null,
    emergencyId: null
  }),

  // Handle SSE AI state event
  handleAIStateEvent: (data) => {
    const { state, emotion } = data;
    const updates = {};

    if (state) {
      updates.aiState = state;
      // Clear speaking text when leaving speaking state
      if (state !== 'speaking') {
        updates.speakingText = '';
        updates.subtitle = '';
      }
    }

    if (emotion) {
      updates.emotion = emotion;
    }

    set(updates);
  },

  // Handle SSE speaking event
  handleSpeakingEvent: (data) => {
    if (data.text) {
      set({
        speakingText: data.text,
        subtitle: data.text,
        aiState: 'speaking'
      });
    }
  }
}));

export default useAIStore;