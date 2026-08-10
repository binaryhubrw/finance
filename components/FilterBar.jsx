'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { qs } from '@/lib/api';
import { METHOD_LABELS, METHODS, STATUSES, STATUS_LABELS } from '@/lib/enums';

/**
 * Filters live in the URL so a view can be shared or bookmarked. The running
 * balance only survives date filters, which the ledger explains on screen.
 */
export default function FilterBar({ basePath = '/ledger', values, categories, people = [] }) {
  const router = useRouter();
  const [form, setForm] = useState(values);

  const apply = (next) => {
    setForm(next);
    router.push(`${basePath}${qs({ ...next, page: 1 })}`);
  };

  const set = (key) => (event) => apply({ ...form, [key]: event.target.value });

  const onSearch = (event) => {
    event.preventDefault();
    apply(form);
  };

  const clear = () =>
    apply({
      from: values.from,
      to: values.to,
      type: '',
      method: '',
      status: '',
      category: '',
      recordedBy: '',
      search: '',
    });

  const filtered =
    form.type || form.method || form.status || form.category || form.recordedBy || form.search;

  return (
    <form onSubmit={onSearch} className="card px-3 py-3">
      <div className="grid gap-3 nav:grid-cols-4">
        <div>
          <label htmlFor="filter-from" className="label mb-1.5 block">
            From
          </label>
          <input
            id="filter-from"
            type="date"
            className="field field-num"
            value={form.from}
            onChange={set('from')}
          />
        </div>

        <div>
          <label htmlFor="filter-to" className="label mb-1.5 block">
            To
          </label>
          <input
            id="filter-to"
            type="date"
            className="field field-num"
            value={form.to}
            onChange={set('to')}
          />
        </div>

        <div>
          <label htmlFor="filter-type" className="label mb-1.5 block">
            Direction
          </label>
          <select id="filter-type" className="field" value={form.type} onChange={set('type')}>
            <option value="">All</option>
            <option value="in">Money in</option>
            <option value="out">Money out</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-category" className="label mb-1.5 block">
            Budget line
          </label>
          <select
            id="filter-category"
            className="field"
            value={form.category}
            onChange={set('category')}
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={String(category._id)} value={String(category._id)}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-method" className="label mb-1.5 block">
            Method
          </label>
          <select id="filter-method" className="field" value={form.method} onChange={set('method')}>
            <option value="">All</option>
            {METHODS.map((method) => (
              <option key={method} value={method}>
                {METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-status" className="label mb-1.5 block">
            Status
          </label>
          <select id="filter-status" className="field" value={form.status} onChange={set('status')}>
            <option value="">All</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        {people.length > 0 ? (
          <div>
            <label htmlFor="filter-person" className="label mb-1.5 block">
              Recorded by
            </label>
            <select
              id="filter-person"
              className="field"
              value={form.recordedBy}
              onChange={set('recordedBy')}
            >
              <option value="">Anyone</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="filter-search" className="label mb-1.5 block">
            Search
          </label>
          <div className="flex gap-2">
            <input
              id="filter-search"
              type="search"
              className="field"
              placeholder="Description or reference"
              value={form.search}
              onChange={(event) => setForm({ ...form, search: event.target.value })}
            />
            <button type="submit" className="btn">
              Find
            </button>
          </div>
        </div>
      </div>

      {filtered ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-rule pt-3">
          <p className="text-[12px] text-ink-soft">
            Filtered view — the running balance is hidden because it only makes sense over a
            complete date range.
          </p>
          <button type="button" className="btn btn-sm" onClick={clear}>
            Clear filters
          </button>
        </div>
      ) : null}
    </form>
  );
}
