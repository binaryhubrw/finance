import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import Category from '@/models/Category';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import ClosedPeriod from '@/models/ClosedPeriod';
import { plain } from '@/lib/audit';
import { balanceBefore } from '@/lib/queries';
import { monthEnd, monthStart, monthLabel } from '@/lib/period';
import {
  AccountPanel,
  CategoriesPanel,
  PeoplePanel,
  PeriodsPanel,
  ClosedMonthsHint,
} from '@/components/SettingsPanels';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONTHS_OFFERED = 12;

export default async function SettingsPage() {
  const user = await requireUser();
  await db();

  const isAdmin = user.role === 'admin';
  const canClose = isAdmin || user.role === 'auditor';

  const [categories, people, periods] = await Promise.all([
    isAdmin ? Category.find({}).sort({ kind: 1, name: 1 }).lean() : Promise.resolve([]),
    isAdmin ? User.find({}).sort({ name: 1 }).lean() : Promise.resolve([]),
    canClose
      ? ClosedPeriod.find({}).sort({ year: -1, month: -1 }).populate('closedBy', 'name').lean()
      : Promise.resolve([]),
  ]);

  let months = [];
  if (canClose) {
    const closedKeys = new Set(periods.map((period) => `${period.year}-${period.month}`));
    const now = new Date();
    const candidates = [];
    for (let i = 1; i <= MONTHS_OFFERED; i += 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
      candidates.push({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 });
    }

    months = await Promise.all(
      candidates.map(async ({ year, month }) => {
        const [bookBalance, pending] = await Promise.all([
          balanceBefore(monthEnd(year, month)),
          Transaction.countDocuments({
            status: 'pending',
            date: { $gte: monthStart(year, month), $lt: monthEnd(year, month) },
          }),
        ]);
        return {
          key: `${year}-${String(month).padStart(2, '0')}`,
          label: monthLabel(year, month),
          bookBalance,
          pending,
          closed: closedKeys.has(`${year}-${month}`),
        };
      }),
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="page-title mt-1">How the book is set up</h1>
        <div className="mt-1 space-y-1">
          <p className="text-[13px] text-ink-soft">
            {isAdmin
              ? 'Budget lines, the people who use the book, and the monthly close.'
              : 'Close a month once its approval queue is clear.'}
          </p>
          <ClosedMonthsHint periods={plain(periods)} />
        </div>
      </header>

      <AccountPanel user={user} />

      {isAdmin ? <CategoriesPanel categories={plain(categories)} /> : null}

      {isAdmin ? (
        <PeoplePanel
          people={people.map((person) => ({
            id: String(person._id),
            name: person.name,
            email: person.email,
            role: person.role,
            active: person.active,
            lastLoginAt: person.lastLoginAt ? person.lastLoginAt.toISOString() : null,
          }))}
          currentUserId={user.id}
        />
      ) : null}

      {canClose ? (
        <PeriodsPanel months={months} periods={plain(periods)} canReopen={isAdmin} />
      ) : null}
    </div>
  );
}
