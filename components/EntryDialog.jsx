'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDate, money, toInputDate, todayInput } from '@/lib/format';
import { METHOD_LABELS, METHODS } from '@/lib/enums';
import Modal from '@/components/Modal';
import Field from '@/components/Field';
import { PlusIcon } from '@/components/Icons';

const emptyForm = () => ({
  date: todayInput(),
  type: 'out',
  amount: '',
  category: '',
  description: '',
  payee: '',
  method: 'cash',
  reference: '',
  receiptUrl: '',
  note: '',
});

const formFrom = (entry) => ({
  date: toInputDate(entry.date),
  type: entry.type,
  amount: String(entry.amount),
  category: String(entry.category?._id ?? entry.category ?? ''),
  description: entry.description ?? '',
  payee: entry.payee ?? '',
  method: entry.method ?? 'cash',
  reference: entry.reference ?? '',
  receiptUrl: entry.receiptUrl ?? '',
  note: entry.note ?? '',
});

const fileSize = (bytes) => {
  const kb = (bytes ?? 0) / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

export default function EntryDialog({ open, onClose, categories, entry = null, canVoid = false }) {
  const router = useRouter();
  const fileInput = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [details, setDetails] = useState({});
  const [busy, setBusy] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  // Entries added but not yet saved. Only ever used when recording, never when
  // editing an entry that already exists.
  const [staged, setStaged] = useState([]);
  const [rowErrors, setRowErrors] = useState({});

  const pickFile = () => {
    setUploadError('');
    fileInput.current?.click();
  };

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/attachments', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'That file could not be attached.');
      setAttachment(data.attachment);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  // The dialog stays mounted between openings, so every field of its state has
  // to be cleared here — including `busy`, which a successful save leaves set
  // on its way out.
  useEffect(() => {
    if (!open) return;
    setForm(entry ? formFrom(entry) : emptyForm());
    setError('');
    setDetails({});
    setBusy(false);
    setVoiding(false);
    setVoidReason('');
    setAttachment(entry?.attachment ?? null);
    setUploading(false);
    setUploadError('');
    setStaged([]);
    setRowErrors({});
  }, [open, entry]);

  // `localProblems` is a hoisted function declaration, so it is safe to call here.
  const totalToSave = staged.length + (Object.keys(localProblems(form)).length === 0 ? 1 : 0);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const choices = categories.filter(
    (category) =>
      category.kind === (form.type === 'in' ? 'income' : 'expense') &&
      (category.active || String(category._id) === form.category),
  );

  /** The few checks worth making before a row joins the list. */
  function localProblems(row) {
    const found = {};
    if (!row.date) found.date = 'Pick the date the money moved.';
    if (!String(row.description ?? '').trim()) {
      found.description = 'Describe what this entry is for.';
    }
    if (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0.01) {
      found.amount = 'Enter an amount greater than zero.';
    }
    if (!row.category) found.category = 'Choose a budget line.';
    return found;
  }

  const blankForm = () => ({ ...emptyForm(), date: form.date, method: form.method });

  /** Puts the open form on the list and clears it for the next one. */
  function addAnother() {
    const found = localProblems(form);
    if (Object.keys(found).length) {
      setDetails(found);
      setError('Fill this entry in before adding another.');
      return;
    }
    setStaged((current) => [...current, { ...form, attachment }]);
    setForm(blankForm());
    setAttachment(null);
    setDetails({});
    setError('');
    setRowErrors({});
  }

  /** Pulls a listed entry back into the form to change it. */
  function reopen(index) {
    const row = staged[index];
    const keeping = localProblems(form);
    setStaged((current) => {
      const next = current.filter((_, i) => i !== index);
      // Don't lose what is in the form; park it at the end if it is usable.
      return Object.keys(keeping).length ? next : [...next, { ...form, attachment }];
    });
    setForm({ ...row, attachment: undefined });
    setAttachment(row.attachment ?? null);
    setDetails({});
    setError('');
    setRowErrors({});
  }

  const removeStaged = (index) => {
    setStaged((current) => current.filter((_, i) => i !== index));
    setRowErrors({});
  };

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setDetails({});

    setRowErrors({});
    const body = { ...form, amount: Number(form.amount), attachment };

    try {
      if (entry) {
        await api(`/api/transactions/${entry._id}`, { method: 'PATCH', body });
      } else if (staged.length) {
        // The open form counts as the last entry, as long as it has been filled in.
        const filled = Object.keys(localProblems(form)).length === 0;
        const rows = [...staged, ...(filled ? [{ ...form, attachment }] : [])];
        await api('/api/transactions/batch', {
          method: 'POST',
          body: { entries: rows.map((row) => ({ ...row, amount: Number(row.amount) })) },
        });
      } else {
        await api('/api/transactions', { method: 'POST', body });
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err.message);
      // The batch route reports per-row; a single save reports per-field.
      if (err.details?.rows) {
        setRowErrors(err.details.rows);
        setDetails({});
      } else {
        setDetails(err.details ?? {});
      }
      setBusy(false);
    }
  }

  async function voidEntry() {
    setBusy(true);
    setError('');
    try {
      await api(`/api/transactions/${entry._id}/void`, {
        method: 'POST',
        body: { reviewNote: voidReason },
      });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err.message);
      setDetails(err.details ?? {});
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit entry' : 'Record entry'}
      description={
        entry
          ? 'Changing a reviewed entry sends it back to the approval queue.'
          : 'The entry is saved as pending. It moves the balance once an auditor approves it.'
      }
      width={640}
    >
      <form onSubmit={save} noValidate>
        {staged.length ? (
          <div className="mb-4">
            <p className="label mb-2">
              Added so far · {staged.length} {staged.length === 1 ? 'entry' : 'entries'}
            </p>
            <ul className="divide-y divide-rule overflow-hidden rounded-md border border-rule">
              {staged.map((row, index) => {
                const line = categories.find((c) => String(c._id) === row.category);
                const failed = rowErrors[index];

                return (
                  <li
                    key={`${row.description}-${index}`}
                    className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5 ${
                      failed ? 'bg-debit/5' : 'bg-sunk'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px]">{row.description}</p>
                      <p className="label label-quiet mt-1">
                        {[formatDate(row.date), line?.name, row.attachment ? 'receipt attached' : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {failed ? (
                        <p className="mt-1 text-[12px] text-debit">
                          {Object.values(failed).join(' ')}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`num text-[13px] ${
                          row.type === 'in' ? 'text-credit' : 'text-debit'
                        }`}
                      >
                        {money(Number(row.amount))}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => reopen(index)}
                        disabled={busy}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => removeStaged(index)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="label mt-3">
              {staged.length === 1 ? 'Next entry' : `Entry ${staged.length + 1}`}
            </p>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-sm border border-debit/40 bg-debit/5 px-3 py-2 text-[13px] text-debit"
          >
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date"
            type="date"
            value={form.date}
            max={todayInput()}
            error={details.date}
            onChange={set('date')}
            numeric
            required
          />

          <div>
            <p className="label mb-1.5">Direction</p>
            <div className="flex gap-2" role="group" aria-label="Direction">
              {[
                { value: 'in', label: 'Money in' },
                { value: 'out', label: 'Money out' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={form.type === option.value}
                  onClick={() =>
                    setForm((current) => ({ ...current, type: option.value, category: '' }))
                  }
                  className={`btn flex-1 ${
                    form.type === option.value
                      ? option.value === 'in'
                        ? 'border-credit text-credit'
                        : 'border-debit text-debit'
                      : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Field
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            value={form.amount}
            error={details.amount}
            onChange={set('amount')}
            numeric
            required
          />

          <Field
            label="Budget line"
            as="select"
            value={form.category}
            error={details.category}
            onChange={set('category')}
            required
          >
            {(id, fieldClass, describedBy) => (
              <select
                id={id}
                className={fieldClass}
                aria-describedby={describedBy}
                value={form.category}
                onChange={set('category')}
                required
              >
                <option value="">Choose a line</option>
                {choices.map((category) => (
                  <option key={String(category._id)} value={String(category._id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label="Description"
            className="sm:col-span-2"
            value={form.description}
            error={details.description}
            maxLength={300}
            onChange={set('description')}
            required
          />

          <Field
            label={form.type === 'in' ? 'Received from' : 'Paid to'}
            value={form.payee}
            error={details.payee}
            onChange={set('payee')}
          />

          <Field label="Method" as="select" value={form.method} onChange={set('method')}>
            {(id, fieldClass) => (
              <select id={id} className={fieldClass} value={form.method} onChange={set('method')}>
                {METHODS.map((method) => (
                  <option key={method} value={method}>
                    {METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label="Reference"
            hint="Receipt number or mobile money transaction ID"
            value={form.reference}
            error={details.reference}
            onChange={set('reference')}
          />

          <Field
            label="Receipt link"
            type="url"
            placeholder="https://"
            hint="A link to the photo of the receipt"
            value={form.receiptUrl}
            error={details.receiptUrl}
            onChange={set('receiptUrl')}
          />

          <div className="sm:col-span-2">
            <label htmlFor="entry-attachment" className="label mb-1.5 block">
              Receipt file
            </label>

            {attachment ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-sunk px-3 py-2.5">
                <div className="min-w-0">
                  <a
                    className="link text-[13px]"
                    href={`/api/attachments/${attachment.filename}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {attachment.originalName}
                  </a>
                  <p className="label label-quiet mt-1">{fileSize(attachment.size)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-sm" onClick={pickFile} disabled={busy}>
                    Replace
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setAttachment(null)}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-sm" onClick={pickFile} disabled={uploading}>
                  {uploading ? 'Uploading' : 'Attach a receipt'}
                </button>
                <p className="text-[12px] text-ink-soft">
                  A photo or PDF, kept on the hub&rsquo;s own server. Up to 5MB.
                </p>
              </div>
            )}

            <input
              id="entry-attachment"
              ref={fileInput}
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/*"
              onChange={onFile}
            />

            {uploadError ? (
              <p className="mt-1.5 text-[12px] text-debit">{uploadError}</p>
            ) : null}
          </div>

          <Field
            label="Note"
            as="textarea"
            className="sm:col-span-2"
            maxLength={500}
            value={form.note}
            error={details.note}
            onChange={set('note')}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <p className="text-[12px] text-ink-soft">
            {entry
              ? 'Every change is written to the audit trail.'
              : staged.length
                ? 'All of them are saved together, or none are. Each waits for an auditor.'
                : 'Saved entries wait for an auditor before they count.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            {entry ? null : (
              <button type="button" className="btn" onClick={addAnother} disabled={busy}>
                <PlusIcon size={14} />
                Add another
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy
                ? 'Saving'
                : entry
                  ? 'Save changes'
                  : totalToSave > 1
                    ? `Record ${totalToSave} entries`
                    : 'Record entry'}
            </button>
          </div>
        </div>
      </form>

      {entry && canVoid ? (
        <div className="mt-4 border-t border-rule pt-4">
          {voiding ? (
            <div>
              <Field
                label="Reason for voiding"
                as="textarea"
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                hint="The entry stays visible with this reason attached."
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn btn-debit"
                  disabled={busy || !voidReason.trim()}
                  onClick={voidEntry}
                >
                  Void this entry
                </button>
                <button type="button" className="btn" onClick={() => setVoiding(false)}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-sm" onClick={() => setVoiding(true)}>
              Void this entry
            </button>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
