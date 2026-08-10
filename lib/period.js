import ClosedPeriod from '../models/ClosedPeriod.js';
import { conflict } from './http.js';

export const monthStart = (year, month) => new Date(Date.UTC(year, month - 1, 1));
/** Exclusive end — the first instant of the following month. */
export const monthEnd = (year, month) => new Date(Date.UTC(year, month, 1));

export function monthLabel(year, month) {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthStart(year, month));
}

export function partsOf(date) {
  const d = date instanceof Date ? date : new Date(date);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export async function isMonthClosed(year, month) {
  const found = await ClosedPeriod.findOne({ year, month }).lean();
  return Boolean(found);
}

/**
 * Refuses any write dated inside a closed month. Runs before create, edit, void
 * and approve.
 */
export async function assertPeriodOpen(date) {
  if (!date) return;
  const { year, month } = partsOf(date);
  if (await isMonthClosed(year, month)) {
    throw conflict(
      `${monthLabel(year, month)} is closed. Record the correction in an open month instead.`,
    );
  }
}
