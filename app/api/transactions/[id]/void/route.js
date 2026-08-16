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
  // Nothing is ever deleted. Voiding leaves the entry visible with its reason.
  const actor = await requireRole('auditor', 'admin', 'accountant');
  const { id } = await params;
  const { reviewNote } = await readBody(request);

  if (!reviewNote || !String(reviewNote).trim()) {
    throw badRequest('Say why this entry is being voided.', {
      reviewNote: 'The reason stays on the entry for the audit trail.',
    });
  }

  const entry = await Transaction.findById(id);
  if (!entry) throw notFound('That entry no longer exists.');
  if (entry.status === 'void') throw conflict('This entry is already void.');

  // An accountant may withdraw their own entry, but only while it is still pending.
  if (actor.role === 'accountant') {
    if (String(entry.recordedBy) !== actor.id) {
      throw forbidden('You can only void entries you recorded yourself.');
    }
    if (entry.status !== 'pending') {
      throw forbidden('This entry has already been reviewed. Ask an approver to void it.');
    }
  }

  await assertPeriodOpen(entry.date);

  const from = entry.status;
  entry.status = 'void';
  entry.reviewedBy = actor.id;
  entry.reviewedAt = new Date();
  entry.reviewNote = String(reviewNote).trim().slice(0, 500);
  await entry.save();

  await writeAudit({
    entity: 'transaction',
    entityId: entry._id,
    action: 'void',
    actor,
    summary: `Voided “${entry.description}”: ${entry.reviewNote}`,
    changes: [{ field: 'status', from, to: 'void' }],
    snapshot: snapshotOf(entry),
  });

  notify(async () => {
    const [recorder, category] = await Promise.all([
      User.findById(entry.recordedBy).select('name email').lean(),
      Category.findById(entry.category).select('name').lean(),
    ]);
    await entryReviewed({
      entry, category, recorder, reviewer: actor, decision: 'void', reason: entry.reviewNote,
    });
  });

  return ok({ transaction: plain(entry.toObject()) });
});
