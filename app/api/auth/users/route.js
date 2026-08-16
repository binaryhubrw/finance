import User from '@/models/User';
import { ROLES } from '@/lib/enums';
import { handler, ok, badRequest, conflict, readBody } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { writeAudit, snapshotOf } from '@/lib/audit';
import { notify, accountCreated } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireRole('admin');
  const users = await User.find({}).sort({ name: 1 }).lean();
  return ok({
    items: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
    })),
  });
});

export const POST = handler(async (request) => {
  const actor = await requireRole('admin');
  const { name, email, role, password } = await readBody(request);

  const details = {};
  if (!name) details.name = 'Give this person a name.';
  if (!email) details.email = 'Enter an email address.';
  if (!password || String(password).length < 8) {
    details.password = 'Set a password of at least 8 characters.';
  }
  if (role && !ROLES.includes(role)) details.role = 'Choose one of the four roles.';
  if (Object.keys(details).length) {
    throw badRequest('Some fields need attention before this person can be added.', details);
  }

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (existing) {
    throw conflict('Someone already uses that email address.', {
      email: 'This address is already registered.',
    });
  }

  const user = new User({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    role: role ?? 'viewer',
  });
  await user.setPassword(String(password));
  await user.save();

  await writeAudit({
    entity: 'user',
    entityId: user._id,
    action: 'create',
    actor,
    summary: `Added ${user.name} as ${user.role}`,
    snapshot: snapshotOf(user),
  });

  notify(async () => {
    await accountCreated({ person: user, role: user.role, createdBy: actor });
  });

  return ok({ user: user.toJSON() }, 201);
});
