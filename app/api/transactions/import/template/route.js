import Category from '@/models/Category';
import { handler } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { IMPORT_COLUMNS } from '@/lib/import';
import { METHODS, METHOD_LABELS } from '@/lib/enums';
import { buildWorkbook, header, styled } from '@/lib/xlsx-write';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Enough room to fill in without the dropdowns running out.
const ROWS = 200;

/**
 * The import template. The three fields with a fixed set of answers —
 * direction, budget line and method — are dropdowns, so the names that have to
 * match are picked rather than typed. The lists live on a second sheet, which
 * is also how the budget lines stay readable.
 */
export const GET = handler(async () => {
  await requireRole('initiator', 'admin');

  const categories = await Category.find({ active: true }).sort({ kind: 1, name: 1 }).lean();
  const anIncome = categories.find((c) => c.kind === 'income')?.name ?? 'Grants & donations';
  const anExpense = categories.find((c) => c.kind === 'expense')?.name ?? 'Rent';
  const today = new Date();

  const columnOf = (key) => {
    const index = IMPORT_COLUMNS.findIndex((column) => column.key === key);
    return String.fromCharCode(65 + index);
  };
  const dir = columnOf('type');
  const line = columnOf('category');
  const method = columnOf('method');

  const entries = {
    name: 'Entries',
    widths: [13, 14, 14, 30, 34, 24, 17, 18, 26, 26],
    rows: [
      header(IMPORT_COLUMNS.map((column) => column.label)),
      [today, 'out', styled(45000, 'money'), anExpense, 'Printer toner', 'Simba Supermarket', 'Cash', 'RCPT-104', '', ''],
      [today, 'in', styled(120000, 'money'), anIncome, 'Desk fees for March', 'Various members', 'Mobile money', 'MOMO-8831', '', ''],
    ],
    validations: [
      {
        range: `${dir}2:${dir}${ROWS}`,
        formula: '"in,out"',
        title: 'Direction',
        message: 'Type in for money coming in, or out for money going out.',
      },
      {
        range: `${line}2:${line}${ROWS}`,
        // Points at the list on the second sheet, so long names and ampersands
        // survive where an inline list would not.
        formula: `'Lists'!$A$2:$A$${categories.length + 1}`,
        title: 'Budget line',
        message: 'Pick a budget line from the Lists sheet. It has to match exactly.',
      },
      {
        range: `${method}2:${method}${ROWS}`,
        formula: `"${METHODS.map((m) => METHOD_LABELS[m]).join(',')}"`,
        title: 'Method',
        message: 'Choose Cash, Mobile money, Bank or Other.',
      },
    ],
  };

  const lists = {
    name: 'Lists',
    widths: [34, 14, 34],
    rows: [
      header(['Budget line', 'Direction', 'How to fill the Entries sheet']),
      ...categories.map((category, index) => [
        category.name,
        category.kind === 'income' ? 'in' : 'out',
        IMPORT_COLUMNS[index]
          ? `${IMPORT_COLUMNS[index].label}${IMPORT_COLUMNS[index].required ? ' (required)' : ''} — ${IMPORT_COLUMNS[index].hint || 'optional'}`
          : '',
      ]),
    ],
  };

  const file = buildWorkbook([entries, lists]);

  return new Response(file, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': String(file.length),
      'Content-Disposition': 'attachment; filename="hub-ledger-import-template.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
});
