import Transaction from '@/models/Transaction';
import Category from '@/models/Category';
import ClosedPeriod from '@/models/ClosedPeriod';
import { handler, ok, badRequest } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { writeAudit, snapshotOf } from '@/lib/audit';
import { readSpreadsheet } from '@/lib/xlsx';
import { saveUpload } from '@/lib/uploads';
import { reviewImport } from '@/lib/import';
import { notify, entryRecorded } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Bulk entry from a spreadsheet. Every row lands as pending, exactly as if it
 * had been typed into the dialog one at a time, and a sheet with any bad row is
 * refused whole — a half-imported cashbook is worse than none.
 */
export const POST = handler(async (request) => {
  const actor = await requireRole('accountant', 'admin');

  let form;
  try {
    form = await request.formData();
  } catch {
    throw badRequest('Attach the spreadsheet as a file upload.');
  }

  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw badRequest('Choose a .xlsx or .csv file to import.');
  }
  if (file.size > MAX_BYTES) {
    throw badRequest('That file is larger than 2MB. Split it into smaller batches.');
  }

  const dryRun = String(form.get('dryRun') ?? 'true') === 'true';

  // One supporting document and one note can cover the whole batch — a bank
  // statement behind a month of entries, say. Each row keeps its own note too;
  // the shared one is appended rather than replacing it.
  const sharedNote = String(form.get('note') ?? '').trim().slice(0, 300);
  const supporting = form.get('supporting');
  const hasSupporting =
    supporting && typeof supporting.arrayBuffer === 'function' && supporting.size > 0;

  // Written only when the import is actually committed. Saving it on every
  // preview would leave an orphan on disk each time someone looks.
  const attachment = hasSupporting && !dryRun ? await saveUpload(supporting) : null;
  const buffer = Buffer.from(await file.arrayBuffer());

  let grid;
  try {
    grid = readSpreadsheet(buffer, file.name ?? '');
  } catch (err) {
    throw badRequest(err.message);
  }

  const [categories, closedPeriods] = await Promise.all([
    Category.find({}).select('name kind active').lean(),
    ClosedPeriod.find({}).select('year month').lean(),
  ]);

  const closedMonths = new Set(closedPeriods.map((period) => `${period.year}-${period.month}`));
  const review = reviewImport({ grid, categories, closedMonths });

  if (review.error) throw badRequest(review.error);

  const problems = review.rows.filter((row) => !row.ok);
  const summary = {
    filename: file.name ?? 'spreadsheet',
    supporting: hasSupporting ? { originalName: supporting.name, size: supporting.size } : null,
    sharedNote,
    total: review.rows.length,
    ready: review.rows.length - problems.length,
    problems: problems.length,
    rows: review.rows.map(({ line, ok: rowOk, problems: rowProblems, preview }) => ({
      line,
      ok: rowOk,
      problems: rowProblems,
      preview,
    })),
  };

  if (dryRun) return ok({ ...summary, imported: 0, dryRun: true });

  if (problems.length) {
    throw badRequest(
      `${problems.length} of ${review.rows.length} rows still have a problem, so nothing was imported. Fix them in the sheet and upload it again.`,
    );
  }

  const created = await Transaction.insertMany(
    review.rows.map((row) => ({
      ...row.entry,
      note: [row.entry.note, sharedNote].filter(Boolean).join(' — ').slice(0, 500),
      attachment: attachment ?? row.entry.attachment ?? null,
      status: 'pending',
      recordedBy: actor.id,
    })),
  );

  for (const entry of created) {
    await writeAudit({
      entity: 'transaction',
      entityId: entry._id,
      action: 'create',
      actor,
      summary: `Recorded ${entry.type === 'in' ? 'money in' : 'money out'} of ${entry.amount.toLocaleString('en-US')} for “${entry.description}” — imported from ${summary.filename}`,
      snapshot: snapshotOf(entry),
    });
  }

  notify(async () => {
    await entryRecorded({
      entry: created[0],
      category: categories.find((c) => String(c._id) === String(created[0].category)),
      recordedBy: actor,
      count: created.length,
    });
  });

  return ok({ ...summary, imported: created.length, dryRun: false }, 201);
});
