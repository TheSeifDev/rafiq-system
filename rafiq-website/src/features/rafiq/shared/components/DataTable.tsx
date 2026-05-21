'use client';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  title,
  subtitle,
  compact = false,
  className = '',
}: DataTableProps<T>) {
  const cell = compact ? 'px-4 py-2' : 'px-5 py-3';
  const headerCell = compact ? 'px-4 py-2.5' : 'px-5 py-3.5';

  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right')  return 'text-right';
    return 'text-left';
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-white/[0.07] ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-white/[0.06] px-5 py-3.5">
          {title && <h3 className="text-[12px] font-bold text-white">{title}</h3>}
          {subtitle && (
            <p className="mt-0.5 font-mono text-[10px] text-white/30">{subtitle}</p>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`${headerCell} ${alignClass(col.align)} font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white/28 ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className={[
                  'border-b border-white/[0.04] transition-colors hover:bg-white/[0.025]',
                  i % 2 !== 0 ? 'bg-white/[0.01]' : '',
                ].join(' ')}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`${cell} ${alignClass(col.align)} font-mono text-[11px] text-white/55 ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row, i)
                      : String(row[col.key as string] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
