'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Field from '@/components/Field';

/**
 * Clear or return an entry at whichever stage it is in. Returning requires a
 * reason, because an entry sent back has to say what to fix. The accountant's
 * approval is different in kind: it records when the money moved.
 */
const COPY = {
  pending: {
    title: 'Approve this entry',
    description: 'It moves on to the accountant. It does not count towards balances yet.',
    action: 'Approve entry',
  },
  with_accountant: {
    title: 'Confirm the money moved',
    description: 'It moves on to Approver 2 for the final approval.',
    action: 'Confirm',
  },
  final_review: {
    title: 'Give final approval',
    description: 'The entry counts towards the balance from the moment you approve it.',
    action: 'Approve entry',
  },
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function ReviewActions({ entryId, status, type, blocked = '' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(null); // 'approve' | 'reject' | null
  const [comment, setComment] = useState('');
  const [paidOn, setPaidOn] = useState(todayIso);
  const [paymentRef, setPaymentRef] = useState('');

  const open = (decision) => {
    setComment('');
    setPaidOn(todayIso());
    setPaymentRef('');
    setError('');
    setBusy(false);
    setDeciding(decision);
  };

  const settling = status === 'with_accountant';
  const copy = COPY[status] ?? COPY.pending;

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const body = { reviewNote: comment.trim() };
      if (deciding === 'approve' && settling) {
        body.paidOn = paidOn;
        body.paymentRef = paymentRef.trim();
      }
      await api(`/api/transactions/${entryId}/${deciding}`, { method: 'POST', body });
      setDeciding(null);
      setComment('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const rejecting = deciding === 'reject';
  const blockedNow = busy || (rejecting && !comment.trim()) || (!rejecting && settling && !paidOn);

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {error && !deciding ? (
        <p className="text-[12px] text-debit sm:text-right">{error}</p>
      ) : null}

      {blocked ? (
        <p className="text-[12px] text-ink-soft sm:text-right">{blocked}</p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-debit"
            disabled={busy}
            onClick={() => open('reject')}
          >
            Return
          </button>
          <button
            type="button"
            className="btn btn-credit"
            disabled={busy}
            onClick={() => open('approve')}
          >
            {settling ? (type === 'in' ? 'Confirm received' : 'Confirm paid') : 'Approve'}
          </button>
        </div>
      )}

      <Modal
        open={Boolean(deciding)}
        onClose={() => setDeciding(null)}
        title={rejecting ? 'Return this entry' : copy.title}
        description={
          rejecting
            ? 'The initiator sees this reason, corrects the entry, and it restarts at Approver 1.'
            : copy.description
        }
        width={480}
      >
        {error ? <p className="mb-3 text-[13px] text-debit">{error}</p> : null}

        {!rejecting && settling ? (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Field
              label={type === 'in' ? 'Date received' : 'Date paid'}
              type="date"
              value={paidOn}
              max={todayIso()}
              onChange={(event) => setPaidOn(event.target.value)}
            />
            <Field
              label="Payment reference (optional)"
              value={paymentRef}
              maxLength={120}
              onChange={(event) => setPaymentRef(event.target.value)}
              hint="Bank slip, mobile money or receipt number."
            />
          </div>
        ) : null}

        <Field
          label={rejecting ? 'Reason' : 'Comment (optional)'}
          as="textarea"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={500}
          hint={
            rejecting
              ? 'For example: the receipt number does not match the amount.'
              : 'Leave empty if there is nothing to add.'
          }
        />

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={() => setDeciding(null)} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${rejecting ? 'btn-debit' : 'btn-credit'}`}
            disabled={blockedNow}
            onClick={submit}
          >
            {busy ? 'Working' : rejecting ? 'Return entry' : copy.action}
          </button>
        </div>
      </Modal>
    </div>
  );
}
