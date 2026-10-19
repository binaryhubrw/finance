import { OVERSIGHT_ROLES } from '@/lib/enums';
import { handler, ok, searchParams } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { activity } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  await requireRole(OVERSIGHT_ROLES);
  const days = Math.min(120, Math.max(1, Number(searchParams(request).get('days')) || 30));
  return ok(await activity(days));
});
