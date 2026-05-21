'use client';

interface MetricBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'default' | 'red' | 'blue' | 'green' | 'amber';
}

const VARIANT_CFG = {
  default: 'border-white/[0.08] text-white/60',
  red:     'border-[#FF3B3B]/30 text-[#FF3B3B]/90',
  blue:    'border-[#1E3A8A]/40 text-blue-400/90',
  green:   'border-emerald-400/25 text-emerald-400/90',
  amber:   'border-amber-400/25 text-amber-400/90',
};

export default function MetricBadge({
  label,
  value,
  unit,
  variant = 'default',
}: MetricBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border bg-white/[0.02] px-3 py-1.5 ${VARIANT_CFG[variant]}`}
    >
      <span className="text-[9px] uppercase tracking-[0.14em] text-white/25 font-mono">
        {label}
      </span>
      <span className="font-mono text-[13px] font-bold leading-none">
        {value}
      </span>
      {unit && (
        <span className="text-[9px] text-white/25 font-mono">{unit}</span>
      )}
    </div>
  );
}
