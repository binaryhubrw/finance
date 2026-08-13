import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { reportSummary } from '@/lib/queries';
import { formatDate } from '@/lib/format';
import ReportView from '@/components/ReportView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const iso = (date) => date.toISOString().slice(0, 10);

export default async function ReportsPage({ searchParams }) {
  await requireUser();
  await db();

  const sp = (await searchParams) ?? {};
  const one = (value) => (Array.isArray(value) ? value[0] : (value ?? ''));

  const now = new Date();
  const range = {
    from: one(sp.from) || iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
    to: one(sp.to) || iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))),
  };

  const summary = await reportSummary(range);

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Reports</p>
        <h1 className="page-title mt-1">
          {formatDate(range.from)} to {formatDate(range.to)}
        </h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Approved entries only, so these totals reconcile with the ledger balance for the same
          range.
        </p>
      </header>

      <ReportView summary={summary} range={range} />
    </div>
  );
}
