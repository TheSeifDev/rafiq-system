'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LogEntry } from '../types';

const LEVEL_CFG: Record<LogEntry['level'], { label: string; color: string; bg: string }> = {
  info:    { label: 'INFO ', color: 'text-blue-400/80',    bg: 'text-blue-400/40'    },
  warn:    { label: 'WARN ', color: 'text-amber-400/80',   bg: 'text-amber-400/40'   },
  error:   { label: 'ERROR', color: 'text-[#FF3B3B]/90',   bg: 'text-[#FF3B3B]/40'   },
  debug:   { label: 'DEBUG', color: 'text-white/25',       bg: 'text-white/15'       },
  success: { label: ' OK  ', color: 'text-emerald-400/80', bg: 'text-emerald-400/40' },
};

interface EventLogProps {
  entries: LogEntry[];
  maxHeight?: string;
  autoScroll?: boolean;
  title?: string;
  showHeader?: boolean;
}

export default function EventLog({
  entries,
  maxHeight = '300px',
  autoScroll = true,
  title,
  showHeader = true,
}: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/50">
      {showHeader && (
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-white/10" />
              <div className="h-2 w-2 rounded-full bg-white/10" />
              <div className="h-2 w-2 rounded-full bg-white/10" />
            </div>
            <span className="font-mono text-[10px] text-white/28">
              {title ?? 'system.log'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-[#FF3B3B]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <span className="font-mono text-[9px] text-white/25">LIVE</span>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="overflow-y-auto p-4"
        style={{ maxHeight, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
      >
        <div className="space-y-[3px]">
          <AnimatePresence initial={false}>
            {entries.map((entry) => {
              const cfg = LEVEL_CFG[entry.level];
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex min-w-0 gap-2 font-mono text-[10px] leading-[1.6]"
                >
                  <span className="shrink-0 text-white/18">{entry.timestamp}</span>
                  <span className={`shrink-0 font-bold ${cfg.color}`}>
                    [{cfg.label}]
                  </span>
                  <span className="shrink-0 text-[#FF3B3B]/55">
                    {entry.service.padEnd(18)}
                  </span>
                  <span className="min-w-0 truncate text-white/50">{entry.message}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
