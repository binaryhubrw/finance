import User from '@/models/User';
import { handler, ok, badRequest, unauthorised, readBody } from '@/lib/http';
import { signToken, setSessionCookie } from '@/lib/session';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ten attempts per fifteen minutes, keyed on email + IP. In-process, so on
// serverless it is per-instance — see the README.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = globalThis._loginAttempts ?? (globalThis._loginAttempts = new Map());

function rateLimit(key) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }
  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    return { allowed: false, minutes: Math.max(1, Math.ceil((record.resetAt - now) / 60000)) };
  }
  return { allowed: true };
}

function clearLimit(key) {
  attempts.delete(key);
}

export const POST = handler(async (request) => {
  const { email, password } = await readBody(request);

  if (!email || !password) {
    throw badRequest('Enter your email and password.', {
      email: email ? undefined : 'Enter your email address.',
      password: password ? undefined : 'Enter your password.',
    });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'local';
  const key = `${String(email).toLowerCase()}|${ip}`;

  const limit = rateLimit(key);
  if (!limit.allowed) {
    throw badRequest(
      `Too many sign-in attempts. Wait ${limit.minutes} minutes and try again, or ask an administrator to reset your password.`,
    );
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    '+passwordHash',
  );

  if (!user || !(await user.checkPassword(password))) {
    throw unauthorised('That email and password do not match. Check both and try again.');
  }
  if (!user.active) {
    throw unauthorised('This account has been deactivated. Ask an administrator to restore it.');
  }

  clearLimit(key);

  user.lastLoginAt = new Date();
  await user.save();

  const token = await signToken(user);
  await setSessionCookie(token);

  const actor = { id: String(user._id), name: user.name };
  await writeAudit({
    entity: 'user',
    entityId: user._id,
    action: 'login',
    actor,
    summary: `${user.name} signed in`,
  });

  return ok({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});
