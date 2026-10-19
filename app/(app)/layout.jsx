import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { readSession } from '@/lib/session';
import Transaction from '@/models/Transaction';
import { actionableStatuses } from '@/lib/enums';
import Shell from '@/components/Shell';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  const user = await readSession();
  if (!user) redirect('/login');

  await db();
  // What this person can act on right now, so the badge means "your turn".
  const actionable = actionableStatuses(user.role);
  const pendingCount = actionable.length
    ? await Transaction.countDocuments({ status: { $in: actionable } })
    : 0;

  return (
    <Shell user={user} pendingCount={pendingCount} currency={process.env.CURRENCY || 'RWF'}>
      {children}
    </Shell>
  );
}
