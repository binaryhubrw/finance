import { METHODS, METHOD_LABELS } from './enums.js';

/**
 * Turns a spreadsheet grid into entries ready for the ledger. Pure — the caller
 * supplies the budget lines and the closed months, which keeps it easy to run
 * as a dry run before anything is written.
 */

export const MAX_ROWS = 500;

export const IMPORT_COLUMNS = [
  { key: 'date', label: 'Date', required: true, hint: 'dd/mm/yyyy — the day the money moved' },
  { key: 'type', label: 'Direction', required: true, hint: '"in" or "out"' },
  { key: 'amount', label: 'Amount', required: true, hint: 'Digits only, no currency code' },
  { key: 'category', label: 'Budget line', required: true, hint: 'Must match a line exactly' },
  { key: 'description', label: 'Description', required: true, hint: 'What the entry is for' },
  { key: 'payee', label: 'Paid to or received from', required: false, hint: '' },
  { key: 'method', label: 'Method', required: false, hint: 'Cash, Mobile money, Bank, Other' },
  { key: 'reference', label: 'Reference', required: false, hint: 'Receipt or MoMo number' },
  { key: 'receiptUrl', label: 'Receipt link', required: false, hint: 'A link to the photo' },
  { key: 'note', label: 'Note', required: false, hint: '' },
];

const ALIASES = {
  date: ['date', 'day', 'transactiondate', 'entrydate'],
  type: ['direction', 'type', 'inout', 'moneyinout', 'flow'],
  amount: ['amount', 'value', 'total', 'sum'],
  category: ['budgetline', 'category', 'line', 'account', 'budget'],
  description: ['description', 'details', 'narration', 'particulars', 'item'],
  payee: ['paidtoorreceivedfrom', 'paidtoreceivedfrom', 'payee', 'paidto', 'receivedfrom', 'supplier', 'vendor'],
  method: ['method', 'paymentmethod', 'payment', 'paidby'],
  reference: ['reference', 'ref', 'receiptnumber', 'receiptno', 'voucher', 'transactionid'],
  receiptUrl: ['receiptlink', 'receipturl', 'receipt', 'link', 'attachment'],
  note: ['note', 'notes', 'comment', 'remarks'],
};

const normalise = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/* ------------------------------------------------------------ field parsers */

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function parseDate(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  // Excel hands over a serial number when the cell is formatted as a date.
  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 20 && serial < 80000) {
      const date = new Date(EXCEL_EPOCH + Math.floor(serial) * 86_400_000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (iso) return utc(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // Day first: the hub reads dates the British way, as the rest of the app does.
  const slashed = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(value);
  if (slashed) {
    const day = Number(slashed[1]);
    const month = Number(slashed[2]);
    const year = Number(slashed[3].length === 2 ? `20${slashed[3]}` : slashed[3]);
    return utc(year, month, day);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return utc(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return null;
}

function utc(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? date : null;
}

export function parseAmount(raw) {
  let value = String(raw ?? '')
    .replace(/[a-z\s ']/gi, '')
    .replace(/[()]/g, '');
  if (!value) return null;

  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    // Whichever comes last is the decimal mark; the other groups thousands.
    value =
      lastComma > lastDot
        ? value.replace(/\./g, '').replace(',', '.')
        : value.replace(/,/g, '');
  } else if (lastComma > -1) {
    const decimals = value.length - lastComma - 1;
    value = decimals === 3 ? value.replace(/,/g, '') : value.replace(',', '.');
  }

  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round((Math.abs(number) + Number.EPSILON) * 100) / 100;
}

export function parseType(raw) {
  const value = normalise(raw);
  if (['in', 'moneyin', 'income', 'credit', 'received', 'cashin', 'plus'].includes(value)) return 'in';
  if (['out', 'moneyout', 'expense', 'debit', 'paid', 'payment', 'cashout', 'minus'].includes(value)) {
    return 'out';
  }
  return null;
}

export function parseMethod(raw) {
  const value = normalise(raw);
  if (!value) return 'cash';
  if (METHODS.includes(value)) return value;
  if (['mobilemoney', 'momo', 'mtn', 'airtel', 'mobile'].includes(value)) return 'mobile_money';
  if (['bank', 'transfer', 'banktransfer', 'cheque', 'check', 'eft'].includes(value)) return 'bank';
  if (['cash'].includes(value)) return 'cash';
  if (['other', 'others'].includes(value)) return 'other';
  return null;
}

/* --------------------------------------------------------------- the sheet */

/** Finds the header row and maps each of our fields onto a column index. */
export function mapColumns(grid) {
  for (let index = 0; index < Math.min(grid.length, 20); index += 1) {
    const cells = grid[index].map(normalise);
    const columns = {};

    for (const [key, aliases] of Object.entries(ALIASES)) {
      const position = cells.findIndex((cell) => cell && aliases.includes(cell));
      if (position > -1) columns[key] = position;
    }

    const required = ['date', 'type', 'amount', 'category', 'description'];
    if (required.every((key) => columns[key] !== undefined)) {
      return { headerRow: index, columns };
    }
  }
  return null;
}

/**
 * Checks every row against the same rules the single-entry form enforces.
 * Returns one result per row, in file order.
 */
export function reviewImport({ grid, categories, closedMonths = new Set(), now = new Date() }) {
  const mapping = mapColumns(grid);
  if (!mapping) {
    return {
      error:
        'The sheet needs a header row with Date, Direction, Amount, Budget line and Description. Download the template to see the layout.',
      rows: [],
    };
  }

  const { headerRow, columns } = mapping;
  const byName = new Map(categories.map((category) => [normalise(category.name), category]));
  const rows = [];

  const body = grid.slice(headerRow + 1);
  if (body.length > MAX_ROWS) {
    return {
      error: `That sheet holds ${body.length} rows. Import at most ${MAX_ROWS} at a time so mistakes stay easy to unpick.`,
      rows: [],
    };
  }

  body.forEach((cells, offset) => {
    const line = headerRow + offset + 2; // 1-based, as the spreadsheet numbers it
    const at = (key) => (columns[key] === undefined ? '' : (cells[columns[key]] ?? '').trim());

    // Skip rows that are entirely blank — Excel loves trailing empties.
    if (!cells.some((cell) => String(cell ?? '').trim())) return;

    const problems = [];
    const date = parseDate(at('date'));
    if (!date) problems.push(`Date "${at('date')}" is not a date the app can read`);
    else if (date.getTime() > now.getTime()) problems.push('The date is in the future');

    const type = parseType(at('type'));
    if (!type) problems.push(`Direction "${at('type')}" should be "in" or "out"`);

    const amount = parseAmount(at('amount'));
    if (amount === null) problems.push(`Amount "${at('amount')}" is not a number`);
    else if (amount < 0.01) problems.push('The amount must be greater than zero');

    const description = at('description');
    if (!description) problems.push('Description is empty');
    else if (description.length > 300) problems.push('Description is longer than 300 characters');

    const category = byName.get(normalise(at('category')));
    if (!at('category')) problems.push('Budget line is empty');
    else if (!category) problems.push(`Budget line "${at('category')}" is not on the list`);
    else if (!category.active) problems.push(`Budget line "${category.name}" is no longer in use`);
    else if (type && category.kind !== (type === 'in' ? 'income' : 'expense')) {
      problems.push(`"${category.name}" is an ${category.kind} line, so it cannot take money ${type === 'in' ? 'in' : 'out'}`);
    }

    const method = parseMethod(at('method'));
    if (!method) {
      problems.push(
        `Method "${at('method')}" should be one of ${METHODS.map((m) => METHOD_LABELS[m]).join(', ')}`,
      );
    }

    if (date) {
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
      if (closedMonths.has(key)) problems.push('That month is closed');
    }

    const note = at('note');
    if (note.length > 500) problems.push('Note is longer than 500 characters');

    rows.push({
      line,
      ok: problems.length === 0,
      problems,
      preview: {
        date: date ? date.toISOString().slice(0, 10) : at('date'),
        type,
        amount,
        category: category?.name ?? at('category'),
        description,
      },
      entry:
        problems.length === 0
          ? {
              date,
              type,
              amount,
              category: category._id,
              description,
              payee: at('payee').slice(0, 160),
              method,
              reference: at('reference').slice(0, 120),
              receiptUrl: at('receiptUrl').slice(0, 500),
              note,
            }
          : null,
    });
  });

  if (!rows.length) {
    return { error: 'That sheet has a header but no entries under it.', rows: [] };
  }

  return { error: null, rows };
}
