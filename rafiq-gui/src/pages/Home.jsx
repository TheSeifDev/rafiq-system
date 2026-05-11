import React, { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAIStore } from '../store/aiStore';
import sseService from '../services/sse';
import RAFIQInterface from '../components/interface/RAFIQInterface';
import EmergencyOverlay from '../components/alerts/EmergencyOverlay';
import SplashScreen from '../components/ui/SplashScreen';

const Home = () => {
  const {
    setAIState,
    setEmotion,
    setEmergency,
    setConnectionStatus,
    handleAIStateEvent,
    handleSpeakingEvent,
    aiState,
    emergency,
    clearEmergency
  } = useAIStore();

  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize SSE connection and handle events
  useEffect(() => {
    // AI state event handler
    const unsubscribeAIState = sseService.on('ai_state', (data) => {
      handleAIStateEvent(data);
    });

    // Speaking event handler
    const unsubscribeSpeaking = sseService.on('speaking', (data) => {
      handleSpeakingEvent(data);
    });

    // Emotion event handler
    const unsubscribeEmotion = sseService.on('emotion', (data) => {
      if (data.emotion) {
        setEmotion(data.emotion);
      }
    });

    // Emergency event handler
    const unsubscribeEmergency = sseService.on('emergency', (data) => {
      setEmergency(data);
    });

    // Connection status handler
    const unsubscribeConnection = sseService.on('connection', (data) => {
      setConnectionStatus(data.status);
    });

    // Offline event handler
    const unsubscribeOffline = sseService.on('offline', () => {
      setAIState('offline');
      setConnectionStatus('disconnected');
    });

    // Connect to SSE
    sseService.connect();

    return () => {
      unsubscribeAIState();
      unsubscribeSpeaking();
      unsubscribeEmotion();
      unsubscribeEmergency();
      unsubscribeConnection();
      unsubscribeOffline();
      sseService.disconnect();
    };
  }, [
    setAIState,
    setEmotion,
    setEmergency,
    setConnectionStatus,
    handleAIStateEvent,
    handleSpeakingEvent
  ]);

  // Handle splash screen completion
  const handleSplashComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Handle emergency dismiss
  const handleDismissEmergency = useCallback(() => {
    clearEmergency();
  }, [clearEmergency]);

  return (
    <div className="relative w-full h-full bg-rafiq-bg overflow-hidden">
      {/* Splash Screen */}
      <AnimatePresence>
        {isLoading && (
          <SplashScreen onComplete={handleSplashComplete} />
        )}
      </AnimatePresence>

      {/* Main Interface */}
      {!isLoading && (
        <RAFIQInterface />
      )}

      {/* Emergency Overlay */}
      <EmergencyOverlay onDismiss={handleDismissEmergency} />
    </div>
  );
};

export default Home;