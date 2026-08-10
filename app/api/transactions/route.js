import Transaction from '@/models/Transaction';
import { METHODS, TYPES } from '@/lib/enums';
import Category from '@/models/Category';
import { handler, ok, badRequest, searchParams, readBody } from '@/lib/http';
import { requireUser, requireRole } from '@/lib/session';
import { assertPeriodOpen } from '@/lib/period';
import { writeAudit, snapshotOf, plain } from '@/lib/audit';
import { listTransactions, readParams, startOfDay } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  await requireUser();
  const params = readParams(searchParams(request));
  const result = await listTransactions(params);
  return ok(result);
});

export const POST = handler(async (request) => {
  // Auditors are deliberately blocked here. Separation of duties is the point.
  const actor = await requireRole('accountant', 'admin');
  const body = await readBody(request);

  const details = {};
  const date = body.date ? startOfDay(body.date) : null;
  if (!date || Number.isNaN(date.getTime())) details.date = 'Pick the date the money moved.';
  else if (date.getTime() > Date.now()) details.date = 'The date cannot be in the future.';

  if (!body.description || !String(body.description).trim()) {
    details.description = 'Describe what this entry is for.';
  }
  if (!TYPES.includes(body.type)) details.type = 'Say whether money came in or went out.';

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0.01) {
    details.amount = 'Enter an amount greater than zero.';
  }
  if (body.method && !METHODS.includes(body.method)) {
    details.method = 'Choose one of the payment methods.';
  }
  if (!body.category) details.category = 'Choose a budget line.';

  if (Object.keys(details).length) {
    throw badRequest('Some fields need attention before this entry can be saved.', details);
  }

  const category = await Category.findById(body.category).lean();
  if (!category) {
    throw badRequest('That budget line no longer exists.', {
      category: 'Choose a budget line from the list.',
    });
  }
  const expectedKind = body.type === 'in' ? 'income' : 'expense';
  if (category.kind !== expectedKind) {
    throw badRequest(`“${category.name}” is an ${category.kind} line, so it cannot hold money ${body.type === 'in' ? 'coming in' : 'going out'}.`, {
      category: `Choose an ${expectedKind} line instead.`,
    });
  }

  await assertPeriodOpen(date);

  const entry = await Transaction.create({
    date,
    description: String(body.description).trim(),
    category: category._id,
    type: body.type,
    amount,
    method: body.method ?? 'cash',
    reference: String(body.reference ?? '').trim(),
    receiptUrl: String(body.receiptUrl ?? '').trim(),
    payee: String(body.payee ?? '').trim(),
    note: String(body.note ?? '').trim(),
    status: 'pending',
    recordedBy: actor.id,
  });

  await writeAudit({
    entity: 'transaction',
    entityId: entry._id,
    action: 'create',
    actor,
    summary: `Recorded ${body.type === 'in' ? 'money in' : 'money out'} of ${amount.toLocaleString('en-US')} for “${entry.description}”`,
    snapshot: snapshotOf(entry),
  });

  return ok({ transaction: plain(entry.toObject()) }, 201);
});
