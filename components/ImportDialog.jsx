'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { downloadCsv, money, toInputDate } from '@/lib/format';
import { IMPORT_COLUMNS } from '@/lib/import';
import Modal from '@/components/Modal';

const today = () => toInputDate(new Date()).split('-').reverse().join('/');

export default function ImportDialog({ open, onClose, categories }) {
  const router = useRouter();
  const input = useRef(null);
  const [state, setState] = useState({ status: 'idle' });
  const [file, setFile] = useState(null);

  const active = categories.filter((category) => category.active);
  const anIncomeLine = active.find((c) => c.kind === 'income')?.name ?? 'Grants & donations';
  const anExpenseLine = active.find((c) => c.kind === 'expense')?.name ?? 'Rent';

  const reset = () => {
    setState({ status: 'idle' });
    setFile(null);
    if (input.current) input.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  function downloadTemplate() {
    downloadCsv(
      'hub-ledger-import-template.csv',
      IMPORT_COLUMNS.map((column) => column.label),
      [
        [today(), 'out', 45000, anExpenseLine, 'Printer toner', 'Simba Supermarket', 'Cash', 'RCPT-104', '', ''],
        [today(), 'in', 120000, anIncomeLine, 'Desk fees for March', 'Various members', 'Mobile money', 'MOMO-8831', '', ''],
      ],
    );
  }

  async function send(chosen, dryRun) {
    const body = new FormData();
    body.append('file', chosen);
    body.append('dryRun', String(dryRun));

    const response = await fetch('/api/transactions/import', { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'That file could not be read.');
      error.payload = data;
      throw error;
    }
    return data;
  }

  async function onFile(event) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    setFile(chosen);
    setState({ status: 'checking' });
    try {
      const result = await send(chosen, true);
      setState({ status: 'checked', result });
    } catch (err) {
      setState({ status: 'failed', error: err.message });
    }
  }

  async function commit() {
    setState((current) => ({ ...current, status: 'importing' }));
    try {
      const result = await send(file, false);
      setState({ status: 'done', result });
      router.refresh();
    } catch (err) {
      setState({ status: 'checked', result: state.result, error: err.message });
    }
  }

  const result = state.result;
  const ready = result && result.problems === 0;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import entries from a spreadsheet"
      description="Every row lands as pending, exactly as if it had been typed in one at a time."
      width={860}
    >
      {state.status === 'done' ? (
        <div>
          <p className="text-[16px] font-semibold tracking-[-0.02em]">
            {state.result.imported} {state.result.imported === 1 ? 'entry' : 'entries'} imported
            from {state.result.filename}.
          </p>
          <p className="mt-2 text-[13px] text-ink-soft">
            They are waiting for an auditor. None of them counts towards the balance yet.
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" className="btn btn-primary" onClick={close}>
              Back to the ledger
            </button>
            <button type="button" className="btn" onClick={reset}>
              Import another sheet
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="rounded-sm border border-rule bg-sunk px-3 py-3">
            <p className="label">How it works</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[13px] text-ink-soft">
              <li>Download the template and fill in one row per entry.</li>
              <li>Budget lines have to match the names below exactly.</li>
              <li>Upload it here to see what will happen before anything is saved.</li>
            </ol>
            <button type="button" className="btn btn-sm mt-3" onClick={downloadTemplate}>
              Download template
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label mb-1.5">Columns</p>
              <ul className="space-y-0.5">
                {IMPORT_COLUMNS.map((column) => (
                  <li key={column.key} className="text-[12px] text-ink-soft">
                    <span className="text-ink">{column.label}</span>
                    {column.required ? ' · required' : ''}
                    {column.hint ? ` — ${column.hint}` : ''}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label mb-1.5">Budget lines in use</p>
              <ul className="max-h-48 space-y-0.5 overflow-y-auto pr-1">
                {active.map((category) => (
                  <li key={category._id} className="text-[12px] text-ink-soft">
                    <span className="text-ink">{category.name}</span> ·{' '}
                    {category.kind === 'income' ? 'in' : 'out'}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 border-t border-rule pt-4">
            <label htmlFor="import-file" className="label mb-1.5 block">
              Spreadsheet
            </label>
            <input
              id="import-file"
              ref={input}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={onFile}
              className="field file:mr-3 file:rounded-sm file:border file:border-rule-strong file:bg-surface file:px-2 file:py-1 file:text-[12px]"
            />
            <p className="mt-1 text-[12px] text-ink-soft">
              .xlsx straight from Excel, Numbers or Google Sheets, or a .csv. Up to 2MB.
            </p>
          </div>

          {state.status === 'checking' ? (
            <p className="mt-4 text-[13px] text-ink-soft">Reading the sheet…</p>
          ) : null}

          {state.error ? (
            <p
              role="alert"
              className="mt-4 rounded-sm border border-debit/40 bg-debit/5 px-3 py-2 text-[13px] text-debit"
            >
              {state.error}
            </p>
          ) : null}

          {result ? (
            <div className="mt-4">
              <p className="text-[13px]">
                {result.total} {result.total === 1 ? 'row' : 'rows'} read from {result.filename}.{' '}
                {ready ? (
                  <span className="text-credit">All of them are ready to import.</span>
                ) : (
                  <span className="text-debit">
                    {result.problems} need fixing — nothing will be imported until they are sorted.
                  </span>
                )}
              </p>

              <div className="mt-3 max-h-72 overflow-auto rounded-sm border border-rule">
                <table className="t">
                  <thead>
                    <tr>
                      <th scope="col" className="w-[52px]">Row</th>
                      <th scope="col" className="w-[104px]">Date</th>
                      <th scope="col">Description</th>
                      <th scope="col" className="w-[120px] text-right">Amount</th>
                      <th scope="col" className="w-[230px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row.line}>
                        <td className="num text-[12px] text-ink-soft">{row.line}</td>
                        <td className="num whitespace-nowrap text-[12px]">{row.preview.date}</td>
                        <td>
                          <p className="text-[13px]">{row.preview.description || '—'}</p>
                          <p className="label label-quiet mt-1">
                            {row.preview.category || 'no budget line'}
                          </p>
                        </td>
                        <td
                          className={`num text-[13px] ${
                            row.preview.type === 'in' ? 'text-credit' : 'text-debit'
                          }`}
                        >
                          {row.preview.amount === null ? '—' : money(row.preview.amount)}
                        </td>
                        <td>
                          {row.ok ? (
                            <span className="badge badge-approved">Ready</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {row.problems.map((problem) => (
                                <li key={problem} className="text-[12px] text-debit">
                                  {problem}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
            <p className="text-[12px] text-ink-soft">
              Nothing is written until you confirm, and each import is written to the audit trail.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!ready || state.status === 'importing'}
                onClick={commit}
              >
                {state.status === 'importing'
                  ? 'Importing'
                  : ready
                    ? `Import ${result.ready} ${result.ready === 1 ? 'entry' : 'entries'}`
                    : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
