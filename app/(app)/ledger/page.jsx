import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import Category from '@/models/Category';
import User from '@/models/User';
import { listTransactions } from '@/lib/queries';
import { plain } from '@/lib/audit';
import FilterBar from '@/components/FilterBar';
import LedgerTable from '@/components/LedgerTable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const iso = (date) => date.toISOString().slice(0, 10);

function defaultRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { from: iso(start), to: iso(end) };
}

export default async function LedgerPage({ searchParams }) {
  const user = await requireUser();
  await db();

  const sp = (await searchParams) ?? {};
  const fallback = defaultRange();
  const one = (value) => (Array.isArray(value) ? value[0] : (value ?? ''));

  const query = {
    from: one(sp.from) || fallback.from,
    to: one(sp.to) || fallback.to,
    type: one(sp.type),
    method: one(sp.method),
    status: one(sp.status),
    category: one(sp.category),
    recordedBy: one(sp.recordedBy),
    search: one(sp.search),
  };
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const seesPeopleFilter = ['admin', 'auditor', 'viewer'].includes(user.role);

  const [data, categories, people] = await Promise.all([
    listTransactions({ ...query, page, limit: 50 }),
    Category.find({}).sort({ kind: 1, name: 1 }).lean(),
    seesPeopleFilter
      ? User.find({}).select('name').sort({ name: 1 }).lean()
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1 className="page-title mt-1">Cash book</h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            Every entry, in date order. Only approved entries move the balance column.
          </p>
        </div>
      </header>

      <FilterBar
        values={query}
        categories={plain(categories)}
        people={people.map((person) => ({ id: String(person._id), name: person.name }))}
      />

      <LedgerTable
        data={data}
        categories={plain(categories)}
        query={{ ...query, page }}
        user={{ id: user.id, role: user.role }}
      />
    </div>
  );
}
