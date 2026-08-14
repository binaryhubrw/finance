'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { qs } from '@/lib/api';
import { ACTIONS, ACTION_LABELS, FIELD_LABELS } from '@/lib/enums';
import { formatDateTime, money } from '@/lib/format';

const ENTITY_LABELS = {
  transaction: 'Entry',
  category: 'Budget line',
  user: 'Person',
  period: 'Month',
};

const NUMERIC_FIELDS = new Set(['amount', 'monthlyBudget', 'closingBalance', 'countedCash']);

function renderValue(field, value) {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value.originalName ? `"${value.originalName}"` : 'a file';
  }
  if (NUMERIC_FIELDS.has(field) && typeof value === 'number') return money(value);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  if (/^[a-f0-9]{24}$/.test(text)) return 'another record';
  return text;
}

export default function AuditTrail({ entries, people, values, pages, page }) {
  const router = useRouter();
  const [open, setOpen] = useState(null);

  const apply = (next) => router.push(`/audit${qs({ ...values, ...next, page: 1 })}`);

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 px-3 py-3 nav:grid-cols-4">
        <div>
          <label htmlFor="audit-actor" className="label mb-1.5 block">
            Person
          </label>
          <select
            id="audit-actor"
            className="field"
            value={values.actor}
            onChange={(event) => apply({ actor: event.target.value })}
          >
            <option value="">Anyone</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="audit-action" className="label mb-1.5 block">
            Action
          </label>
          <select
            id="audit-action"
            className="field"
            value={values.action}
            onChange={(event) => apply({ action: event.target.value })}
          >
            <option value="">All actions</option>
            {ACTIONS.map((action) => (
              <option key={action} value={action}>
                {ACTION_LABELS[action]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="audit-from" className="label mb-1.5 block">
            From
          </label>
          <input
            id="audit-from"
            type="date"
            className="field field-num"
            value={values.from}
            onChange={(event) => apply({ from: event.target.value })}
          />
        </div>

        <div>
          <label htmlFor="audit-to" className="label mb-1.5 block">
            To
          </label>
          <input
            id="audit-to"
            type="date"
            className="field field-num"
            value={values.to}
            onChange={(event) => apply({ to: event.target.value })}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="t min-w-[720px]">
          <thead>
            <tr>
              <th scope="col" className="w-[176px]">When</th>
              <th scope="col" className="w-[150px]">Who</th>
              <th scope="col" className="w-[120px]">Action</th>
              <th scope="col">What changed</th>
              <th scope="col" className="w-[92px]" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id}>
                <td className="num whitespace-nowrap text-[12px] text-ink-soft">{formatDateTime(entry.at)}</td>
                <td className="text-[13px]">{entry.actorName || 'Unknown'}</td>
                <td>
                  <span className="label">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                  <p className="label label-quiet mt-1">
                    {ENTITY_LABELS[entry.entity] ?? entry.entity}
                  </p>
                </td>
                <td>
                  <p className="text-[13px]">{entry.summary}</p>
                  {entry.changes?.length ? (
                    <ul className="mt-1.5 space-y-0.5">
                      {entry.changes.map((change, index) => (
                        <li
                          key={`${entry._id}-${change.field}-${index}`}
                          className="font-mono text-[12px] text-ink-soft"
                        >
                          {FIELD_LABELS[change.field] ?? change.field}:{' '}
                          {renderValue(change.field, change.from)} →{' '}
                          <span className="text-ink">{renderValue(change.field, change.to)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {open === entry._id ? (
                    <pre className="mt-2 max-h-72 overflow-auto rounded-sm bg-sunk p-3 font-mono text-[11px] leading-relaxed text-ink-soft">
                      {JSON.stringify(entry.snapshot ?? {}, null, 2)}
                    </pre>
                  ) : null}
                </td>
                <td className="text-right">
                  {entry.snapshot ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      aria-expanded={open === entry._id}
                      onClick={() => setOpen(open === entry._id ? null : entry._id)}
                    >
                      {open === entry._id ? 'Hide' : 'Snapshot'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}

            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-[13px] text-ink-soft">
                  No actions match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="label">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={page <= 1}
              onClick={() => router.push(`/audit${qs({ ...values, page: page - 1 })}`)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={page >= pages}
              onClick={() => router.push(`/audit${qs({ ...values, page: page + 1 })}`)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
