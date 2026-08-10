'use client';

import { useRouter } from 'next/navigation';
import { formatMonth } from '@/lib/format';

/** Picks a month as YYYY-MM and puts it in the URL, so the page stays shareable. */
export default function MonthPicker({ value, months = 24 }) {
  const router = useRouter();

  const options = [];
  const now = new Date();
  for (let i = 0; i < months; i += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    options.push({ key, label: formatMonth(date.getUTCFullYear(), date.getUTCMonth() + 1) });
  }

  if (!options.some((option) => option.key === value)) {
    const [year, month] = value.split('-').map(Number);
    options.unshift({ key: value, label: formatMonth(year, month) });
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="month-picker" className="label">
        Month
      </label>
      <select
        id="month-picker"
        className="field w-[190px]"
        value={value}
        onChange={(event) => router.push(`/?month=${event.target.value}`)}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
