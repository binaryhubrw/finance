import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import Transaction from '@/models/Transaction';
import { formatDate, formatDateTime, money, relativeDays } from '@/lib/format';
import { METHOD_LABELS } from '@/lib/enums';
import Money from '@/components/Money';
import ReviewActions from '@/components/ReviewActions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const user = await requireUser();
  await db();

  const pending = await Transaction.find({ status: 'pending' })
    .sort({ date: 1, createdAt: 1 })
    .populate('category', 'name kind')
    .populate('recordedBy', 'name')
    .lean();

  const canReview = user.role === 'auditor' || user.role === 'admin';
  const total = pending.reduce(
    (sum, entry) => sum + (entry.type === 'in' ? entry.amount : -entry.amount),
    0,
  );

  return (
    <div className="space-y-5">
      <header>
        <p className="label">Approvals</p>
        <h1 className="mt-1 text-[22px]">Waiting for review</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          {pending.length === 0
            ? 'Nothing waiting. The accountant is up to date.'
            : `${pending.length} ${
                pending.length === 1 ? 'entry' : 'entries'
              }, oldest first. Together they would move the balance by ${money(total)}.`}
        </p>
      </header>

      {pending.length === 0 ? (
        <section className="card px-5 py-10 text-center">
          <p className="text-[15px]">Nothing waiting. The accountant is up to date.</p>
          <p className="mt-2 text-[13px] text-ink-soft">
            New entries appear here the moment they are recorded.
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {pending.map((entry) => {
            const missingReceipt =
              entry.type === 'out' && !entry.reference && !entry.receiptUrl;
            const ownEntry = String(entry.recordedBy?._id ?? entry.recordedBy) === user.id;

            return (
              <li
                key={String(entry._id)}
                className="card border-l-2 border-l-flag px-4 py-4"
              >
                <div className="flex flex-col gap-4 nav:flex-row nav:items-start nav:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="text-[15px]">{entry.description}</h2>
                      <Money
                        value={entry.amount}
                        tone={entry.type === 'in' ? 'in' : 'out'}
                        size="lg"
                      />
                    </div>

                    <p className="label label-quiet mt-2">
                      {formatDate(entry.date)} · {entry.category?.name ?? 'No budget line'} ·{' '}
                      {METHOD_LABELS[entry.method] ?? entry.method}
                      {entry.payee ? ` · ${entry.payee}` : ''}
                    </p>

                    <p className="mt-2 text-[12px] text-ink-soft">
                      Recorded by {entry.recordedBy?.name ?? 'someone since removed'}{' '}
                      {relativeDays(entry.createdAt)} ({formatDateTime(entry.createdAt)})
                      {entry.reference ? ` · Reference ${entry.reference}` : ''}
                    </p>

                    {entry.note ? (
                      <p className="mt-2 text-[13px] text-ink-soft">{entry.note}</p>
                    ) : null}

                    {entry.receiptUrl ? (
                      <p className="mt-2 text-[12px]">
                        <a
                          className="link"
                          href={entry.receiptUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Open the receipt
                        </a>
                      </p>
                    ) : null}

                    {missingReceipt ? (
                      <p className="mt-3 border-l-2 border-l-flag pl-2 text-[12px] text-flag">
                        No receipt reference and no receipt link. This expense cannot be verified
                        later.
                      </p>
                    ) : null}

                    {entry.editedAfterReview ? (
                      <p className="mt-2 border-l-2 border-l-flag pl-2 text-[12px] text-flag">
                        Re-submitted after edit — it was reviewed before and has changed since.
                      </p>
                    ) : null}
                  </div>

                  {canReview ? (
                    <ReviewActions entryId={String(entry._id)} ownEntry={ownEntry} />
                  ) : (
                    <p className="text-[12px] text-ink-soft">An auditor reviews this one.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
