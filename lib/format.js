export const CURRENCY = process.env.CURRENCY || 'RWF';

const whole = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fractional = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 45000 -> "45,000"; 45000.5 -> "45,000.50". Bare number, no currency code. */
export function money(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '—';
  return Math.abs(n % 1) < 0.005 ? whole.format(n) : fractional.format(n);
}

export function moneyWithCurrency(value) {
  return `${money(value)} ${CURRENCY}`;
}

export function signedMoney(value) {
  const n = Number(value ?? 0);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${money(Math.abs(n))}`;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});
const monthFmt = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const toDate = (value) => (value instanceof Date ? value : new Date(value));

export function formatDate(value) {
  if (!value) return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}

export function formatDay(value) {
  if (!value) return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : dayFmt.format(d);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d);
}

export function formatMonth(year, month) {
  return monthFmt.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** yyyy-mm-dd, in UTC, for <input type="date"> */
export function toInputDate(value) {
  const d = value ? toDate(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function monthRangeInputs(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { from: toInputDate(start), to: toInputDate(end) };
}

export function relativeDays(value) {
  if (!value) return '';
  const days = Math.floor((Date.now() - toDate(value).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}

/* ---------- CSV ---------- */

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** rows: array of arrays. Amounts must be passed as bare numbers. */
export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename, headers, rows) {
  const blob = new Blob([`﻿${toCsv(headers, rows)}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
