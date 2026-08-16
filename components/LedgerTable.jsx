'use client';

import Link from 'next/link';
import { useState } from 'react';
import { qs } from '@/lib/api';
import { METHOD_LABELS, STATUS_LABELS } from '@/lib/enums';
import { formatDate, money } from '@/lib/format';
import Money from '@/components/Money';
import EntryDialog from '@/components/EntryDialog';
import { DownloadIcon, PlusIcon, UploadIcon } from '@/components/Icons';
import ImportDialog from '@/components/ImportDialog';
import AttachmentPreview from '@/components/AttachmentPreview';
import EntryComments from '@/components/EntryComments';

export default function LedgerTable({ data, categories, query, user }) {
  const [editing, setEditing] = useState(null);
  const [recording, setRecording] = useState(false);
  const [importing, setImporting] = useState(false);

  const canRecord = user.role === 'accountant' || user.role === 'admin';
  const canEdit = (entry) => {
    if (entry.status === 'void') return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'accountant') return false;
    return String(entry.recordedBy?._id ?? entry.recordedBy) === user.id && entry.status === 'pending';
  };


  const pageHref = (page) => `/ledger${qs({ ...query, page })}`;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-soft">
          {data.total} {data.total === 1 ? 'entry' : 'entries'}
          {data.summary.pending.count > 0
            ? ` · ${data.summary.pending.count} still pending, worth ${money(
                data.summary.pending.amount,
              )}`
            : ''}
        </p>
        <div className="flex gap-2">
          <a
            className={`btn ${data.items.length ? '' : 'pointer-events-none opacity-45'}`}
            href={`/api/transactions/export${qs(query)}`}
            aria-disabled={data.items.length ? undefined : true}
            download
          >
            <DownloadIcon size={15} />
            Export to Excel
          </a>
          {canRecord ? (
            <>
              <button type="button" className="btn" onClick={() => setImporting(true)}>
                <UploadIcon size={15} />
                Import a sheet
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setRecording(true)}>
                <PlusIcon size={15} />
                Record entry
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="t min-w-[760px]">
          <thead>
            <tr>
              <th scope="col" className="w-[112px]">Date</th>
              <th scope="col">Description</th>
              <th scope="col" className="w-[112px]">Method</th>
              <th scope="col" className="w-[96px]">Status</th>
              <th scope="col" className="w-[120px] text-right">Money in</th>
              <th scope="col" className="w-[120px] text-right">Money out</th>
              {data.isLedgerView ? (
                <th scope="col" className="rail w-[132px] text-right">Balance</th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {data.items.map((entry) => {
              const voided = entry.status === 'void';
              const pending = entry.status === 'pending';

              return (
                <tr key={entry._id} className={voided ? 'text-muted' : undefined}>
                  <td
                    className={`num whitespace-nowrap text-[12px] ${
                      pending ? 'border-l-[3px] border-l-flag' : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    {formatDate(entry.date)}
                  </td>

                  <td>
                    {canEdit(entry) ? (
                      <button
                        type="button"
                        onClick={() => setEditing(entry)}
                        className="text-left text-[13px] underline decoration-rule-strong underline-offset-2 transition-colors duration-120 hover:decoration-ink"
                      >
                        {entry.description}
                      </button>
                    ) : (
                      <span className={`text-[13px] ${voided ? 'line-through' : ''}`}>
                        {entry.description}
                      </span>
                    )}

                    <p className="label label-quiet mt-1">
                      {[
                        entry.payee,
                        entry.reference,
                        entry.category?.name,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>

                    {voided && entry.reviewNote ? (
                      <p className="mt-1 text-[12px] text-ink-soft">Voided: {entry.reviewNote}</p>
                    ) : null}
                    {entry.status === 'rejected' && entry.reviewNote ? (
                      <p className="mt-1 text-[12px] text-debit">Rejected: {entry.reviewNote}</p>
                    ) : null}
                    {entry.status === 'approved' && entry.reviewNote ? (
                      <p className="mt-1 text-[12px] text-ink-soft">
                        Approved: {entry.reviewNote}
                      </p>
                    ) : null}
                    {entry.extras?.length ? (
                      <p className="label label-quiet mt-1">
                        {money(entry.amount - entry.extras.reduce((sum, x) => sum + x.amount, 0))}
                        {entry.extras.map((x) => ` + ${x.label} ${money(x.amount)}`).join('')}
                      </p>
                    ) : null}

                    {entry.editedAfterReview && entry.status === 'pending' ? (
                      <p className="mt-1 text-[12px] text-flag">Edited after review</p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <AttachmentPreview attachment={entry.attachment} compact />
                      <EntryComments entry={entry} count={entry.commentCount ?? 0} compact />
                      {entry.receiptUrl ? (
                        <a
                          className="link text-[12px]"
                          href={entry.receiptUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Receipt link
                        </a>
                      ) : null}
                    </div>
                  </td>

                  <td className="text-[12px] text-ink-soft">
                    {METHOD_LABELS[entry.method] ?? entry.method}
                  </td>

                  <td>
                    <span className={`badge badge-${entry.status}`}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                  </td>

                  <td className="text-right">
                    {entry.type === 'in' ? (
                      <Money value={entry.amount} tone={voided ? 'quiet' : 'in'} />
                    ) : null}
                  </td>

                  <td className="text-right">
                    {entry.type === 'out' ? (
                      <Money value={entry.amount} tone={voided ? 'quiet' : 'out'} />
                    ) : null}
                  </td>

                  {data.isLedgerView ? (
                    <td className="rail text-right">
                      {entry.runningBalance === null ? (
                        <span className="num text-[13px] text-rule-strong" aria-label="not counted yet">
                          –
                        </span>
                      ) : (
                        <Money value={entry.runningBalance} />
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {data.isLedgerView && data.items.length ? (
              <tr className="bg-sunk/60">
                <td className="num whitespace-nowrap text-[12px] text-ink-soft">
                  {query.from ? formatDate(query.from) : '—'}
                </td>
                <td colSpan={3} className="label">
                  Opening balance
                </td>
                <td />
                <td />
                <td className="rail">
                  <Money value={data.openingBalance} size="sm" />
                </td>
              </tr>
            ) : null}

            {data.items.length === 0 ? (
              <tr>
                <td colSpan={data.isLedgerView ? 7 : 6} className="py-10 text-center">
                  <p className="text-[13px] text-ink-soft">
                    Nothing recorded in this range yet.
                    {canRecord ? ' Record the first entry to start the book.' : ''}
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {data.pages > 1 ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="label">
            Page {data.page} of {data.pages}
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link href={pageHref(data.page - 1)} className="btn btn-sm">
                Previous
              </Link>
            ) : null}
            {data.page < data.pages ? (
              <Link href={pageHref(data.page + 1)} className="btn btn-sm">
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <EntryDialog
        open={recording}
        onClose={() => setRecording(false)}
        categories={categories}
      />
      <ImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        categories={categories}
      />
      <EntryDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        categories={categories}
        entry={editing}
        canVoid
      />
    </>
  );
}
