import Transaction from '@/models/Transaction';
import { handler, ok, badRequest, forbidden, notFound, conflict, readBody } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { assertPeriodOpen } from '@/lib/period';
import { writeAudit, snapshotOf, plain } from '@/lib/audit';
import { notify, entryReviewed } from '@/lib/email';
import User from '@/models/User';
import Category from '@/models/Category';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler(async (request, { params }) => {
  const actor = await requireRole('auditor', 'admin');
  const { id } = await params;
  const { reviewNote } = await readBody(request);

  if (!reviewNote || !String(reviewNote).trim()) {
    throw badRequest('Say why you are rejecting this entry.', {
      reviewNote: 'The accountant needs to know what to correct.',
    });
  }

  const entry = await Transaction.findById(id);
  if (!entry) throw notFound('That entry no longer exists.');
  if (entry.status === 'void') throw conflict('This entry was voided, so it cannot be rejected.');
  if (entry.status === 'rejected') throw conflict('This entry was already rejected.');

  const selfApprovalAllowed = process.env.ALLOW_SELF_APPROVAL === 'true';
  if (String(entry.recordedBy) === actor.id && !selfApprovalAllowed) {
    throw forbidden('You recorded this entry, so someone else has to review it.');
  }

  await assertPeriodOpen(entry.date);

  const from = entry.status;
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
    summary: `Rejected “${entry.description}”: ${entry.reviewNote}`,
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
