import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import Transaction from '@/models/Transaction';
import { reportSummary } from '@/lib/queries';
import { isMonthClosed, monthLabel } from '@/lib/period';
import { formatDate, formatMonth, money } from '@/lib/format';
import Figure from '@/components/Figure';
import Money from '@/components/Money';
import Bars from '@/components/Bars';
import MonthPicker from '@/components/MonthPicker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function monthFromParam(value) {
  const now = new Date();
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '');
  if (!match) return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  return { year, month };
}

const iso = (date) => date.toISOString().slice(0, 10);

export default async function OverviewPage({ searchParams }) {
  await requireUser();
  await db();

  const params = await searchParams;
  const { year, month } = monthFromParam(params?.month);
  const key = `${year}-${String(month).padStart(2, '0')}`;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const barsStart = new Date(Date.UTC(year, month - 6, 1));

  const [summary, trend, biggest, closed] = await Promise.all([
    reportSummary({ from: iso(start), to: iso(end) }),
    reportSummary({ from: iso(barsStart), to: iso(end) }),
    Transaction.find({
      status: 'approved',
      type: 'out',
      date: { $gte: start, $lte: new Date(`${iso(end)}T23:59:59.999Z`) },
    })
      .sort({ amount: -1 })
      .limit(5)
      .populate('category', 'name')
      .lean(),
    isMonthClosed(year, month),
  ]);

  const byMonth = new Map(trend.byMonth.map((row) => [`${row.year}-${row.month}`, row]));
  const trendRows = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - i, 1));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const row = byMonth.get(`${y}-${m}`) ?? { moneyIn: 0, moneyOut: 0 };
    trendRows.push({
      label: `${formatMonth(y, m).slice(0, 3)} ${String(y).slice(2)}`,
      values: [
        { name: 'in', value: row.moneyIn, tone: 'in' },
        { name: 'out', value: row.moneyOut, tone: 'out' },
      ],
    });
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Overview</p>
          <h1 className="mt-1 text-[22px]">{monthLabel(year, month)}</h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            {closed
              ? 'This month is closed. Nothing dated inside it can change.'
              : 'Approved entries only. Pending entries are listed but do not count yet.'}
          </p>
        </div>
        <MonthPicker value={key} />
      </header>

      <section className="card grid grid-cols-2 divide-y divide-rule nav:grid-cols-4 nav:divide-y-0">
        <Figure label="Opening balance" value={summary.openingBalance} />
        <Figure label="Money in" value={summary.moneyIn} tone="in" />
        <Figure label="Money out" value={summary.moneyOut} tone="out" />
        <Figure
          label="Closing balance"
          value={summary.closingBalance}
          size="xl"
          note={`${summary.transactionCount} approved ${
            summary.transactionCount === 1 ? 'entry' : 'entries'
          }`}
        />
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 border-l-2 border-l-flag px-4 py-3">
        <div>
          <p className="label">Awaiting approval</p>
          <p className="mt-1 text-[13px] text-ink-soft">
            {summary.pending.count === 0
              ? 'Nothing waiting. The accountant is up to date.'
              : `${summary.pending.count} ${
                  summary.pending.count === 1 ? 'entry' : 'entries'
                } worth ${money(summary.pending.amount)} have not counted yet.`}
          </p>
        </div>
        {summary.pending.count > 0 ? (
          <Link href="/approvals" className="btn btn-sm">
            Go to approvals
          </Link>
        ) : null}
      </section>

      <div className="grid gap-6 nav:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="card px-4 py-4">
          <h2 className="text-[15px]">Six months in and out</h2>
          <p className="mt-1 text-[12px] text-ink-soft">Approved entries, month by month.</p>
          <div className="mt-3">
            <Bars rows={trendRows} emptyMessage="No approved entries in this period yet." />
          </div>
        </section>

        <section className="card px-4 py-4">
          <h2 className="text-[15px]">Largest expenses this month</h2>
          <p className="mt-1 text-[12px] text-ink-soft">Approved money out, largest first.</p>

          {biggest.length === 0 ? (
            <p className="py-6 text-[13px] text-ink-soft">
              No approved expenses in {monthLabel(year, month)} yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-rule">
              {biggest.map((entry) => (
                <li key={String(entry._id)} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px]">{entry.description}</p>
                    <p className="label label-quiet mt-0.5">
                      {entry.category?.name ?? 'No budget line'} · {formatDate(entry.date)}
                    </p>
                  </div>
                  <Money value={entry.amount} tone="out" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
