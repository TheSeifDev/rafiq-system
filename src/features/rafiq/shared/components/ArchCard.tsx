'use client';

import { motion } from 'framer-motion';
import StatusPulse from './StatusPulse';
import type { SystemStatus } from '../types';

interface ArchCardMetric {
  label: string;
  value: string;
}

interface ArchCardProps {
  icon?: React.ReactNode;
  title: string;
  sublabel?: string;
  description?: string;
  status?: SystemStatus;
  metrics?: ArchCardMetric[];
  tags?: string[];
  accent?: 'red' | 'blue' | 'emerald' | 'amber';
  delay?: number;
  className?: string;
  onClick?: () => void;
}

const ACCENT = {
  red: {
    border:  'group-hover:border-[#FF3B3B]/25',
    shadow:  'group-hover:shadow-[0_0_35px_rgba(255,59,59,0.06)]',
    iconBg:  'bg-[#FF3B3B]/10 group-hover:bg-[#FF3B3B]/15',
    bar:     'bg-[#FF3B3B]/50',
    tagText: 'text-[#FF3B3B]/60',
  },
  blue: {
    border:  'group-hover:border-[#1E3A8A]/35',
    shadow:  'group-hover:shadow-[0_0_35px_rgba(30,58,138,0.08)]',
    iconBg:  'bg-[#1E3A8A]/15 group-hover:bg-[#1E3A8A]/22',
    bar:     'bg-[#1E3A8A]/60',
    tagText: 'text-blue-400/60',
  },
  emerald: {
    border:  'group-hover:border-emerald-500/20',
    shadow:  'group-hover:shadow-[0_0_35px_rgba(52,211,153,0.06)]',
    iconBg:  'bg-emerald-500/10 group-hover:bg-emerald-500/15',
    bar:     'bg-emerald-500/50',
    tagText: 'text-emerald-400/60',
  },
  amber: {
    border:  'group-hover:border-amber-400/20',
    shadow:  'group-hover:shadow-[0_0_35px_rgba(251,191,36,0.06)]',
    iconBg:  'bg-amber-400/10 group-hover:bg-amber-400/15',
    bar:     'bg-amber-400/50',
    tagText: 'text-amber-400/60',
  },
};

export default function ArchCard({
  icon,
  title,
  sublabel,
  description,
  status,
  metrics,
  tags,
  accent = 'red',
  delay = 0,
  className = '',
  onClick,
}: ArchCardProps) {
  const a = ACCENT[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.38, delay }}
      onClick={onClick}
      className={[
        'group relative overflow-hidden rounded-2xl border border-white/[0.07]',
        'bg-white/[0.02] p-5 transition-all duration-300',
        a.border, a.shadow,
        'hover:bg-white/[0.04]',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className={`shrink-0 rounded-xl p-2.5 transition-colors duration-300 ${a.iconBg}`}
            >
              {icon}
            </div>
          )}

          <div>
            <h3 className="text-[13px] font-bold leading-tight text-white">{title}</h3>
            {sublabel && (
              <p className="mt-0.5 font-mono text-[10px] text-white/30">{sublabel}</p>
            )}
          </div>
        </div>

        {status && <StatusPulse status={status} size="xs" />}
      </div>

      {description && (
        <p className="mt-3 text-[12px] leading-relaxed text-white/40">{description}</p>
      )}

      {metrics && metrics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.05] pt-4">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="font-mono text-[9px] uppercase tracking-wider text-white/22">
                {m.label}
              </div>
              <div className="font-mono text-[11px] text-white/55">{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`rounded border border-white/[0.07] bg-white/[0.02] px-2 py-0.5 font-mono text-[9px] ${a.tagText}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 h-[1.5px] w-0 ${a.bar} transition-all duration-500 group-hover:w-full`}
      />
    </motion.div>
  );
}
