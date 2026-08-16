import Transaction from '@/models/Transaction';
import Comment from '@/models/Comment';
import { handler, ok, badRequest, notFound, readBody } from '@/lib/http';
import { requireUser } from '@/lib/session';
import { writeAudit, plain } from '@/lib/audit';
import { ROLE_LABELS } from '@/lib/enums';
import { notify, entryCommented } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Remarks against one entry.
 *
 * Anyone who can see the entry can leave one — the read-only Auditor above all,
 * whose whole job is to look and ask. A comment changes nothing about the
 * entry: not its amount, not its status, not the balance. It is the one thing
 * a read-only role can add without stopping being read-only.
 *
 * There is no PATCH or DELETE here, and none should be added.
 */
export const GET = handler(async (_request, { params }) => {
  await requireUser();
  const { id } = await params;

  const entry = await Transaction.findById(id).select('_id').lean();
  if (!entry) throw notFound('That entry no longer exists.');

  const comments = await Comment.find({ entity: 'transaction', entityId: entry._id })
    .sort({ at: -1 })
    .lean();

  return ok({ comments: plain(comments) });
});

export const POST = handler(async (request, { params }) => {
  const actor = await requireUser();
  const { id } = await params;
  const body = await readBody(request);

  const text = String(body.body ?? '').trim();
  if (!text) throw badRequest('Write something before posting the comment.');
  if (text.length > 1000) throw badRequest('Keep a comment under 1000 characters.');

  const entry = await Transaction.findById(id).select('_id description').lean();
  if (!entry) throw notFound('That entry no longer exists.');

  const comment = await Comment.create({
    entity: 'transaction',
    entityId: entry._id,
    body: text,
    author: actor.id,
    authorName: actor.name,
    authorRole: ROLE_LABELS[actor.role] ?? actor.role,
  });

  await writeAudit({
    entity: 'transaction',
    entityId: entry._id,
    action: 'comment',
    actor,
    summary: `Commented on “${entry.description}”: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`,
  });

  notify(async () => {
    const full = await Transaction.findById(entry._id)
      .populate('category', 'name')
      .populate('recordedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .lean();
    await entryCommented({
      entry: full,
      category: full.category,
      author: actor,
      body: text,
      involved: [full.recordedBy, full.reviewedBy].filter(Boolean),
    });
  });

  return ok({ comment: plain(comment.toObject()) }, 201);
});
