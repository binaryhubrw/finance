'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Field from '@/components/Field';

/**
 * Approve or reject a pending entry. Both decisions can carry a comment;
 * rejection requires one, because an entry sent back has to say what to fix,
 * while an approval only sometimes needs a note ("verified against the bank
 * statement") and should not be slowed down by a mandatory field.
 */
export default function ReviewActions({ entryId, ownEntry }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(null); // 'approve' | 'reject' | null
  const [comment, setComment] = useState('');

  const open = (decision) => {
    setComment('');
    setError('');
    setDeciding(decision);
  };

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api(`/api/transactions/${entryId}/${deciding}`, {
        method: 'POST',
        body: { reviewNote: comment.trim() },
      });
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
  const blocked = busy || (rejecting && !comment.trim());

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {error && !deciding ? (
        <p className="text-[12px] text-debit sm:text-right">{error}</p>
      ) : null}

      {ownEntry ? (
        <p className="text-[12px] text-ink-soft sm:text-right">
          You recorded this one, so another reviewer has to clear it.
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-debit"
            disabled={busy}
            onClick={() => open('reject')}
          >
            Reject
          </button>
          <button
            type="button"
            className="btn btn-credit"
            disabled={busy}
            onClick={() => open('approve')}
          >
            Approve
          </button>
        </div>
      )}

      <Modal
        open={Boolean(deciding)}
        onClose={() => setDeciding(null)}
        title={rejecting ? 'Reject this entry' : 'Approve this entry'}
        description={
          rejecting
            ? 'The accountant sees this reason and can correct the entry.'
            : 'The entry counts towards the balance from the moment you approve it.'
        }
        width={480}
      >
        {error ? <p className="mb-3 text-[13px] text-debit">{error}</p> : null}

        <Field
          label={rejecting ? 'Reason' : 'Comment (optional)'}
          as="textarea"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={500}
          hint={
            rejecting
              ? 'For example: the receipt number does not match the amount.'
              : 'For example: checked against the bank statement. Leave empty if there is nothing to add.'
          }
        />

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={() => setDeciding(null)} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${rejecting ? 'btn-debit' : 'btn-credit'}`}
            disabled={blocked}
            onClick={submit}
          >
            {busy ? 'Working' : rejecting ? 'Reject entry' : 'Approve entry'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
