import { handler, ok, searchParams } from '@/lib/http';
import { requireUser } from '@/lib/session';
import { reportSummary } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  await requireUser();
  const q = searchParams(request);
  const summary = await reportSummary({ from: q.get('from') ?? '', to: q.get('to') ?? '' });
  return ok(summary);
});
