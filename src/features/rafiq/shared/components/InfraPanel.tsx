'use client';

interface InfraPanelProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  glow?: 'red' | 'blue' | 'none';
  noPadding?: boolean;
}

export default function InfraPanel({
  title,
  subtitle,
  children,
  className = '',
  glow = 'none',
  noPadding = false,
}: InfraPanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] ${className}`}
    >
      {glow === 'red' && (
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#FF3B3B]/6 blur-[60px]" />
      )}
      {glow === 'blue' && (
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#1E3A8A]/8 blur-[60px]" />
      )}

      {(title || subtitle) && (
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF3B3B]" />
          {title && (
            <span className="text-[12px] font-bold text-white">{title}</span>
          )}
          {subtitle && (
            <span className="font-mono text-[10px] text-white/28">{subtitle}</span>
          )}
        </div>
      )}

      <div className={`relative z-10 ${noPadding ? '' : 'p-5'}`}>
        {children}
      </div>
    </div>
  );
}
