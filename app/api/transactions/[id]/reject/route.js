import Transaction from '@/models/Transaction';
import { handler, ok, badRequest, notFound } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { assertPeriodOpen } from '@/lib/period';
import { writeAudit, snapshotOf, plain } from '@/lib/audit';
import { assertCanAct } from '@/lib/flow';
import { readBody } from '@/lib/http';
import { notify, entryReviewed } from '@/lib/email';
import User from '@/models/User';
import Category from '@/models/Category';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns the entry to its initiator, whichever stage it is at. The initiator's
 * next edit sends it back to Approver 1, so a correction is always re-checked
 * from the start.
 */
export const POST = handler(async (request, { params }) => {
  const actor = await requireRole('approver1', 'accountant', 'approver2', 'admin');
  const { id } = await params;
  const { reviewNote } = await readBody(request);

  if (!reviewNote || !String(reviewNote).trim()) {
    throw badRequest('Say why you are sending this entry back.', {
      reviewNote: 'The initiator needs to know what to correct.',
    });
  }

  const entry = await Transaction.findById(id);
  if (!entry) throw notFound('That entry no longer exists.');

  assertCanAct(entry, actor);
  await assertPeriodOpen(entry.date);

  const from = entry.status;
  entry.rejectedStage = from;
  entry.status = 'rejected';
  entry.reviewedBy = actor.id;
  entry.reviewedAt = new Date();
  entry.reviewNote = String(reviewNote).trim().slice(0, 500);
  await entry.save();

  await writeAudit({
    entity: 'transaction',
    entityId: entry._id,
    action: 'reject',
    actor,
    summary: `Returned “${entry.description}” to the initiator: ${entry.reviewNote}`,
    changes: [{ field: 'status', from, to: 'rejected' }],
    snapshot: snapshotOf(entry),
  });

  notify(async () => {
    const [recorder, category] = await Promise.all([
      User.findById(entry.recordedBy).select('name email').lean(),
      Category.findById(entry.category).select('name').lean(),
    ]);
    await entryReviewed({
      entry, category, recorder, reviewer: actor, decision: 'rejected', reason: entry.reviewNote,
    });
  });

  return ok({ transaction: plain(entry.toObject()) });
});
