import { useEffect, useRef } from 'react';
import { useAIStore } from '../store/aiStore';

export const useSSE = (onMessage) => {
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    let eventSource;

    const connect = () => {
      eventSource = new EventSource('http://localhost:3001/events');

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0;
        useAIStore.getState().setConnectionStatus('connected');
      };

      eventSource.onerror = () => {
        useAIStore.getState().setConnectionStatus('disconnected');
        eventSource.close();

        // Reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        setTimeout(connect, delay);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        } catch (e) {
          console.error('Failed to parse SSE message:', e);
        }
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [onMessage]);
};

export default useSSE;