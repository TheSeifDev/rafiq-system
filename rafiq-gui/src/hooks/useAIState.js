import { useAIStore } from '../store/aiStore';

export const useAIState = () => {
  const {
    aiState,
    subtitle,
    speakingText,
    connectionStatus,
    emergency,
    emergencyLevel,
    isConnected,
    lastTouch
  } = useAIStore();

  return {
    aiState,
    subtitle,
    speakingText,
    connectionStatus,
    emergency,
    emergencyLevel,
    isConnected,
    lastTouch,
    isIdle: aiState === 'idle',
    isListening: aiState === 'listening',
    isThinking: aiState === 'thinking',
    isSpeaking: aiState === 'speaking',
    isSleeping: aiState === 'sleep',
    isWarning: aiState === 'warning',
    isEmergency: aiState === 'emergency',
    isOffline: aiState === 'offline',
    hasEmergency: !!emergency
  };
};

export default useAIState;