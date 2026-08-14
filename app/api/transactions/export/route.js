import { handler, searchParams } from '@/lib/http';
import { requireUser } from '@/lib/session';
import { listTransactions, readParams } from '@/lib/queries';
import { METHOD_LABELS, STATUS_LABELS } from '@/lib/enums';
import { buildWorkbook, header, styled } from '@/lib/xlsx-write';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CURRENCY = process.env.CURRENCY || 'RWF';
const MAX_ROWS = 5000;

/**
 * The ledger as it stands on screen — same filters, same order — as a workbook
 * rather than a CSV, so the figures arrive formatted instead of as bare text.
 */
export const GET = handler(async (request) => {
  await requireUser();

  const params = readParams(searchParams(request));
  const data = await listTransactions({ ...params, page: 1, limit: MAX_ROWS });

  const columns = [
    'Date',
    'Description',
    'Paid to / received from',
    'Budget line',
    'Method',
    'Status',
    'Reference',
    'Receipt file',
    `Money in (${CURRENCY})`,
    `Money out (${CURRENCY})`,
  ];
  if (data.isLedgerView) columns.push(`Balance (${CURRENCY})`);

  const rows = data.items.map((entry) => {
    const row = [
      new Date(entry.date),
      entry.description,
      entry.payee ?? '',
      entry.category?.name ?? '',
      METHOD_LABELS[entry.method] ?? entry.method,
      STATUS_LABELS[entry.status] ?? entry.status,
      entry.reference ?? '',
      entry.attachment?.originalName ?? '',
      entry.type === 'in' ? styled(entry.amount, 'money') : '',
      entry.type === 'out' ? styled(entry.amount, 'money') : '',
    ];
    // Only approved rows carry a balance; the gap is the point.
    if (data.isLedgerView) {
      row.push(entry.runningBalance === null ? '' : styled(entry.runningBalance, 'money'));
    }
    return row;
  });

  // Newest first on screen, so the opening balance closes the sheet.
  if (data.isLedgerView) {
    const opening = ['', 'Opening balance', '', '', '', '', '', '', '', ''];
    opening.push(styled(data.openingBalance, 'boldMoney'));
    rows.push(opening.map((cell, i) => (i === 1 ? styled(cell, 'bold') : cell)));
  }

  const totals = ['', 'Totals', '', '', '', '', '', ''];
  totals.push(styled(data.summary.approvedIn, 'boldMoney'));
  totals.push(styled(data.summary.approvedOut, 'boldMoney'));
  if (data.isLedgerView) totals.push('');

  const widths = [13, 40, 24, 24, 15, 12, 18, 22, 16, 16];
  if (data.isLedgerView) widths.push(16);

  const notes = [
    [],
    [styled('About this export', 'bold')],
    [`Range: ${params.from || 'all time'} to ${params.to || 'today'}`],
    [`Rows: ${data.total}${data.total > MAX_ROWS ? ` (first ${MAX_ROWS} shown)` : ''}`],
    [
      data.isLedgerView
        ? 'Balance counts approved entries only, which is why pending rows leave it blank.'
        : 'Filtered view — a running balance over a subset would be meaningless, so it is left out.',
    ],
    ['Totals count approved entries only.'],
  ];

  const file = buildWorkbook([
    {
      name: 'Ledger',
      widths,
      rows: [header(columns), ...rows, [], totals.map((c) => c), ...notes],
    },
  ]);

  const name = `hub-ledger-${params.from || 'all'}-to-${params.to || 'today'}.xlsx`;

  return new Response(file, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': String(file.length),
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
});
