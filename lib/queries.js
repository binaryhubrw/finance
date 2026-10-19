import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import AuditLog from '../models/AuditLog.js';
import Comment from '../models/Comment.js';
import { plain } from './audit.js';
import { IN_FLIGHT } from './enums.js';

/** Everything still in play: approved, or on its way to being. Rejected and void are out. */
const LIVE = ['approved', ...IN_FLIGHT];

const DAY_MS = 86_400_000;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const startOfDay = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
export const endOfDay = (value) => new Date(`${String(value).slice(0, 10)}T23:59:59.999Z`);

const objectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(String(value)) : null;

/** Signed amount: money in is positive, money out negative. */
const SIGNED = { $cond: [{ $eq: ['$type', 'in'] }, '$amount', { $multiply: ['$amount', -1] }] };

export function readParams(searchParams) {
  const get = (key) => {
    const value = searchParams.get(key);
    return value && value !== 'all' ? value : '';
  };
  return {
    from: get('from'),
    to: get('to'),
    type: get('type'),
    method: get('method'),
    status: get('status'),
    category: get('category'),
    recordedBy: get('recordedBy'),
    search: get('search'),
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50)),
  };
}

export function buildFilter(params = {}) {
  const filter = {};
  if (params.from || params.to) {
    filter.date = {};
    if (params.from) filter.date.$gte = startOfDay(params.from);
    if (params.to) filter.date.$lte = endOfDay(params.to);
  }
  if (params.type) filter.type = params.type;
  if (params.method) filter.method = params.method;
  if (params.status) filter.status = params.status;
  if (params.category && objectId(params.category)) filter.category = objectId(params.category);
  if (params.recordedBy && objectId(params.recordedBy)) {
    filter.recordedBy = objectId(params.recordedBy);
  }
  if (params.search) {
    const rx = new RegExp(escapeRegex(params.search.trim()), 'i');
    filter.$or = [{ description: rx }, { payee: rx }, { reference: rx }, { note: rx }];
  }
  return filter;
}

/**
 * A running balance over a filtered subset is meaningless, so it is only computed
 * when dates are the only filter in play.
 */
export function isLedgerView(params = {}) {
  return !(
    params.type ||
    params.method ||
    params.status ||
    params.category ||
    params.recordedBy ||
    params.search
  );
}

export async function listTransactions(params = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const skip = (page - 1) * limit;
  const filter = buildFilter(params);
  const ledgerView = isLedgerView(params);
  // Newest first, like every other table in the app. The running balance below
  // is still accumulated oldest-to-newest, so each row shows the balance as it
  // stood after that entry — the column simply counts down the page.
  const sort = { date: -1, createdAt: -1, _id: -1 };

  const [total, docs, summaryFacet] = await Promise.all([
    Transaction.countDocuments(filter),
    Transaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name kind')
      .populate('recordedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .lean(),
    Transaction.aggregate([
      { $match: filter },
      {
        $facet: {
          live: [
            { $match: { status: { $in: LIVE } } },
            { $group: { _id: '$type', total: { $sum: '$amount' } } },
          ],
          approved: [
            { $match: { status: 'approved' } },
            { $group: { _id: '$type', total: { $sum: '$amount' } } },
          ],
          pending: [
            { $match: { status: { $in: IN_FLIGHT } } },
            { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
          ],
        },
      },
    ]),
  ]);

  const facet = summaryFacet[0] ?? { live: [], approved: [], pending: [] };
  const pick = (rows, key) => rows.find((r) => r._id === key)?.total ?? 0;
  const approvedIn = pick(facet.approved, 'in');
  const approvedOut = pick(facet.approved, 'out');
  const pendingRow = facet.pending[0] ?? { count: 0, amount: 0 };

  const summary = {
    moneyIn: pick(facet.live, 'in'),
    moneyOut: pick(facet.live, 'out'),
    approvedIn,
    approvedOut,
    net: approvedIn - approvedOut,
    pending: { count: pendingRow.count, amount: pendingRow.amount },
  };

  const counts = docs.length
    ? await Comment.aggregate([
        { $match: { entity: 'transaction', entityId: { $in: docs.map((doc) => doc._id) } } },
        { $group: { _id: '$entityId', count: { $sum: 1 } } },
      ])
    : [];
  const commentsBy = new Map(counts.map((row) => [String(row._id), row.count]));

  let openingBalance = 0;
  let items = docs.map((doc) => ({
    ...plain(doc),
    commentCount: commentsBy.get(String(doc._id)) ?? 0,
    runningBalance: null,
  }));

  if (ledgerView) {
    // Everything approved strictly before the range start.
    if (params.from) {
      const before = await Transaction.aggregate([
        { $match: { status: 'approved', date: { $lt: startOfDay(params.from) } } },
        { $group: { _id: null, total: { $sum: SIGNED } } },
      ]);
      openingBalance = before[0]?.total ?? 0;
    }

    // Sorted newest first, so everything past this page is older than every row
    // on it. Those entries have already moved the balance by the time the
    // bottom row of this page happens.
    const older = await Transaction.aggregate([
      { $match: filter },
      { $sort: sort },
      { $skip: skip + limit },
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: SIGNED } } },
    ]);

    let carried = openingBalance + (older[0]?.total ?? 0);

    // Walk from the bottom of the page upwards — that is chronological order.
    const walked = [...items];
    for (let i = walked.length - 1; i >= 0; i -= 1) {
      if (walked[i].status !== 'approved') continue;
      carried += walked[i].type === 'in' ? walked[i].amount : -walked[i].amount;
      walked[i] = {
        ...walked[i],
        runningBalance: Math.round((carried + Number.EPSILON) * 100) / 100,
      };
    }
    items = walked;
  }

  return {
    items,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    isLedgerView: ledgerView,
    openingBalance,
    summary,
  };
}

export async function transactionWithHistory(id) {
  if (!objectId(id)) return null;
  const doc = await Transaction.findById(id)
    .populate('category', 'name kind')
    .populate('recordedBy', 'name email')
    .populate('reviewedBy', 'name email')
    .lean();
  if (!doc) return null;
  const [history, comments] = await Promise.all([
    AuditLog.find({ entity: 'transaction', entityId: doc._id }).sort({ at: -1 }).lean(),
    Comment.find({ entity: 'transaction', entityId: doc._id }).sort({ at: -1 }).lean(),
  ]);
  return { transaction: plain(doc), history: plain(history), comments: plain(comments) };
}

/* ---------------------------------------------------------------- reports */

export async function reportSummary({ from, to } = {}) {
  const rangeMatch = {};
  if (from) rangeMatch.$gte = startOfDay(from);
  if (to) rangeMatch.$lte = endOfDay(to);
  const inRange = Object.keys(rangeMatch).length ? { date: rangeMatch } : {};

  const match = from
    ? {
        $or: [
          { status: 'approved', date: { $lt: startOfDay(from) } },
          { status: { $in: LIVE }, ...inRange },
        ],
      }
    : { status: { $in: LIVE }, ...inRange };

  const rangeApproved = [{ $match: { status: 'approved', ...inRange } }];

  const [facet] = await Transaction.aggregate([
    { $match: match },
    {
      $facet: {
        opening: from
          ? [
              { $match: { status: 'approved', date: { $lt: startOfDay(from) } } },
              { $group: { _id: null, total: { $sum: SIGNED } } },
            ]
          : [{ $match: { _id: null } }],
        totals: [
          ...rangeApproved,
          { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ],
        pending: [
          { $match: { status: { $in: IN_FLIGHT }, ...inRange } },
          { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
        ],
        byMonth: [
          ...rangeApproved,
          {
            $group: {
              _id: { year: { $year: '$date' }, month: { $month: '$date' } },
              moneyIn: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$amount', 0] } },
              moneyOut: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$amount', 0] } },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
        ],
        byCategory: [
          ...rangeApproved,
          {
            $group: {
              _id: { category: '$category', type: '$type' },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ],
        byMethod: [
          ...rangeApproved,
          {
            $group: {
              _id: { method: '$method', type: '$type' },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ],
      },
    },
  ]);

  const categories = await Category.find({}).select('name kind monthlyBudget').lean();
  const nameOf = new Map(categories.map((c) => [String(c._id), c]));

  const totalFor = (key) => facet.totals.find((r) => r._id === key)?.total ?? 0;
  const countFor = (key) => facet.totals.find((r) => r._id === key)?.count ?? 0;

  const openingBalance = facet.opening[0]?.total ?? 0;
  const moneyIn = totalFor('in');
  const moneyOut = totalFor('out');
  const pendingRow = facet.pending[0] ?? { count: 0, amount: 0 };

  return {
    from: from || null,
    to: to || null,
    openingBalance,
    moneyIn,
    moneyOut,
    net: moneyIn - moneyOut,
    closingBalance: openingBalance + moneyIn - moneyOut,
    transactionCount: countFor('in') + countFor('out'),
    pending: { count: pendingRow.count, amount: pendingRow.amount },
    byMonth: facet.byMonth.map((row) => ({
      year: row._id.year,
      month: row._id.month,
      moneyIn: row.moneyIn,
      moneyOut: row.moneyOut,
      net: row.moneyIn - row.moneyOut,
      count: row.count,
    })),
    byCategory: facet.byCategory.map((row) => {
      const category = nameOf.get(String(row._id.category));
      return {
        categoryId: String(row._id.category),
        name: category?.name ?? 'Removed budget line',
        monthlyBudget: category?.monthlyBudget ?? null,
        type: row._id.type,
        total: row.total,
        count: row.count,
      };
    }),
    byMethod: facet.byMethod.map((row) => ({
      method: row._id.method,
      type: row._id.type,
      total: row.total,
      count: row.count,
    })),
  };
}

/** Sum of every approved entry strictly before the given instant. */
export async function balanceBefore(date) {
  const rows = await Transaction.aggregate([
    { $match: { status: 'approved', date: { $lt: date } } },
    { $group: { _id: null, total: { $sum: SIGNED } } },
  ]);
  return rows[0]?.total ?? 0;
}

/** Sum of every approved entry up to and including the given instant. */
export async function balanceThrough(date) {
  const rows = await Transaction.aggregate([
    { $match: { status: 'approved', date: { $lte: date } } },
    { $group: { _id: null, total: { $sum: SIGNED } } },
  ]);
  return rows[0]?.total ?? 0;
}

/* ------------------------------------------------------------- exceptions */

const EXCEPTION_CAP = 100;
const POPULATE = [
  { path: 'category', select: 'name kind' },
  { path: 'recordedBy', select: 'name email' },
];

export async function exceptions({ from, to } = {}) {
  const range = {};
  if (from) range.$gte = startOfDay(from);
  if (to) range.$lte = endOfDay(to);
  const inRange = Object.keys(range).length ? { date: range } : {};

  const threshold = Number(process.env.LARGE_AMOUNT_THRESHOLD) || 100_000;
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);

  const [missingReceipt, editedAfterReview, largeAmounts, backdated, staleUnapproved, dupGroups] =
    await Promise.all([
      Transaction.find({
        ...inRange,
        type: 'out',
        status: { $in: LIVE },
        // No reference, no link, and no file on the server — nothing to verify against.
        $and: [
          { $or: [{ reference: '' }, { reference: { $exists: false } }, { reference: null }] },
          { $or: [{ receiptUrl: '' }, { receiptUrl: { $exists: false } }, { receiptUrl: null }] },
          { $or: [{ attachment: { $exists: false } }, { attachment: null }] },
        ],
      })
        .sort({ date: -1 })
        .limit(EXCEPTION_CAP)
        .populate(POPULATE)
        .lean(),

      Transaction.find({ ...inRange, editedAfterReview: true })
        .sort({ updatedAt: -1 })
        .limit(EXCEPTION_CAP)
        .populate(POPULATE)
        .lean(),

      Transaction.find({
        ...inRange,
        amount: { $gte: threshold },
        status: { $ne: 'void' },
      })
        .sort({ amount: -1 })
        .limit(EXCEPTION_CAP)
        .populate(POPULATE)
        .lean(),

      Transaction.find({
        ...inRange,
        status: { $ne: 'void' },
        $expr: { $gt: [{ $subtract: ['$createdAt', '$date'] }, 7 * DAY_MS] },
      })
        .sort({ date: -1 })
        .limit(EXCEPTION_CAP)
        .populate(POPULATE)
        .lean(),

      Transaction.find({ ...inRange, status: { $in: IN_FLIGHT }, createdAt: { $lt: sevenDaysAgo } })
        .sort({ date: -1 })
        .limit(EXCEPTION_CAP)
        .populate(POPULATE)
        .lean(),

      Transaction.aggregate([
        { $match: { ...inRange, status: { $ne: 'void' } } },
        {
          $group: {
            _id: { amount: '$amount', date: '$date', category: '$category' },
            ids: { $push: '$_id' },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { '_id.date': -1 } },
        { $limit: EXCEPTION_CAP },
      ]),
    ]);

  const dupIds = dupGroups.flatMap((group) => group.ids);
  const dupDocs = dupIds.length
    ? await Transaction.find({ _id: { $in: dupIds } })
        .populate(POPULATE)
        .lean()
    : [];
  const dupById = new Map(dupDocs.map((doc) => [String(doc._id), plain(doc)]));

  const possibleDuplicates = dupGroups.map((group) => ({
    key: `${group._id.amount}-${new Date(group._id.date).toISOString().slice(0, 10)}-${group._id.category}`,
    count: group.count,
    items: group.ids.map((id) => dupById.get(String(id))).filter(Boolean),
  }));

  return {
    threshold,
    missingReceipt: plain(missingReceipt),
    editedAfterReview: plain(editedAfterReview),
    largeAmounts: plain(largeAmounts),
    backdated: plain(backdated),
    possibleDuplicates,
    staleUnapproved: plain(staleUnapproved),
  };
}

/* --------------------------------------------------------------- activity */

export async function activity(days = 30) {
  const since = new Date(Date.now() - days * DAY_MS);
  const rows = await AuditLog.aggregate([
    { $match: { at: { $gte: since } } },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$at' } }, action: '$action' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.day': 1 } },
  ]);

  const byDay = new Map();
  for (const row of rows) {
    const day = row._id.day;
    const entry = byDay.get(day) ?? { day, total: 0, actions: {} };
    entry.total += row.count;
    entry.actions[row._id.action] = row.count;
    byDay.set(day, entry);
  }

  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    series.push(byDay.get(day) ?? { day, total: 0, actions: {} });
  }

  return { days, series };
}
