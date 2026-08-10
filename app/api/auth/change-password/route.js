import User from '@/models/User';
import { handler, ok, badRequest, readBody } from '@/lib/http';
import { requireUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler(async (request) => {
  const session = await requireUser();
  const { currentPassword, newPassword } = await readBody(request);

  if (!currentPassword || !newPassword) {
    throw badRequest('Enter your current password and the new one.', {
      currentPassword: currentPassword ? undefined : 'Enter your current password.',
      newPassword: newPassword ? undefined : 'Enter a new password.',
    });
  }
  if (String(newPassword).length < 8) {
    throw badRequest('The new password is too short.', {
      newPassword: 'Use at least 8 characters.',
    });
  }

  const user = await User.findById(session.id).select('+passwordHash');
  if (!user || !(await user.checkPassword(currentPassword))) {
    throw badRequest('Your current password is not correct.', {
      currentPassword: 'That password does not match our records.',
    });
  }

  await user.setPassword(String(newPassword));
  await user.save();

  return ok({ changed: true });
});
