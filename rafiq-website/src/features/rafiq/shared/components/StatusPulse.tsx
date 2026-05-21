'use client';

import { motion } from 'framer-motion';
import type { SystemStatus } from '../types';

interface StatusPulseProps {
  status?: SystemStatus;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
}

const STATUS_CFG: Record<SystemStatus, { dot: string; ring: string; text: string; defaultLabel: string }> = {
  online:  { dot: 'bg-emerald-400',   ring: 'bg-emerald-400/30',   text: 'text-emerald-400/80',   defaultLabel: 'Online'  },
  active:  { dot: 'bg-[#FF3B3B]',     ring: 'bg-[#FF3B3B]/30',     text: 'text-[#FF3B3B]/80',     defaultLabel: 'Active'  },
  warning: { dot: 'bg-amber-400',     ring: 'bg-amber-400/30',     text: 'text-amber-400/80',     defaultLabel: 'Warning' },
  syncing: { dot: 'bg-blue-400',      ring: 'bg-blue-400/30',      text: 'text-blue-400/80',      defaultLabel: 'Syncing' },
  offline: { dot: 'bg-white/25',      ring: 'bg-white/10',         text: 'text-white/30',         defaultLabel: 'Offline' },
  error:   { dot: 'bg-red-500',       ring: 'bg-red-500/30',       text: 'text-red-400/80',       defaultLabel: 'Error'   },
  idle:    { dot: 'bg-white/15',      ring: 'bg-white/8',          text: 'text-white/25',         defaultLabel: 'Idle'    },
};

const SIZE_CFG = {
  xs: { dot: 'w-1.5 h-1.5', ring: 'w-3 h-3',   text: 'text-[9px]'  },
  sm: { dot: 'w-2 h-2',     ring: 'w-4 h-4',   text: 'text-[10px]' },
  md: { dot: 'w-2.5 h-2.5', ring: 'w-5 h-5',   text: 'text-[11px]' },
};

export default function StatusPulse({
  status = 'online',
  size = 'sm',
  showLabel = false,
  label,
}: StatusPulseProps) {
  const cfg = STATUS_CFG[status];
  const sz  = SIZE_CFG[size];
  const shouldAnimate = status !== 'offline' && status !== 'idle';

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center justify-center">
        {shouldAnimate && (
          <motion.span
            className={`absolute rounded-full ${cfg.ring} ${sz.ring}`}
            animate={{ scale: [1, 1.9, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <span className={`relative z-10 rounded-full ${cfg.dot} ${sz.dot}`} />
      </div>

      {showLabel && (
        <span className={`font-mono ${sz.text} ${cfg.text}`}>
          {label ?? cfg.defaultLabel}
        </span>
      )}
    </div>
  );
}
