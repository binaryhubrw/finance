import ClosedPeriod from '@/models/ClosedPeriod';
import Transaction from '@/models/Transaction';
import { handler, ok, badRequest, conflict, readBody } from '@/lib/http';
import { requireUser, requireRole } from '@/lib/session';
import { monthStart, monthEnd, monthLabel } from '@/lib/period';
import { writeAudit, snapshotOf, plain } from '@/lib/audit';
import { balanceBefore } from '@/lib/queries';
import { notify, periodChanged } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireUser();
  const items = await ClosedPeriod.find({})
    .sort({ year: -1, month: -1 })
    .populate('closedBy', 'name')
    .lean();
  return ok({ items: plain(items) });
});

export const POST = handler(async (request) => {
  const actor = await requireRole('auditor', 'admin');
  const { year, month, countedCash, note } = await readBody(request);

  const y = Number(year);
  const m = Number(month);
  const details = {};
  if (!Number.isInteger(y) || y < 2000 || y > 2200) details.year = 'Pick a year.';
  if (!Number.isInteger(m) || m < 1 || m > 12) details.month = 'Pick a month.';
  if (Object.keys(details).length) {
    throw badRequest('Pick the month you want to close.', details);
  }

  const start = monthStart(y, m);
  const end = monthEnd(y, m);
  const label = monthLabel(y, m);

  if (start.getTime() > Date.now()) {
    throw badRequest(`${label} has not happened yet, so it cannot be closed.`);
  }

  const existing = await ClosedPeriod.findOne({ year: y, month: m }).lean();
  if (existing) throw conflict(`${label} is already closed.`);

  const pending = await Transaction.countDocuments({
    status: 'pending',
    date: { $gte: start, $lt: end },
  });
  if (pending > 0) {
    throw conflict(
      `${pending} ${pending === 1 ? 'entry is' : 'entries are'} still waiting for approval in ${label}. Clear the approval queue before closing the month.`,
    );
  }

  const closingBalance = await balanceBefore(end);
  const counted =
    countedCash === '' || countedCash === null || countedCash === undefined
      ? null
      : Number(countedCash);
  if (counted !== null && !Number.isFinite(counted)) {
    throw badRequest('The counted cash has to be a number.', {
      countedCash: 'Enter the amount you counted, or leave it empty.',
    });
  }

  const period = await ClosedPeriod.create({
    year: y,
    month: m,
    closingBalance,
    countedCash: counted,
    variance: counted === null ? null : Math.round((counted - closingBalance) * 100) / 100,
    note: String(note ?? '').trim(),
    closedBy: actor.id,
  });

  await writeAudit({
    entity: 'period',
    entityId: period._id,
    action: 'close',
    actor,
    summary: `Closed ${label} with a book balance of ${closingBalance.toLocaleString('en-US')}${
      counted === null ? '' : ` against ${counted.toLocaleString('en-US')} counted`
    }`,
    snapshot: snapshotOf(period),
  });

  notify(async () => {
    await periodChanged({
      year: period.year, month: period.month, action: 'close', actor,
      closingBalance: period.closingBalance, variance: period.variance,
    });
  });

  return ok({ period: plain(period.toObject()) }, 201);
});
