import Category from '@/models/Category';
import Transaction from '@/models/Transaction';
import { handler, ok, badRequest, conflict, notFound, readBody } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { writeAudit, diff, summarise, snapshotOf, plain } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = handler(async (request, { params }) => {
  const actor = await requireRole('admin');
  const { id } = await params;
  const body = await readBody(request);

  const category = await Category.findById(id);
  if (!category) throw notFound('That budget line no longer exists.');

  const before = category.toObject();

  if (body.name !== undefined) {
    if (!String(body.name).trim()) {
      throw badRequest('The budget line needs a name.', { name: 'Enter a name.' });
    }
    category.name = String(body.name).trim();
  }
  if (body.monthlyBudget !== undefined) {
    category.monthlyBudget =
      body.monthlyBudget === '' || body.monthlyBudget === null
        ? null
        : Number(body.monthlyBudget);
  }
  if (body.active !== undefined) category.active = Boolean(body.active);

  await category.save();

  const changes = diff(before, category.toObject(), ['name', 'monthlyBudget', 'active']);
  if (changes.length) {
    await writeAudit({
      entity: 'category',
      entityId: category._id,
      action: 'update',
      actor,
      summary: summarise(changes, `Updated “${category.name}”:`),
      changes,
      snapshot: snapshotOf(category),
    });
  }

  return ok({ category: plain(category.toObject()) });
});

export const DELETE = handler(async (_request, { params }) => {
  const actor = await requireRole('admin');
  const { id } = await params;

  const category = await Category.findById(id);
  if (!category) throw notFound('That budget line no longer exists.');

  const used = await Transaction.countDocuments({ category: category._id });
  if (used > 0) {
    throw conflict(
      `${used} ${used === 1 ? 'entry uses' : 'entries use'} this budget line, so it cannot be removed. Deactivate it instead — it will stay on old entries but disappear from the list of choices.`,
    );
  }

  const snapshot = snapshotOf(category);
  await category.deleteOne();

  await writeAudit({
    entity: 'category',
    entityId: category._id,
    action: 'update',
    actor,
    summary: `Removed the unused budget line “${category.name}”`,
    snapshot,
  });

  return ok({ removed: true });
});
