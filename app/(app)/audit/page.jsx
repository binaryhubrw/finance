import mongoose from 'mongoose';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import AuditLog from '@/models/AuditLog';
import User from '@/models/User';
import { plain } from '@/lib/audit';
import { activity, startOfDay, endOfDay } from '@/lib/queries';
import AuditTrail from '@/components/AuditTrail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMIT = 50;

export default async function AuditPage({ searchParams }) {
  const user = await requireUser();

  if (user.role === 'accountant') {
    return (
      <div className="card px-5 py-8">
        <p className="eyebrow">Audit trail</p>
        <h1 className="page-title mt-1">This section is for reviewers</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          The trail records what you enter, so it is read by the people who review your work. Your
          own entries and their history are on the ledger.
        </p>
      </div>
    );
  }

  await db();
  const sp = (await searchParams) ?? {};
  const one = (value) => (Array.isArray(value) ? value[0] : (value ?? ''));

  const values = {
    actor: one(sp.actor),
    action: one(sp.action),
    from: one(sp.from),
    to: one(sp.to),
  };
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const filter = {};
  if (values.action) filter.action = values.action;
  if (values.actor && mongoose.Types.ObjectId.isValid(values.actor)) {
    filter.actor = new mongoose.Types.ObjectId(values.actor);
  }
  if (values.from || values.to) {
    filter.at = {};
    if (values.from) filter.at.$gte = startOfDay(values.from);
    if (values.to) filter.at.$lte = endOfDay(values.to);
  }

  const [total, entries, people, recent] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ at: -1, _id: -1 })
      .skip((page - 1) * LIMIT)
      .limit(LIMIT)
      .lean(),
    User.find({}).select('name').sort({ name: 1 }).lean(),
    activity(30),
  ]);

  const busiest = Math.max(1, ...recent.series.map((day) => day.total));

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Audit trail</p>
        <h1 className="page-title mt-1">Everything that has happened</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          Newest first. Nothing here can be edited or removed, by anyone.
        </p>
      </header>

      <section className="card px-4 py-3">
        <p className="label">Activity, last 30 days</p>
        <div className="mt-2 flex h-10 items-end gap-[3px]" aria-hidden="true">
          {recent.series.map((day) => (
            <div
              key={day.day}
              title={`${day.day}: ${day.total} actions`}
              className="min-w-[3px] flex-1 bg-accent/70"
              style={{ height: `${Math.max(2, (day.total / busiest) * 100)}%` }}
            />
          ))}
        </div>
        <p className="mt-2 text-[12px] text-ink-soft">
          {recent.series.reduce((sum, day) => sum + day.total, 0)} actions recorded in the last 30
          days.
        </p>
      </section>

      <AuditTrail
        entries={plain(entries)}
        people={people.map((person) => ({ id: String(person._id), name: person.name }))}
        values={values}
        page={page}
        pages={Math.max(1, Math.ceil(total / LIMIT))}
      />
    </div>
  );
}
