import { handler, searchParams } from '@/lib/http';
import { requireUser } from '@/lib/session';
import { reportSummary } from '@/lib/queries';
import { METHOD_LABELS } from '@/lib/enums';
import { buildWorkbook, header, styled } from '@/lib/xlsx-write';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CURRENCY = process.env.CURRENCY || 'RWF';

const monthName = (year, month) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

const monthsBetween = (from, to) => {
  if (!from || !to) return 1;
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(
    1,
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) + 1,
  );
};

/**
 * The whole report as one workbook — a sheet per table, rather than four
 * separate CSVs that lose their formatting the moment they are opened.
 * Everyone who can read the reports screen can download it.
 */
export const GET = handler(async (request) => {
  await requireUser();

  const params = searchParams(request);
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const summary = await reportSummary({ from, to });

  const spending = summary.byCategory.filter((row) => row.type === 'out');
  const income = summary.byCategory.filter((row) => row.type === 'in');
  const spendTotal = spending.reduce((sum, row) => sum + row.total, 0);
  const incomeTotal = income.reduce((sum, row) => sum + row.total, 0);
  const months = monthsBetween(from, to);
  const share = (value, total) => (total > 0 ? value / total : 0);

  const range = from && to ? `${from} to ${to}` : 'All time';
  // Matches the screen: a range reaching today shows where the balance stands,
  // not a closing figure.
  const stillOpen = !to || to >= new Date().toISOString().slice(0, 10);
  const balanceLabel = stillOpen ? 'Current balance' : 'Closing balance';

  const overview = {
    name: 'Summary',
    widths: [30, 20],
    freezeHeader: false,
    rows: [
      [styled('UR Binary Hub — Finance report', 'bold')],
      [styled('Range', 'bold'), range],
      [styled('Currency', 'bold'), CURRENCY],
      [styled('Prepared', 'bold'), new Date()],
      [],
      [styled('Figure', 'header'), styled(`Amount (${CURRENCY})`, 'header')],
      ['Opening balance', styled(summary.openingBalance, 'money')],
      ['Money in', styled(summary.moneyIn, 'money')],
      ['Money out', styled(summary.moneyOut, 'money')],
      ['Net', styled(summary.net, 'money')],
      [styled(balanceLabel, 'bold'), styled(summary.closingBalance, 'boldMoney')],
      [],
      ['Approved entries', summary.transactionCount],
      ['Still pending', summary.pending.count],
      ['Pending value', styled(summary.pending.amount, 'money')],
      [],
      ['Approved entries only. Pending entries are excluded from every figure above.'],
    ],
  };

  const spendingSheet = {
    name: 'Spending',
    widths: [34, 12, 18, 12, 18],
    rows: [
      header(['Budget line', 'Entries', `Amount (${CURRENCY})`, 'Share', 'Budget for range']),
      ...spending.map((row) => [
        row.name,
        row.count,
        styled(row.total, 'money'),
        styled(share(row.total, spendTotal), 'percent'),
        row.monthlyBudget ? styled(row.monthlyBudget * months, 'money') : '',
      ]),
      [styled('Total', 'bold'), '', styled(spendTotal, 'boldMoney'), '', ''],
    ],
  };

  const incomeSheet = {
    name: 'Income',
    widths: [34, 12, 18, 12],
    rows: [
      header(['Budget line', 'Entries', `Amount (${CURRENCY})`, 'Share']),
      ...income.map((row) => [
        row.name,
        row.count,
        styled(row.total, 'money'),
        styled(share(row.total, incomeTotal), 'percent'),
      ]),
      [styled('Total', 'bold'), '', styled(incomeTotal, 'boldMoney'), ''],
    ],
  };

  const methodsSheet = {
    name: 'Payment methods',
    widths: [22, 16, 12, 18],
    rows: [
      header(['Method', 'Direction', 'Entries', `Amount (${CURRENCY})`]),
      ...summary.byMethod.map((row) => [
        METHOD_LABELS[row.method] ?? row.method,
        row.type === 'in' ? 'Money in' : 'Money out',
        row.count,
        styled(row.total, 'money'),
      ]),
    ],
  };

  const monthsSheet = {
    name: 'Month by month',
    widths: [22, 12, 18, 18, 18],
    rows: [
      header([
        'Month',
        'Entries',
        `Money in (${CURRENCY})`,
        `Money out (${CURRENCY})`,
        `Net (${CURRENCY})`,
      ]),
      ...summary.byMonth.map((row) => [
        monthName(row.year, row.month),
        row.count,
        styled(row.moneyIn, 'money'),
        styled(row.moneyOut, 'money'),
        styled(row.net, 'money'),
      ]),
      [
        styled('Total', 'bold'),
        '',
        styled(summary.moneyIn, 'boldMoney'),
        styled(summary.moneyOut, 'boldMoney'),
        styled(summary.net, 'boldMoney'),
      ],
    ],
  };

  const file = buildWorkbook([overview, spendingSheet, incomeSheet, methodsSheet, monthsSheet]);
  const name = `hub-finance-report-${from || 'all'}-to-${to || 'today'}.xlsx`;

  return new Response(file, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': String(file.length),
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
});
