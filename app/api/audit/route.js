import { OVERSIGHT_ROLES } from '@/lib/enums';
import mongoose from 'mongoose';
import AuditLog from '@/models/AuditLog';
import { handler, ok, searchParams } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { plain } from '@/lib/audit';
import { startOfDay, endOfDay } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  // The trail is for the people who answer for the money.
  await requireRole(OVERSIGHT_ROLES);
  const q = searchParams(request);

  const filter = {};
  const entity = q.get('entity');
  const entityId = q.get('entityId');
  const actor = q.get('actor');
  const action = q.get('action');
  const from = q.get('from');
  const to = q.get('to');

  if (entity && entity !== 'all') filter.entity = entity;
  if (entityId && mongoose.Types.ObjectId.isValid(entityId)) {
    filter.entityId = new mongoose.Types.ObjectId(entityId);
  }
  if (actor && actor !== 'all' && mongoose.Types.ObjectId.isValid(actor)) {
    filter.actor = new mongoose.Types.ObjectId(actor);
  }
  if (action && action !== 'all') filter.action = action;
  if (from || to) {
    filter.at = {};
    if (from) filter.at.$gte = startOfDay(from);
    if (to) filter.at.$lte = endOfDay(to);
  }

  const page = Math.max(1, Number(q.get('page')) || 1);
  const limit = Math.min(200, Math.max(1, Number(q.get('limit')) || 50));

  const [total, items] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ at: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return ok({
    items: plain(items),
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
  });
});
