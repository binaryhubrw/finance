import { handler, ok } from '@/lib/http';
import { requireUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const user = await requireUser();
  return ok({ user });
});
