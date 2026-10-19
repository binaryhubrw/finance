import { OVERSIGHT_ROLES } from '@/lib/enums';
import { handler, ok, searchParams } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { exceptions } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  await requireRole(OVERSIGHT_ROLES);
  const q = searchParams(request);
  const result = await exceptions({ from: q.get('from') ?? '', to: q.get('to') ?? '' });
  return ok(result);
});
