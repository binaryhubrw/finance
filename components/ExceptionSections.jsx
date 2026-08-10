import Link from 'next/link';
import { formatDate, toInputDate } from '@/lib/format';
import { STATUS_LABELS } from '@/lib/enums';
import Money from '@/components/Money';

const ledgerHref = (entry) => {
  const day = toInputDate(entry.date);
  const params = new URLSearchParams({ from: day, to: day, search: entry.description ?? '' });
  return `/ledger?${params.toString()}`;
};

function Row({ entry }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule py-2.5 last:border-b-0">
      <div className="min-w-0">
        <Link href={ledgerHref(entry)} className="text-[13px] underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
          {entry.description}
        </Link>
        <p className="label label-quiet mt-1">
          {formatDate(entry.date)} · {entry.category?.name ?? 'No budget line'} ·{' '}
          {entry.recordedBy?.name ?? 'unknown'} · {STATUS_LABELS[entry.status]}
        </p>
      </div>
      <Money value={entry.amount} tone={entry.type === 'in' ? 'in' : 'out'} />
    </li>
  );
}

export function Section({ title, why, count, children }) {
  const empty = count === 0;

  return (
    <details className="card px-4 py-3" open={!empty}>
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3">
        <span>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">{title}</span>
          <span className="label label-quiet ml-2">{empty ? 'Nothing flagged' : count}</span>
        </span>
        <span className="label label-quiet">
          <span className="when-closed">Show</span>
          <span className="when-open">Hide</span>
        </span>
      </summary>
      <p className="mt-1.5 text-[12px] text-ink-soft">{why}</p>
      <div className="mt-2">
        {empty ? <p className="py-2 text-[13px] text-ink-soft">Nothing flagged.</p> : children}
      </div>
    </details>
  );
}

export function EntryList({ entries }) {
  return (
    <ul>
      {entries.map((entry) => (
        <Row key={entry._id} entry={entry} />
      ))}
    </ul>
  );
}

export function DuplicateList({ groups }) {
  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <li key={group.key} className="border-l-2 border-l-rule-strong pl-3">
          <p className="label">{group.count} entries share a date, amount and budget line</p>
          <ul className="mt-1">
            {group.items.map((entry) => (
              <Row key={entry._id} entry={entry} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
