/**
 * Named amounts that fold into an entry's total — a delivery fee, a bank
 * charge, VAT. The transaction's `amount` is always the total, so nothing that
 * sums money needs to know these exist; the base amount is derived by taking
 * them back off.
 */

export const MAX_EXTRAS = 10;

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * Checks a list from the client. Returns { extras, total, error } where total
 * is the base plus every extra, and error is a message when something is wrong.
 */
export function foldExtras(base, raw) {
  const amount = Number(base);
  if (!Number.isFinite(amount) || amount < 0.01) {
    return { error: 'Enter an amount greater than zero.' };
  }

  if (raw === undefined || raw === null || raw === '') {
    return { extras: undefined, total: round2(amount) };
  }
  if (!Array.isArray(raw)) {
    return { error: 'The additional charges are not in a form the app can read.' };
  }

  // An empty list means the same as no list — do not store an empty array.
  const rows = raw.filter((row) => row && (String(row.label ?? '').trim() || row.amount !== ''));
  if (!rows.length) return { extras: undefined, total: round2(amount) };

  if (rows.length > MAX_EXTRAS) {
    return { error: `Add at most ${MAX_EXTRAS} additional charges to one entry.` };
  }

  const extras = [];
  for (const row of rows) {
    const label = String(row.label ?? '').trim();
    const value = Number(row.amount);

    if (!label) return { error: 'Give every additional charge a name.' };
    if (label.length > 120) return { error: 'Keep each charge name under 120 characters.' };
    if (!Number.isFinite(value) || value < 0.01) {
      return { error: `Enter an amount greater than zero for “${label}”.` };
    }
    extras.push({ label, amount: round2(value) });
  }

  const total = round2(extras.reduce((sum, row) => sum + row.amount, amount));
  return { extras, total };
}

/** The amount before any extras were added. */
export const baseOf = (entry) =>
  round2((entry?.amount ?? 0) - (entry?.extras ?? []).reduce((sum, row) => sum + row.amount, 0));
