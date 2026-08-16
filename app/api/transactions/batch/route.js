import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import { TYPES, METHODS } from '@/lib/enums';
import { handler, ok, badRequest, readBody } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { assertPeriodOpen } from '@/lib/period';
import { verifyStored } from '@/lib/uploads';
import { foldExtras } from '@/lib/extras';
import { writeAudit, snapshotOf, plain } from '@/lib/audit';
import { startOfDay } from '@/lib/queries';
import { notify, entryRecorded } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ENTRIES = 50;

/**
 * Several entries from one sitting of the record dialog.
 *
 * Every row is checked before anything is written, and a single bad row stops
 * the lot — the same rule the spreadsheet import follows, and for the same
 * reason: half a batch in the book, with nothing to say which half, is worse
 * than a refusal. Errors come back indexed so the dialog can point at the row
 * that needs fixing.
 */
export const POST = handler(async (request) => {
  const actor = await requireRole('accountant', 'admin');
  const body = await readBody(request);
  const rows = Array.isArray(body.entries) ? body.entries : null;

  if (!rows?.length) throw badRequest('Add at least one entry before saving.');
  if (rows.length > MAX_ENTRIES) {
    throw badRequest(`Record at most ${MAX_ENTRIES} entries at a time.`);
  }

  const categories = new Map(
    (await Category.find({}).select('name kind active').lean()).map((c) => [String(c._id), c]),
  );

  const problems = {};
  const prepared = [];

  for (const [index, row] of rows.entries()) {
    const details = {};
    const date = startOfDay(row.date);

    if (!row.date || Number.isNaN(date.getTime())) details.date = 'Pick a valid date.';
    else if (date.getTime() > Date.now()) details.date = 'The date cannot be in the future.';

    if (!row.description || !String(row.description).trim()) {
      details.description = 'Describe what this entry is for.';
    }
    if (!TYPES.includes(row.type)) details.type = 'Say whether money came in or went out.';

    const folded = foldExtras(row.amount, row.extras);
    if (folded.error) details.amount = folded.error;
    const amount = folded.total;
    if (row.method && !METHODS.includes(row.method)) {
      details.method = 'Choose one of the payment methods.';
    }

    const category = row.category ? categories.get(String(row.category)) : null;
    if (!row.category) details.category = 'Choose a budget line.';
    else if (!category) details.category = 'Choose a budget line from the list.';
    else if (category.kind !== (row.type === 'in' ? 'income' : 'expense')) {
      details.category = `“${category.name}” is an ${category.kind} line. Choose another.`;
    }

    if (!details.date) {
      // Reported against the row rather than thrown, so one closed-month date
      // does not hide whatever else is wrong further down the list.
      try {
        await assertPeriodOpen(date);
      } catch (err) {
        details.date = err.message;
      }
    }

    if (Object.keys(details).length) {
      problems[index] = details;
      continue;
    }

    prepared.push({
      date,
      description: String(row.description).trim(),
      category: category._id,
      type: row.type,
      amount,
      extras: folded.extras,
      method: row.method ?? 'cash',
      reference: String(row.reference ?? '').trim(),
      receiptUrl: String(row.receiptUrl ?? '').trim(),
      attachment: row.attachment ? await verifyStored(row.attachment) : null,
      payee: String(row.payee ?? '').trim(),
      note: String(row.note ?? '').trim(),
      status: 'pending',
      recordedBy: actor.id,
    });
  }

  const failed = Object.keys(problems).length;
  if (failed) {
    throw badRequest(
      failed === rows.length
        ? 'None of these entries could be saved. Fix the problems and try again.'
        : `${failed} of ${rows.length} entries need attention, so none were saved.`,
      { rows: problems },
    );
  }

  const created = await Transaction.insertMany(prepared);

  for (const entry of created) {
    await writeAudit({
      entity: 'transaction',
      entityId: entry._id,
      action: 'create',
      actor,
      summary: `Recorded ${entry.type === 'in' ? 'money in' : 'money out'} of ${entry.amount.toLocaleString('en-US')} for “${entry.description}”${
        created.length > 1 ? ` — one of ${created.length} recorded together` : ''
      }`,
      snapshot: snapshotOf(entry),
    });
  }

  notify(async () => {
    await entryRecorded({
      entry: created[0],
      category: categories.get(String(created[0].category)),
      recordedBy: actor,
      count: created.length,
    });
  });

  return ok({ recorded: created.length, transactions: created.map((e) => plain(e.toObject())) }, 201);
});
