'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { downloadCsv, formatMonth, money } from '@/lib/format';
import { METHOD_LABELS } from '@/lib/enums';
import Money from '@/components/Money';
import Bars from '@/components/Bars';

const iso = (date) => date.toISOString().slice(0, 10);

function shortcuts() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const quarterStart = Math.floor(month / 3) * 3;

  return [
    {
      label: 'This month',
      from: iso(new Date(Date.UTC(year, month, 1))),
      to: iso(new Date(Date.UTC(year, month + 1, 0))),
    },
    {
      label: 'Last month',
      from: iso(new Date(Date.UTC(year, month - 1, 1))),
      to: iso(new Date(Date.UTC(year, month, 0))),
    },
    {
      label: 'This quarter',
      from: iso(new Date(Date.UTC(year, quarterStart, 1))),
      to: iso(new Date(Date.UTC(year, quarterStart + 3, 0))),
    },
    {
      label: 'This year',
      from: iso(new Date(Date.UTC(year, 0, 1))),
      to: iso(new Date(Date.UTC(year, 11, 31))),
    },
  ];
}

function monthsInRange(from, to) {
  if (!from || !to) return 1;
  const start = new Date(from);
  const end = new Date(to);
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    1;
  return Math.max(1, months);
}

export default function ReportView({ summary, range }) {
  const router = useRouter();
  const [form, setForm] = useState(range);

  const go = (next) => {
    setForm(next);
    router.push(`/reports?from=${next.from}&to=${next.to}`);
  };

  const spending = summary.byCategory.filter((row) => row.type === 'out');
  const income = summary.byCategory.filter((row) => row.type === 'in');
  const spendTotal = spending.reduce((sum, row) => sum + row.total, 0);
  const incomeTotal = income.reduce((sum, row) => sum + row.total, 0);
  const months = monthsInRange(range.from, range.to);

  const share = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

  const categoryRows = (rows, total) =>
    rows.map((row) => {
      const budget = row.monthlyBudget ? row.monthlyBudget * months : null;
      return {
        label: row.name,
        values: [{ name: row.categoryId, value: row.total, tone: row.type === 'in' ? 'in' : 'out' }],
        caption: budget
          ? `${share(row.total, total)}% of the total · ${money(row.total)} of a ${money(
              budget,
            )} budget (${share(row.total, budget)}% used)`
          : `${share(row.total, total)}% of the total · ${row.count} ${
              row.count === 1 ? 'entry' : 'entries'
            }`,
      };
    });

  return (
    <div className="space-y-6">
      <section className="card px-3 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="report-from" className="label mb-1.5 block">
              From
            </label>
            <input
              id="report-from"
              type="date"
              className="field field-num w-[168px]"
              value={form.from}
              onChange={(event) => setForm({ ...form, from: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="report-to" className="label mb-1.5 block">
              To
            </label>
            <input
              id="report-to"
              type="date"
              className="field field-num w-[168px]"
              value={form.to}
              onChange={(event) => setForm({ ...form, to: event.target.value })}
            />
          </div>
          <button type="button" className="btn" onClick={() => go(form)}>
            Show range
          </button>

          <div className="ml-auto flex flex-wrap gap-2">
            {shortcuts().map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                className="btn btn-sm"
                onClick={() => go({ from: shortcut.from, to: shortcut.to })}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 nav:grid-cols-5">
        <div className="card px-4 py-4">
          <p className="label">Opening balance</p>
          <p className="mt-2">
            <Money value={summary.openingBalance} />
          </p>
        </div>
        <div className="card px-4 py-4">
          <p className="label">Money in</p>
          <p className="mt-2">
            <Money value={summary.moneyIn} tone="in" />
          </p>
        </div>
        <div className="card px-4 py-4">
          <p className="label">Money out</p>
          <p className="mt-2">
            <Money value={summary.moneyOut} tone="out" />
          </p>
        </div>
        <div className="card px-4 py-4">
          <p className="label">Net</p>
          <p className="mt-2">
            <Money value={summary.net} tone={summary.net < 0 ? 'out' : 'in'} />
          </p>
        </div>
        <div className="card tint-accent border-accent/15 px-4 py-4">
          <p className="label">Closing balance</p>
          <p className="mt-2">
            <Money value={summary.closingBalance} size="xl" />
          </p>
          <p className="mt-1 text-[12px] text-ink-soft">
            {summary.transactionCount} approved
            {summary.pending.count > 0
              ? ` · ${summary.pending.count} pending worth ${money(summary.pending.amount)}`
              : ''}
          </p>
        </div>
      </section>

      <div className="grid gap-6 nav:grid-cols-2">
        <section className="card px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Spending by budget line</h2>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!spending.length}
              onClick={() =>
                downloadCsv(
                  `spending-${range.from}-to-${range.to}.csv`,
                  ['Budget line', 'Entries', 'Amount', 'Share %', 'Budget for range'],
                  spending.map((row) => [
                    row.name,
                    row.count,
                    row.total,
                    share(row.total, spendTotal),
                    row.monthlyBudget ? row.monthlyBudget * months : '',
                  ]),
                )
              }
            >
              CSV
            </button>
          </div>
          <div className="mt-3">
            <Bars
              rows={categoryRows(spending, spendTotal)}
              emptyMessage="No approved spending in this range."
            />
          </div>
        </section>

        <section className="card px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Income by budget line</h2>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!income.length}
              onClick={() =>
                downloadCsv(
                  `income-${range.from}-to-${range.to}.csv`,
                  ['Budget line', 'Entries', 'Amount', 'Share %'],
                  income.map((row) => [
                    row.name,
                    row.count,
                    row.total,
                    share(row.total, incomeTotal),
                  ]),
                )
              }
            >
              CSV
            </button>
          </div>
          <div className="mt-3">
            <Bars
              rows={categoryRows(income, incomeTotal)}
              emptyMessage="No approved income in this range."
            />
          </div>
        </section>
      </div>

      <section className="card">
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Payment methods</h2>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!summary.byMethod.length}
            onClick={() =>
              downloadCsv(
                `methods-${range.from}-to-${range.to}.csv`,
                ['Method', 'Direction', 'Entries', 'Amount'],
                summary.byMethod.map((row) => [
                  METHOD_LABELS[row.method] ?? row.method,
                  row.type === 'in' ? 'Money in' : 'Money out',
                  row.count,
                  row.total,
                ]),
              )
            }
          >
            CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="t min-w-[520px]">
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Direction</th>
                <th scope="col" className="text-right">Entries</th>
                <th scope="col" className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.byMethod.map((row) => (
                <tr key={`${row.method}-${row.type}`}>
                  <td className="text-[13px]">{METHOD_LABELS[row.method] ?? row.method}</td>
                  <td className="text-[13px] text-ink-soft">
                    {row.type === 'in' ? 'Money in' : 'Money out'}
                  </td>
                  <td className="num text-[13px]">{row.count}</td>
                  <td className="text-right">
                    <Money value={row.total} tone={row.type === 'in' ? 'in' : 'out'} />
                  </td>
                </tr>
              ))}
              {summary.byMethod.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[13px] text-ink-soft">
                    No approved entries in this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Month by month</h2>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!summary.byMonth.length}
            onClick={() =>
              downloadCsv(
                `months-${range.from}-to-${range.to}.csv`,
                ['Month', 'Entries', 'Money in', 'Money out', 'Net'],
                summary.byMonth.map((row) => [
                  formatMonth(row.year, row.month),
                  row.count,
                  row.moneyIn,
                  row.moneyOut,
                  row.net,
                ]),
              )
            }
          >
            CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="t min-w-[560px]">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="text-right">Entries</th>
                <th scope="col" className="text-right">Money in</th>
                <th scope="col" className="text-right">Money out</th>
                <th scope="col" className="text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {summary.byMonth.map((row) => (
                <tr key={`${row.year}-${row.month}`}>
                  <td className="text-[13px]">{formatMonth(row.year, row.month)}</td>
                  <td className="num text-[13px]">{row.count}</td>
                  <td className="text-right">
                    <Money value={row.moneyIn} tone="in" />
                  </td>
                  <td className="text-right">
                    <Money value={row.moneyOut} tone="out" />
                  </td>
                  <td className="text-right">
                    <Money value={row.net} tone={row.net < 0 ? 'out' : 'in'} />
                  </td>
                </tr>
              ))}
              {summary.byMonth.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[13px] text-ink-soft">
                    No approved entries in this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
