import Category from '@/models/Category';
import { handler } from '@/lib/http';
import { requireRole } from '@/lib/session';
import { IMPORT_COLUMNS } from '@/lib/import';
import { buildWorkbook, header, styled } from '@/lib/xlsx-write';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The import template, as a workbook rather than a CSV. It carries the budget
 * lines on a second sheet, so the names that have to match exactly can be
 * copied rather than retyped.
 */
export const GET = handler(async () => {
  await requireRole('accountant', 'admin');

  const categories = await Category.find({ active: true }).sort({ kind: 1, name: 1 }).lean();
  const anIncome = categories.find((c) => c.kind === 'income')?.name ?? 'Grants & donations';
  const anExpense = categories.find((c) => c.kind === 'expense')?.name ?? 'Rent';
  const today = new Date();

  const entries = {
    name: 'Entries',
    widths: [13, 12, 14, 26, 34, 24, 16, 18, 26, 26],
    rows: [
      header(IMPORT_COLUMNS.map((column) => column.label)),
      [
        today,
        'out',
        styled(45000, 'money'),
        anExpense,
        'Printer toner',
        'Simba Supermarket',
        'Cash',
        'RCPT-104',
        '',
        '',
      ],
      [
        today,
        'in',
        styled(120000, 'money'),
        anIncome,
        'Desk fees for March',
        'Various members',
        'Mobile money',
        'MOMO-8831',
        '',
        '',
      ],
    ],
  };

  const guide = {
    name: 'Budget lines',
    widths: [34, 14],
    rows: [
      header(['Budget line', 'Direction']),
      ...categories.map((category) => [category.name, category.kind === 'income' ? 'in' : 'out']),
      [],
      [styled('How to fill this in', 'bold')],
      ...IMPORT_COLUMNS.map((column) => [
        `${column.label}${column.required ? ' (required)' : ''}`,
        column.hint,
      ]),
    ],
  };

  const file = buildWorkbook([entries, guide]);

  return new Response(file, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': String(file.length),
      'Content-Disposition': 'attachment; filename="hub-ledger-import-template.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
});
