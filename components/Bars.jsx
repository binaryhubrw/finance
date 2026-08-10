import { money } from '@/lib/format';

/**
 * Bars are divs. Widths are a share of the largest value in the set, so the
 * comparison is honest even though there is no axis.
 */
export default function Bars({ rows, emptyMessage = 'Nothing to show yet.' }) {
  const max = Math.max(1, ...rows.flatMap((row) => row.values.map((v) => Math.abs(v.value))));

  if (!rows.length) {
    return <p className="py-6 text-[13px] text-ink-soft">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-rule">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 py-2.5">
          <div className="label truncate pt-1" title={row.label}>
            {row.label}
          </div>
          <div className="space-y-1.5">
            {row.values.map((value) => (
              <div key={value.name} className="flex items-center gap-2">
                <div className="h-2.5 min-w-0 flex-1 bg-sunk">
                  <div
                    className={value.tone === 'in' ? 'h-full bg-credit' : 'h-full bg-debit'}
                    style={{ width: `${Math.max(Math.abs(value.value) / max, 0) * 100}%` }}
                    role="presentation"
                  />
                </div>
                <span
                  className={`num w-[92px] shrink-0 text-[12px] ${
                    value.tone === 'in' ? 'text-credit' : 'text-debit'
                  }`}
                >
                  {money(value.value)}
                </span>
              </div>
            ))}
            {row.caption ? <p className="text-[12px] text-ink-soft">{row.caption}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
