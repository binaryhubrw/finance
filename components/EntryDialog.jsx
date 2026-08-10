'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toInputDate, todayInput } from '@/lib/format';
import { METHOD_LABELS, METHODS } from '@/lib/enums';
import Modal from '@/components/Modal';
import Field from '@/components/Field';

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

export default function EntryDialog({ open, onClose, categories, entry = null, canVoid = false }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [details, setDetails] = useState({});
  const [busy, setBusy] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(entry ? formFrom(entry) : emptyForm());
    setError('');
    setDetails({});
    setVoiding(false);
    setVoidReason('');
  }, [open, entry]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const choices = categories.filter(
    (category) =>
      category.kind === (form.type === 'in' ? 'income' : 'expense') &&
      (category.active || String(category._id) === form.category),
  );

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setDetails({});

    const body = { ...form, amount: Number(form.amount) };

    try {
      if (entry) {
        await api(`/api/transactions/${entry._id}`, { method: 'PATCH', body });
      } else {
        await api('/api/transactions', { method: 'POST', body });
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err.message);
      setDetails(err.details ?? {});
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
              : 'Saved entries wait for an auditor before they count.'}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving' : entry ? 'Save changes' : 'Record entry'}
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
