'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

export default function CodeBlock({
  code,
  language = 'bash',
  title,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/[0.07] bg-black/60 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-white/10" />
            <div className="h-2 w-2 rounded-full bg-white/10" />
            <div className="h-2 w-2 rounded-full bg-white/10" />
          </div>
          {title && (
            <span className="font-mono text-[10px] text-white/30">{title}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/20">
            {language}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-white/25 transition-colors hover:text-white/60"
          >
            {copied ? (
              <Check size={10} className="text-emerald-400" />
            ) : (
              <Copy size={10} />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <pre className="overflow-x-auto p-4 text-[11px] font-mono leading-relaxed text-white/55">
        <code>{code}</code>
      </pre>
    </div>
  );
}
