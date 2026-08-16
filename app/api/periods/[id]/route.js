import ClosedPeriod from '@/models/ClosedPeriod';
import { handler, ok, notFound } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { monthLabel } from '@/lib/period';
import { writeAudit, snapshotOf } from '@/lib/audit';
import { notify, periodChanged } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = handler(async (_request, { params }) => {
  const actor = await requireRole('admin');
  const { id } = await params;

  const period = await ClosedPeriod.findById(id);
  if (!period) throw notFound('That month is not closed.');

  const label = monthLabel(period.year, period.month);
  const snapshot = snapshotOf(period);
  await period.deleteOne();

  await writeAudit({
    entity: 'period',
    entityId: period._id,
    action: 'reopen',
    actor,
    summary: `Reopened ${label}`,
    snapshot,
  });

  notify(async () => {
    await periodChanged({ year: period.year, month: period.month, action: 'reopen', actor });
  });

  return ok({ reopened: true, label });
});
