import Transaction from '@/models/Transaction';
import { METHODS, TYPES } from '@/lib/enums';
import Category from '@/models/Category';
import { handler, ok, badRequest, forbidden, notFound, conflict, readBody } from '@/lib/http';
import { requireUser, requireRole } from '@/lib/session';
import { assertPeriodOpen } from '@/lib/period';
import { verifyStored } from '@/lib/uploads';
import { baseOf, foldExtras } from '@/lib/extras';
import { writeAudit, diff, summarise, snapshotOf, plain } from '@/lib/audit';
import { transactionWithHistory, startOfDay } from '@/lib/queries';
import { notify, entryReturnedToPending } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EDITABLE = [
  'date',
  'description',
  'category',
  'type',
  'amount',
  'extras',
  'method',
  'reference',
  'receiptUrl',
  'attachment',
  'payee',
  'note',
];

export const GET = handler(async (_request, { params }) => {
  await requireUser();
  const { id } = await params;
  const result = await transactionWithHistory(id);
  if (!result) throw notFound('That entry no longer exists.');
  return ok(result);
});

export const PATCH = handler(async (request, { params }) => {
  const actor = await requireRole('initiator', 'admin');
  const { id } = await params;
  const body = await readBody(request);

  const entry = await Transaction.findById(id);
  if (!entry) throw notFound('That entry no longer exists.');

  if (entry.status === 'void') {
    throw conflict('This entry was voided, so it can no longer be edited. Record a new entry instead.');
  }
  if (actor.role === 'initiator') {
    if (String(entry.recordedBy) !== actor.id) {
      throw forbidden('You can only edit entries you recorded yourself.');
    }
    // Waiting on Approver 1, or returned to you. Once it is further along the
    // approvers are relying on what they saw, so it can no longer change.
    if (entry.status !== 'pending' && entry.status !== 'rejected') {
      throw forbidden(
        'This entry is already being processed, so only an administrator can change it.',
      );
    }
  }

  const before = entry.toObject();
  const details = {};

  if (body.date !== undefined) {
    const date = startOfDay(body.date);
    if (Number.isNaN(date.getTime())) details.date = 'Pick a valid date.';
    else if (date.getTime() > Date.now()) details.date = 'The date cannot be in the future.';
    else entry.date = date;
  }
  if (body.description !== undefined) {
    if (!String(body.description).trim()) details.description = 'Describe what this entry is for.';
    else entry.description = String(body.description).trim();
  }
  if (body.type !== undefined) {
    if (!TYPES.includes(body.type)) details.type = 'Say whether money came in or went out.';
    else entry.type = body.type;
  }
  // The amount and its extras move together — changing either re-totals both.
  if (body.amount !== undefined || body.extras !== undefined) {
    const base = body.amount !== undefined ? body.amount : baseOf(entry.toObject());
    const raw = body.extras !== undefined ? body.extras : entry.extras;
    const folded = foldExtras(base, raw);
    if (folded.error) details.amount = folded.error;
    else {
      entry.amount = folded.total;
      // Assigning undefined leaves the stored array untouched, so clearing the
      // charges has to be an explicit empty array.
      entry.set('extras', folded.extras ?? []);
    }
  }
  if (body.method !== undefined) {
    if (!METHODS.includes(body.method)) details.method = 'Choose one of the payment methods.';
    else entry.method = body.method;
  }
  if (body.reference !== undefined) entry.reference = String(body.reference).trim();
  if (body.receiptUrl !== undefined) entry.receiptUrl = String(body.receiptUrl).trim();
  if (body.attachment !== undefined) {
    // Replacing an attachment leaves the old file on disk. Nothing in this app
    // destroys evidence, and the audit trail records which file it was.
    entry.attachment = body.attachment ? await verifyStored(body.attachment) : null;
  }
  if (body.payee !== undefined) entry.payee = String(body.payee).trim();
  if (body.note !== undefined) entry.note = String(body.note).trim();

  if (body.category !== undefined) {
    const category = await Category.findById(body.category).lean();
    if (!category) details.category = 'Choose a budget line from the list.';
    else entry.category = category._id;
  }

  if (Object.keys(details).length) {
    throw badRequest('Some fields need attention before this entry can be saved.', details);
  }

  const category = await Category.findById(entry.category).lean();
  const expectedKind = entry.type === 'in' ? 'income' : 'expense';
  if (category && category.kind !== expectedKind) {
    throw badRequest(
      `“${category.name}” is an ${category.kind} line, so it cannot hold money ${entry.type === 'in' ? 'coming in' : 'going out'}.`,
      { category: `Choose an ${expectedKind} line instead.` },
    );
  }

  // Both the month it was in and the month it is moving to must be open.
  await assertPeriodOpen(before.date);
  await assertPeriodOpen(entry.date);

  const changes = diff(before, entry.toObject(), EDITABLE);
  if (!changes.length) {
    return ok({ transaction: plain(entry.toObject()), unchanged: true });
  }

  // Editing anything past Approver 1 (or returned) discards every earlier
  // decision: the whole flow runs again from the first approval.
  const wasReviewed = before.status !== 'pending';
  if (wasReviewed) {
    entry.status = 'pending';
    entry.reviewedBy = null;
    entry.reviewedAt = null;
    entry.rejectedStage = '';
    entry.approval1 = null;
    entry.settlement = null;
    entry.approval2 = null;
    entry.editedAfterReview = true;
    changes.push({ field: 'status', from: before.status, to: 'pending' });
  }

  await entry.save();

  await writeAudit({
    entity: 'transaction',
    entityId: entry._id,
    action: 'update',
    actor,
    summary: wasReviewed
      ? `${summarise(changes)} — back to pending after review`
      : summarise(changes),
    changes,
    snapshot: snapshotOf(entry),
  });

  if (wasReviewed) {
    notify(async () => {
      const category = await Category.findById(entry.category).select('name').lean();
      await entryReturnedToPending({
        entry, category, editedBy: actor, changes: summarise(changes),
      });
    });
  }

  return ok({ transaction: plain(entry.toObject()), returnedToPending: wasReviewed });
});
