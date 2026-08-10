import { handler, ok } from '@/lib/http';
import { clearSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler(async () => {
  await clearSessionCookie();
  return ok({ signedOut: true });
});
