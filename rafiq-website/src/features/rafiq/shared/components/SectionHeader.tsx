'use client';

import { motion } from 'framer-motion';
import StatusPulse from './StatusPulse';
import MetricBadge from './MetricBadge';
import type { SystemStatus } from '../types';

interface SectionMetric {
  label: string;
  value: string;
  variant?: 'default' | 'red' | 'blue' | 'green' | 'amber';
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  status?: SystemStatus;
  statusLabel?: string;
  layer?: string;
  version?: string;
  metrics?: SectionMetric[];
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  status,
  statusLabel,
  layer,
  version,
  metrics,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`border-b border-white/[0.06] pb-8 ${className}`}>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {status && (
            <StatusPulse status={status} size="sm" showLabel label={statusLabel} />
          )}
          {layer && (
            <span className="rounded-md border border-[#1E3A8A]/35 bg-[#1E3A8A]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-blue-400/60">
              {layer}
            </span>
          )}
          {version && (
            <span className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] text-white/30">
              {version}
            </span>
          )}
        </div>

        {metrics && metrics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {metrics.map((m) => (
              <MetricBadge
                key={m.label}
                label={m.label}
                value={m.value}
                variant={m.variant}
              />
            ))}
          </div>
        )}
      </div>

      {eyebrow && (
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF3B3B]/80">
          {eyebrow}
        </p>
      )}

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="text-3xl font-black tracking-tight text-white sm:text-4xl"
      >
        {title}
      </motion.h1>

      {description && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
