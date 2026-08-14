import Transaction from '@/models/Transaction';
import { handler, ok, forbidden, notFound, conflict } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { assertPeriodOpen } from '@/lib/period';
import { writeAudit, snapshotOf, plain } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler(async (request, { params }) => {
  const actor = await requireRole('auditor', 'admin');
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const entry = await Transaction.findById(id).populate('recordedBy', 'name');
  if (!entry) throw notFound('That entry no longer exists.');

  if (entry.status === 'approved') {
    throw conflict('This entry was already approved.');
  }
  if (entry.status === 'void') {
    throw conflict('This entry was voided, so it cannot be approved.');
  }

  const selfApprovalAllowed = process.env.ALLOW_SELF_APPROVAL === 'true';
  const recordedById = String(entry.recordedBy?._id ?? entry.recordedBy);
  if (recordedById === actor.id && !selfApprovalAllowed) {
    throw forbidden(
      'You recorded this entry, so someone else has to approve it. Ask another auditor to review it.',
    );
  }

  await assertPeriodOpen(entry.date);

  const from = entry.status;
  entry.status = 'approved';
  entry.reviewedBy = actor.id;
  entry.reviewedAt = new Date();
  const comment = String(body?.reviewNote ?? '').trim().slice(0, 500);
  if (comment) entry.reviewNote = comment;
  await entry.save();

  await writeAudit({
    entity: 'transaction',
    entityId: entry._id,
    action: 'approve',
    actor,
    summary: `Approved “${entry.description}” for ${entry.amount.toLocaleString('en-US')}${
      comment ? ` — ${comment}` : ''
    }`,
    changes: [{ field: 'status', from, to: 'approved' }],
    snapshot: snapshotOf(entry),
  });

  return ok({ transaction: plain(entry.toObject()) });
});
