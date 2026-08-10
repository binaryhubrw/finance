import Category from '@/models/Category';
import { KINDS } from '@/lib/enums';
import { handler, ok, badRequest, conflict, readBody, searchParams } from '@/lib/http';
import { requireUser, requireRole } from '@/lib/session';
import { writeAudit, snapshotOf, plain } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  await requireUser();
  const all = searchParams(request).get('all') === 'true';
  const filter = all ? {} : { active: true };
  const items = await Category.find(filter).sort({ kind: 1, name: 1 }).lean();
  return ok({ items: plain(items) });
});

export const POST = handler(async (request) => {
  const actor = await requireRole('admin');
  const { name, kind, monthlyBudget } = await readBody(request);

  const details = {};
  if (!name) details.name = 'Give the budget line a name.';
  if (!KINDS.includes(kind)) details.kind = 'Say whether this line is income or expense.';
  if (Object.keys(details).length) {
    throw badRequest('Some fields need attention before this budget line can be added.', details);
  }

  const existing = await Category.findOne({
    name: new RegExp(`^${String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  }).lean();
  if (existing) {
    throw conflict('A budget line with that name already exists.', {
      name: 'Pick a different name.',
    });
  }

  const category = await Category.create({
    name: String(name).trim(),
    kind,
    monthlyBudget:
      monthlyBudget === '' || monthlyBudget === null || monthlyBudget === undefined
        ? null
        : Number(monthlyBudget),
  });

  await writeAudit({
    entity: 'category',
    entityId: category._id,
    action: 'create',
    actor,
    summary: `Added the ${kind} line “${category.name}”`,
    snapshot: snapshotOf(category),
  });

  return ok({ category: plain(category.toObject()) }, 201);
});
