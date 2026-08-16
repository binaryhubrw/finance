'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateTime, money } from '@/lib/format';
import Modal from '@/components/Modal';
import Field from '@/components/Field';
import { CommentIcon } from '@/components/Icons';

/**
 * Remarks against an entry, open to anyone who can see it. Nothing here can
 * change the entry, which is what lets the read-only Auditor take part.
 */
export default function EntryComments({ entry, count = 0, compact = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api(`/api/transactions/${entry._id}/comments`);
      setComments(data.comments ?? []);
    } catch (err) {
      setError(err.message);
      setComments([]);
    }
  }, [entry._id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function post(event) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/transactions/${entry._id}/comments`, {
        method: 'POST',
        body: { body: body.trim() },
      });
      setBody('');
      await load();
      // Refresh the count on the row behind the dialog.
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const shown = comments?.length ?? count;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn btn-sm ${compact ? 'px-2 py-1' : ''}`}
        title={count ? `${count} comment${count === 1 ? '' : 's'}` : 'Leave a comment'}
      >
        <CommentIcon size={13} />
        {count ? `Comments ${count}` : 'Comment'}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Comments"
        description={`${entry.description} · ${money(entry.amount)}`}
        width={600}
      >
        <form onSubmit={post}>
          <Field
            label="Add a comment"
            as="textarea"
            value={body}
            maxLength={1000}
            onChange={(event) => setBody(event.target.value)}
            hint="Visible to everyone who can see this entry. Comments cannot be edited or removed."
          />
          {error ? (
            <p role="alert" className="mt-2 text-[12px] text-debit">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={busy || !body.trim()}>
              {busy ? 'Posting' : 'Post comment'}
            </button>
          </div>
        </form>

        <div className="mt-5 border-t border-rule pt-4">
          <p className="label mb-3">
            {comments === null
              ? 'Loading'
              : shown === 0
                ? 'No comments yet'
                : `${shown} ${shown === 1 ? 'comment' : 'comments'}, newest first`}
          </p>

          {comments === null ? null : comments.length === 0 ? (
            <p className="text-[13px] text-ink-soft">
              Nothing has been said about this entry yet.
            </p>
          ) : (
            <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <li key={comment._id} className="border-l-2 border-l-rule-strong pl-3">
                  <p className="whitespace-pre-wrap text-[13px]">{comment.body}</p>
                  <p className="label label-quiet mt-1">
                    {comment.authorName || 'Someone since removed'}
                    {comment.authorRole ? ` · ${comment.authorRole}` : ''} ·{' '}
                    {formatDateTime(comment.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
