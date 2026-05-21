'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  generateLogEntry,
  generateMQTTMessage,
  generateWearableReading,
  generateSyncEntry,
} from './generators';
import type { LogEntry, MQTTMessage, WearableReading, SyncQueueEntry } from '../shared/types';

export function useLogStream(intervalMs = 900, maxEntries = 80) {
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    Array.from({ length: 12 }, generateLogEntry)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setLogs(prev => {
        const next = [...prev, generateLogEntry()];
        return next.length > maxEntries ? next.slice(-maxEntries) : next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, maxEntries]);

  return logs;
}

export function useMQTTStream(intervalMs = 700, maxMessages = 50) {
  const [messages, setMessages] = useState<MQTTMessage[]>(() =>
    Array.from({ length: 8 }, generateMQTTMessage)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setMessages(prev => {
        const next = [...prev, generateMQTTMessage()];
        return next.length > maxMessages ? next.slice(-maxMessages) : next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, maxMessages]);

  return messages;
}

export function useWearableStream(intervalMs = 2000) {
  const [reading, setReading] = useState<WearableReading>(generateWearableReading);

  useEffect(() => {
    const timer = setInterval(() => {
      setReading(generateWearableReading());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return reading;
}

export function useSyncQueue(intervalMs = 1200) {
  const [queue, setQueue] = useState<SyncQueueEntry[]>(() =>
    Array.from({ length: 6 }, generateSyncEntry)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setQueue(prev => {
        const updated = prev.map(item => {
          if (item.status === 'pending' && Math.random() < 0.3) {
            return { ...item, status: 'syncing' as const };
          }
          if (item.status === 'syncing' && Math.random() < 0.5) {
            return { ...item, status: 'done' as const };
          }
          return item;
        });
        if (Math.random() < 0.4) {
          updated.push(generateSyncEntry());
        }
        return updated.slice(-20);
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return queue;
}

interface SystemMetrics {
  aiLatencyMs: number;
  mqttMsgPerMin: number;
  activeSensors: number;
  syncQueueDepth: number;
  localAIUptime: string;
  supabaseStatus: 'online' | 'offline' | 'degraded';
}

export function useSystemMetrics(intervalMs = 2500) {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    aiLatencyMs: 174,
    mqttMsgPerMin: 127,
    activeSensors: 7,
    syncQueueDepth: 3,
    localAIUptime: '99.7%',
    supabaseStatus: 'online',
  });

  const tickRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      tickRef.current++;
      const t = tickRef.current;
      setMetrics({
        aiLatencyMs: 140 + Math.floor(Math.sin(t * 0.3) * 40 + Math.random() * 20),
        mqttMsgPerMin: 110 + Math.floor(Math.sin(t * 0.2) * 30 + Math.random() * 10),
        activeSensors: 7,
        syncQueueDepth: Math.max(0, Math.floor(Math.sin(t * 0.5) * 4 + 3)),
        localAIUptime: '99.7%',
        supabaseStatus: t % 15 === 0 ? 'degraded' : 'online',
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return metrics;
}

export function usePaused() {
  const [paused, setPaused] = useState(false);
  const toggle = useCallback(() => setPaused(p => !p), []);
  return { paused, toggle };
}
