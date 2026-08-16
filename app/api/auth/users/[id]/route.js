import User from '@/models/User';
import { ROLES, ROLE_LABELS } from '@/lib/enums';
import { handler, ok, badRequest, forbidden, notFound, readBody } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { writeAudit, diff, summarise, snapshotOf } from '@/lib/audit';
import { notify, accountChanged } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = handler(async (request, { params }) => {
  const actor = await requireRole('admin');
  const { id } = await params;
  const body = await readBody(request);

  const user = await User.findById(id);
  if (!user) throw notFound('That person is no longer on the list.');

  const isSelf = String(user._id) === actor.id;
  if (isSelf && body.role && body.role !== user.role) {
    throw forbidden('You cannot change your own role. Ask another administrator.');
  }
  if (isSelf && body.active === false) {
    throw forbidden('You cannot deactivate your own account.');
  }
  if (body.role && !ROLES.includes(body.role)) {
    throw badRequest('Choose one of the four roles.', { role: 'Unknown role.' });
  }

  const before = user.toObject();

  if (body.name !== undefined) user.name = String(body.name).trim();
  if (body.email !== undefined) user.email = String(body.email).toLowerCase().trim();
  if (body.role !== undefined) user.role = body.role;
  if (body.active !== undefined) user.active = Boolean(body.active);

  let passwordReset = false;
  if (body.password !== undefined) {
    if (String(body.password).length < 8) {
      throw badRequest('The new password is too short.', {
        password: 'Use at least 8 characters.',
      });
    }
    await user.setPassword(String(body.password));
    passwordReset = true;
  }

  await user.save();

  const changes = diff(before, user.toObject(), ['name', 'email', 'role', 'active']);
  if (passwordReset) changes.push({ field: 'password', from: 'set', to: 'reset' });

  if (changes.length) {
    await writeAudit({
      entity: 'user',
      entityId: user._id,
      action: 'update',
      actor,
      summary: passwordReset && changes.length === 1
        ? `Reset the password for ${user.name}`
        : summarise(changes, `Updated ${user.name}:`),
      changes,
      snapshot: snapshotOf(user),
    });
  }

  notify(async () => {
    const person = { name: user.name, email: user.email };
    // One email per thing that actually changed, so a role change and a
    // password reset in the same save are not collapsed into one vague notice.
    if (passwordReset) {
      await accountChanged({ person, change: 'password', actor });
    }
    if (body.role !== undefined && body.role !== before.role) {
      await accountChanged({
        person, change: 'role', detail: ROLE_LABELS[user.role] ?? user.role, actor,
      });
    }
    if (body.active !== undefined && Boolean(body.active) !== before.active) {
      await accountChanged({
        person, change: user.active ? 'activated' : 'deactivated', actor,
      });
    }
  });

  return ok({ user: user.toJSON() });
});
