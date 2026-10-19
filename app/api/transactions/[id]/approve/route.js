import Transaction from '@/models/Transaction';
import { handler, ok, notFound, badRequest } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { assertPeriodOpen } from '@/lib/period';
import { writeAudit, snapshotOf, plain } from '@/lib/audit';
import { assertCanAct } from '@/lib/flow';
import { NEXT_STATUS, ROLE_LABELS, ROLE_OF_STAGE, STATUS_LABELS } from '@/lib/enums';
import { startOfDay } from '@/lib/queries';
import { notify, entryAdvanced } from '@/lib/email';
import User from '@/models/User';
import Category from '@/models/Category';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Clears whichever stage the entry is at and moves it to the next:
 * Approver 1 -> Accountant -> Approver 2 -> approved.
 * The accountant's step also records when the money actually moved.
 */
export const POST = handler(async (request, { params }) => {
  const actor = await requireRole('approver1', 'accountant', 'approver2', 'admin');
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const entry = await Transaction.findById(id);
  if (!entry) throw notFound('That entry no longer exists.');

  assertCanAct(entry, actor);
  await assertPeriodOpen(entry.date);

  const stage = entry.status;
  const next = NEXT_STATUS[stage];
  const note = String(body?.reviewNote ?? '').trim().slice(0, 500);
  const now = new Date();

  if (stage === 'pending') {
    entry.approval1 = { by: actor.id, at: now, note };
  } else if (stage === 'with_accountant') {
    const paidOn = body?.paidOn ? startOfDay(body.paidOn) : null;
    if (!paidOn || Number.isNaN(paidOn.getTime())) {
      throw badRequest('Say the date the money was paid or received.', {
        paidOn: 'Pick the date the money actually moved.',
      });
    }
    if (paidOn.getTime() > Date.now()) {
      throw badRequest('The date cannot be in the future.', { paidOn: 'Pick a date that has happened.' });
    }
    entry.settlement = {
      by: actor.id,
      at: now,
      note,
      paidOn,
      paymentRef: String(body?.paymentRef ?? '').trim().slice(0, 120),
    };
  } else {
    entry.approval2 = { by: actor.id, at: now, note };
    entry.reviewedBy = actor.id;
    entry.reviewedAt = now;
    if (note) entry.reviewNote = note;
  }
  entry.status = next;
  entry.rejectedStage = '';
  await entry.save();

  const role = ROLE_LABELS[ROLE_OF_STAGE[stage]];
  const label = stage === 'with_accountant'
    ? entry.type === 'in' ? 'Confirmed receipt of' : 'Confirmed payment of'
    : next === 'approved' ? 'Gave final approval to' : `${role} approved`;
  await writeAudit({
    entity: 'transaction',
    entityId: entry._id,
    action: 'approve',
    actor,
    summary: `${label} “${entry.description}” for ${entry.amount.toLocaleString('en-US')} — now ${STATUS_LABELS[next].toLowerCase()}${
      note ? ` — ${note}` : ''
    }`,
    changes: [{ field: 'status', from: stage, to: next }],
    snapshot: snapshotOf(entry),
  });

  notify(async () => {
    const [recorder, category] = await Promise.all([
      User.findById(entry.recordedBy).select('name email').lean(),
      Category.findById(entry.category).select('name').lean(),
    ]);
    await entryAdvanced({ entry, category, recorder, actor, stage, next, note });
  });

  return ok({ transaction: plain(entry.toObject()) });
});
