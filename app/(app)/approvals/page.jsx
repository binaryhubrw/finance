import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import Transaction from '@/models/Transaction';
import { formatDate, formatDateTime, money, relativeDays } from '@/lib/format';
import { METHOD_LABELS } from '@/lib/enums';
import Money from '@/components/Money';
import ReviewActions from '@/components/ReviewActions';
import { CheckCircleIcon, ClockIcon, CrossCircleIcon } from '@/components/Icons';
import AttachmentPreview from '@/components/AttachmentPreview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Void lives in the ledger, not here — this screen is about the review decision. */
const TABS = [
  {
    status: 'pending',
    label: 'Pending',
    title: 'Waiting for review',
    blurb: 'Waiting for a decision. None of it counts towards the balance yet.',
    icon: ClockIcon,
    tone: 'text-flag',
    empty: 'Nothing waiting. The accountant is up to date.',
    emptyNote: 'New entries appear here the moment they are recorded.',
  },
  {
    status: 'approved',
    label: 'Approved',
    title: 'Already approved',
    blurb: 'Cleared, and counting towards the balance.',
    icon: CheckCircleIcon,
    tone: 'text-credit',
    empty: 'Nothing approved yet.',
    emptyNote: 'Clear the pending queue and entries land here.',
  },
  {
    status: 'rejected',
    label: 'Rejected',
    title: 'Sent back',
    blurb: 'Sent back with a reason. These do not count until they are corrected.',
    icon: CrossCircleIcon,
    tone: 'text-debit',
    empty: 'Nothing rejected.',
    emptyNote: 'Rejecting an entry always records why, and it shows up here.',
  },
];

const EDGE = {
  pending: 'border-l-flag',
  approved: 'border-l-credit',
  rejected: 'border-l-debit',
};

const LIST_LIMIT = 50;

const hrefFor = (status) =>
  status === 'pending' ? '/approvals' : `/approvals?status=${status}`;

export default async function ApprovalsPage({ searchParams }) {
  const user = await requireUser();
  await db();

  const params = (await searchParams) ?? {};
  const asked = Array.isArray(params.status) ? params.status[0] : params.status;
  const active = TABS.find((tab) => tab.status === asked) ?? TABS[0];

  // Every list reads newest first.
  const sortFor = (status) =>
    status === 'pending' ? { date: -1, createdAt: -1 } : { reviewedAt: -1, updatedAt: -1 };

  const [tallies, entries] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: { $in: TABS.map((tab) => tab.status) } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          value: { $sum: '$amount' },
          // Signed, so the pending line can say what clearing the queue would do.
          net: {
            $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$amount', { $multiply: ['$amount', -1] }] },
          },
        },
      },
    ]),
    Transaction.find({ status: active.status })
      .sort(sortFor(active.status))
      .limit(LIST_LIMIT)
      .populate('category', 'name kind')
      .populate('recordedBy', 'name')
      .populate('reviewedBy', 'name')
      .lean(),
  ]);

  const tally = (status) => tallies.find((row) => row._id === status) ?? { count: 0, value: 0, net: 0 };

  const canReview = user.role === 'auditor' || user.role === 'admin';
  const { count: total, net } = tally(active.status);
  const showActions = active.status === 'pending' && canReview;
  const reviewable = tallies.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Approvals</p>
        <h1 className="page-title mt-1">{active.title}</h1>
        <p className="mt-1 text-[13px] text-ink-soft">{active.blurb}</p>
      </header>

      <section className="card overflow-hidden p-0">
        <nav aria-label="Filter by status" className="tab-strip">
          {TABS.map((tab) => {
            const { count, value } = tally(tab.status);
            const selected = tab.status === active.status;
            const Icon = tab.icon;
            const share = reviewable === 0 ? 0 : Math.round((count / reviewable) * 100);

            return (
              <Link
                key={tab.status}
                href={hrefFor(tab.status)}
                aria-current={selected ? 'page' : undefined}
                className={`tab tab-${tab.status}`}
              >
                <span className="tab-label flex items-center gap-1.5">
                  <Icon size={14} />
                  <span className="label !text-current">{tab.label}</span>
                </span>

                <span className="tab-count mt-2.5 block">{count}</span>

                <span className="mt-2 block text-[12px] text-ink-soft">
                  {count === 0 ? 'nothing here' : `worth ${money(value)}`}
                </span>

                <span className="tab-share mt-2.5 block" aria-hidden="true">
                  <span style={{ width: `${share}%` }} />
                </span>
                <span className="label label-quiet mt-1.5 block">{share}% of the book</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-b border-rule px-4 py-3">
          <p className="text-[13px] text-ink-soft">
            {total === 0
              ? active.blurb
              : active.status === 'pending'
                ? `${total} ${total === 1 ? 'entry' : 'entries'}, newest first. Together they would move the balance by ${money(net)}.`
                : `${total} ${total === 1 ? 'entry' : 'entries'}, most recently reviewed first.`}
            {total > LIST_LIMIT ? (
              <>
                {' '}
                Showing the first {LIST_LIMIT} —{' '}
                <Link href={`/ledger?status=${active.status}`} className="link">
                  see them all in the ledger
                </Link>
                .
              </>
            ) : null}
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-[16px] font-semibold tracking-[-0.02em]">{active.empty}</p>
            <p className="mt-2 text-[13px] text-ink-soft">{active.emptyNote}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="t min-w-[860px]">
            <thead>
              <tr>
                <th scope="col" className="w-[112px]">Date</th>
                <th scope="col">Entry</th>
                <th scope="col" className="w-[150px]">Recorded by</th>
                <th scope="col" className="w-[130px] text-right">Amount</th>
                <th scope="col" className={showActions ? 'w-[200px]' : 'w-[240px]'}>
                  {active.status === 'pending'
                    ? 'Decision'
                    : active.status === 'approved'
                      ? 'Approved by'
                      : 'Reason'}
                </th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => {
                const missingReceipt =
                  entry.type === 'out' &&
                  !entry.reference &&
                  !entry.receiptUrl &&
                  !entry.attachment;
                const ownEntry = String(entry.recordedBy?._id ?? entry.recordedBy) === user.id;

                return (
                  <tr key={String(entry._id)}>
                    <td
                      className={`num whitespace-nowrap border-l-[3px] text-[12px] ${EDGE[entry.status]}`}
                    >
                      {formatDate(entry.date)}
                    </td>

                    <td>
                      <p className="text-[13px]">{entry.description}</p>
                      <p className="label label-quiet mt-1">
                        {[
                          entry.category?.name,
                          METHOD_LABELS[entry.method] ?? entry.method,
                          entry.payee,
                          entry.reference,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>

                      {entry.note ? (
                        <p className="mt-1 text-[12px] text-ink-soft">{entry.note}</p>
                      ) : null}

                      {entry.attachment || entry.receiptUrl ? (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px]">
                          {entry.status === 'pending' ? null : (
                            <AttachmentPreview attachment={entry.attachment} />
                          )}
                          {entry.receiptUrl ? (
                            <a
                              className="link"
                              href={entry.receiptUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              Open the receipt link
                            </a>
                          ) : null}
                        </div>
                      ) : null}

                      {missingReceipt && entry.status !== 'rejected' ? (
                        <p className="mt-1.5 text-[12px] text-flag">
                          No receipt reference and no receipt link — this cannot be verified later.
                        </p>
                      ) : null}

                      {entry.editedAfterReview && entry.status === 'pending' ? (
                        <p className="mt-1 text-[12px] text-flag">
                          Re-submitted after edit — reviewed before, and changed since.
                        </p>
                      ) : null}
                    </td>

                    <td className="text-[13px] text-ink-soft">
                      <p>{entry.recordedBy?.name ?? 'someone since removed'}</p>
                      <p className="label label-quiet mt-1">{relativeDays(entry.createdAt)}</p>
                    </td>

                    <td className="text-right">
                      <Money value={entry.amount} tone={entry.type === 'in' ? 'in' : 'out'} />
                      <p className="label label-quiet mt-1">
                        {entry.type === 'in' ? 'money in' : 'money out'}
                      </p>
                    </td>

                    <td>
                      {entry.status === 'pending' ? (
                        <div className="flex flex-col items-stretch gap-2 sm:items-end">
                          {entry.attachment ? (
                            <AttachmentPreview attachment={entry.attachment} />
                          ) : entry.type === 'out' ? (
                            <p className="text-[12px] text-flag sm:text-right">No receipt to check</p>
                          ) : null}
                          {canReview ? (
                            <ReviewActions entryId={String(entry._id)} ownEntry={ownEntry} />
                          ) : (
                            <p className="text-[12px] text-ink-soft sm:text-right">
                              An auditor reviews this one.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-[13px]">
                            {entry.reviewedBy?.name ?? 'someone since removed'}
                          </p>
                          <p className="label label-quiet mt-1">
                            {entry.reviewedAt ? formatDateTime(entry.reviewedAt) : 'date not recorded'}
                          </p>
                          {entry.reviewNote ? (
                            <p
                              className={`mt-1.5 text-[12px] ${
                                entry.status === 'rejected' ? 'text-debit' : 'text-ink-soft'
                              }`}
                            >
                              {entry.reviewNote}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
