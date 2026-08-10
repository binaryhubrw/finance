import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { readSession } from '@/lib/session';
import Transaction from '@/models/Transaction';
import Shell from '@/components/Shell';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  const user = await readSession();
  if (!user) redirect('/login');

  await db();
  const pendingCount = await Transaction.countDocuments({ status: 'pending' });

  return (
    <Shell user={user} pendingCount={pendingCount} currency={process.env.CURRENCY || 'RWF'}>
      {children}
    </Shell>
  );
}
