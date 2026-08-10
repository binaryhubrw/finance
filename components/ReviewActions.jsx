'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Field from '@/components/Field';

/** Approve or reject a pending entry. Rejection always carries a reason. */
export default function ReviewActions({ entryId, ownEntry }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  async function approve() {
    setBusy(true);
    setError('');
    try {
      await api(`/api/transactions/${entryId}/approve`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError('');
    try {
      await api(`/api/transactions/${entryId}/reject`, {
        method: 'POST',
        body: { reviewNote: reason },
      });
      setRejecting(false);
      setReason('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {error ? <p className="text-[12px] text-debit sm:text-right">{error}</p> : null}

      {ownEntry ? (
        <p className="text-[12px] text-ink-soft sm:text-right">
          You recorded this one, so another reviewer has to clear it.
        </p>
      ) : (
        <div className="flex gap-2">
          <button type="button" className="btn btn-debit" disabled={busy} onClick={() => setRejecting(true)}>
            Reject
          </button>
          <button type="button" className="btn btn-credit" disabled={busy} onClick={approve}>
            {busy ? 'Working' : 'Approve'}
          </button>
        </div>
      )}

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Reject this entry"
        description="The accountant sees this reason and can correct the entry."
        width={480}
      >
        {error ? <p className="mb-3 text-[13px] text-debit">{error}</p> : null}
        <Field
          label="Reason"
          as="textarea"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          hint="For example: the receipt number does not match the amount."
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={() => setRejecting(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-debit"
            disabled={busy || !reason.trim()}
            onClick={reject}
          >
            Reject entry
          </button>
        </div>
      </Modal>
    </div>
  );
}
