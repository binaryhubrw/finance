import mongoose from 'mongoose';
import Category from '../models/Category.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import AuditLog from '../models/AuditLog.js';

/**
 * `npm run seed` — safe to run repeatedly. It never overwrites an existing
 * user's password and never touches entries that are already there.
 * `npm run seed -- --demo` adds two colleagues and a few months of traffic.
 */

const DEMO = process.argv.includes('--demo');

const CATEGORIES = [
  { name: 'Grants & donations', kind: 'income' },
  { name: 'Membership & desk fees', kind: 'income' },
  { name: 'Event & training income', kind: 'income' },
  { name: 'Other income', kind: 'income' },
  { name: 'Rent', kind: 'expense', monthlyBudget: 450000 },
  { name: 'Utilities', kind: 'expense', monthlyBudget: 120000 },
  { name: 'Internet & airtime', kind: 'expense', monthlyBudget: 180000 },
  { name: 'Salaries & stipends', kind: 'expense', monthlyBudget: 900000 },
  { name: 'Equipment & repairs', kind: 'expense', monthlyBudget: 200000 },
  { name: 'Events & catering', kind: 'expense', monthlyBudget: 250000 },
  { name: 'Transport', kind: 'expense', monthlyBudget: 80000 },
  { name: 'Supplies', kind: 'expense', monthlyBudget: 60000 },
  { name: 'Bank & mobile money charges', kind: 'expense', monthlyBudget: 25000 },
];

const DAY = 86_400_000;

/** Deterministic pseudo-random, so a reseed of a fresh database looks the same. */
let seedState = 42;
const random = () => {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
};
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max, step = 500) =>
  Math.round((min + random() * (max - min)) / step) * step;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(
      `\n  ${name} is not set. Copy .env.example to .env.local and fill it in, then run this again.\n`,
    );
    process.exit(1);
  }
  return value;
}

async function seedCategories() {
  let added = 0;
  for (const definition of CATEGORIES) {
    const existing = await Category.findOne({ name: definition.name });
    if (existing) continue;
    await Category.create({ monthlyBudget: null, ...definition });
    added += 1;
  }
  console.log(`  Budget lines: ${added} added, ${CATEGORIES.length - added} already there`);
}

async function seedAdmin() {
  const email = requireEnv('SEED_ADMIN_EMAIL').toLowerCase().trim();
  const name = process.env.SEED_ADMIN_NAME || 'Hub Admin';
  const password = requireEnv('SEED_ADMIN_PASSWORD');

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`  Administrator: ${email} already exists — password left untouched`);
    return existing;
  }

  const admin = new User({ name, email, role: 'admin' });
  await admin.setPassword(password);
  await admin.save();

  console.log(`  Administrator: created ${email}`);
  console.log('  Sign in with the password from SEED_ADMIN_PASSWORD and change it straight away.');
  return admin;
}

async function ensureUser({ name, email, role, password }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  const user = new User({ name, email, role });
  await user.setPassword(password);
  await user.save();
  console.log(`  Demo account: created ${email} (${role}) with password "${password}"`);
  return user;
}

async function seedDemo(admin) {
  const existing = await Transaction.countDocuments();
  if (existing > 0) {
    console.log(`  Demo entries: skipped, the book already holds ${existing} entries`);
    return;
  }

  const initiator = await ensureUser({
    name: 'Claudine Uwase',
    email: 'initiator@hub.rw',
    role: 'initiator',
    password: 'initiator-demo-1',
  });
  const approver1 = await ensureUser({
    name: 'Eric Habimana',
    email: 'approver1@hub.rw',
    role: 'approver1',
    password: 'approver1-demo-1',
  });
  const payer = await ensureUser({
    name: 'Josiane Mukamana',
    email: 'accountant@hub.rw',
    role: 'accountant',
    password: 'accountant-demo-1',
  });
  const approver2 = await ensureUser({
    name: 'Patrick Nsengimana',
    email: 'approver2@hub.rw',
    role: 'approver2',
    password: 'approver2-demo-1',
  });

  const categories = await Category.find({}).lean();
  const byName = Object.fromEntries(categories.map((category) => [category.name, category]));
  const expenseLines = categories.filter((category) => category.kind === 'expense');

  const today = new Date();
  const startOfMonth = (offset) =>
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));

  const day = (offset, dayOfMonth) => {
    const base = startOfMonth(offset);
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), dayOfMonth));
  };

  const entries = [];
  // Office hours, so the trail does not read as a row of midnights.
  const workingHour = () => (8 + Math.floor(random() * 9)) * 3_600_000 + Math.floor(random() * 60) * 60_000;

  const push = (entry) => {
    // The app refuses future dates, so the demo book must not contain any either.
    if (entry.date.getTime() > Date.now()) return;

    const recordedAt = new Date(entry.date.getTime() + DAY + workingHour());
    const reviewedAt = new Date(entry.date.getTime() + 2 * DAY + workingHour());
    const status = entry.status ?? 'approved';
    entries.push({
      method: 'cash',
      reference: '',
      receiptUrl: '',
      payee: '',
      note: '',
      status: 'approved',
      recordedBy: initiator._id,
      // Whoever ended the entry: Approver 2 for an approval, Approver 1 otherwise.
      reviewedBy:
        status === 'pending' ? null : (status === 'approved' ? approver2 : approver1)._id,
      reviewedAt: entry.status === 'pending' ? null : reviewedAt,
      ...(status !== 'approved'
        ? {}
        : {
            approval1: { by: approver1._id, at: new Date(recordedAt.getTime() + 3_600_000) },
            settlement: {
              by: payer._id,
              at: new Date(recordedAt.getTime() + 2 * 3_600_000),
              paidOn: entry.date,
              paymentRef: '',
            },
            approval2: { by: approver2._id, at: reviewedAt },
          }),
      reviewNote: '',
      editedAfterReview: false,
      createdAt: recordedAt,
      updatedAt: entry.status === 'pending' ? recordedAt : reviewedAt,
      ...entry,
    });
  };

  const payees = ['Kigali Heights Ltd', 'REG', 'MTN Rwanda', 'Simba Supermarket', 'Bralirwa'];

  for (let monthOffset = 2; monthOffset >= 0; monthOffset -= 1) {
    // The regular monthly bills.
    push({
      date: day(monthOffset, 3),
      description: 'Office rent',
      category: byName.Rent._id,
      type: 'out',
      amount: 450000,
      method: 'bank',
      reference: `RENT-${monthOffset}-2411`,
      payee: 'Kigali Heights Ltd',
    });
    push({
      date: day(monthOffset, 5),
      description: 'Electricity and water',
      category: byName.Utilities._id,
      type: 'out',
      amount: between(70000, 130000),
      method: 'mobile_money',
      reference: `MOMO-${monthOffset}-8831`,
      payee: 'REG',
    });
    push({
      date: day(monthOffset, 6),
      description: 'Fibre internet and staff airtime',
      category: byName['Internet & airtime']._id,
      type: 'out',
      amount: between(140000, 185000),
      method: 'bank',
      reference: `INV-${monthOffset}-3320`,
      payee: 'MTN Rwanda',
    });
    push({
      date: day(monthOffset, 28),
      description: 'Staff salaries and mentor stipends',
      category: byName['Salaries & stipends']._id,
      type: 'out',
      amount: 860000,
      method: 'bank',
      reference: `PAY-${monthOffset}-0092`,
    });

    // Income.
    push({
      date: day(monthOffset, 2),
      description: 'Desk memberships collected',
      category: byName['Membership & desk fees']._id,
      type: 'in',
      amount: between(600000, 900000),
      method: 'mobile_money',
      reference: `MOMO-IN-${monthOffset}-1120`,
    });
    push({
      date: day(monthOffset, 14),
      description: 'Training workshop fees',
      category: byName['Event & training income']._id,
      type: 'in',
      amount: between(180000, 420000),
      method: 'cash',
      reference: `RCPT-${monthOffset}-44`,
    });
    if (monthOffset !== 1) {
      push({
        date: day(monthOffset, 18),
        description: 'Innovation grant instalment',
        category: byName['Grants & donations']._id,
        type: 'in',
        amount: 2500000,
        method: 'bank',
        reference: `GRANT-${monthOffset}-01`,
      });
    }

    // Day-to-day spending.
    for (let i = 0; i < 4; i += 1) {
      const line = pick(expenseLines.filter((category) => category.name !== 'Rent'));
      push({
        date: day(monthOffset, 8 + i * 4),
        description: `${line.name.split(' ')[0]} purchase`,
        category: line._id,
        type: 'out',
        amount: between(8000, 90000),
        method: pick(['cash', 'mobile_money', 'bank']),
        reference: `RCPT-${monthOffset}${i}-${100 + i}`,
        payee: pick(payees),
      });
    }

    push({
      date: day(monthOffset, 22),
      description: 'Bank and mobile money charges',
      category: byName['Bank & mobile money charges']._id,
      type: 'out',
      amount: between(4000, 18000, 100),
      method: 'bank',
      reference: `CHG-${monthOffset}`,
    });
  }

  /* Entries that trip the exception checks, so the auditor's page has content. */

  // No reference and no receipt link.
  push({
    date: day(0, 9),
    description: 'Taxi to the ministry meeting',
    category: byName.Transport._id,
    type: 'out',
    amount: 12000,
    method: 'cash',
  });
  push({
    date: day(1, 16),
    description: 'Catering for the demo day',
    category: byName['Events & catering']._id,
    type: 'out',
    amount: 185000,
    method: 'cash',
    payee: 'Simba Supermarket',
  });

  // Recorded three weeks after it happened.
  push({
    date: day(1, 11),
    description: 'Projector lamp replacement',
    category: byName['Equipment & repairs']._id,
    type: 'out',
    amount: 96000,
    method: 'mobile_money',
    reference: 'RCPT-LATE-77',
    createdAt: new Date(day(1, 11).getTime() + 21 * DAY),
    updatedAt: new Date(day(1, 11).getTime() + 21 * DAY),
  });

  // Two entries that look like the same payment recorded twice.
  const duplicateDate = day(0, 12);
  for (let i = 0; i < 2; i += 1) {
    push({
      date: duplicateDate,
      description: 'Printer toner',
      category: byName.Supplies._id,
      type: 'out',
      amount: 45000,
      method: 'cash',
      reference: i === 0 ? 'RCPT-TONER-1' : '',
    });
  }

  // Pending for well over a week.
  push({
    date: day(1, 26),
    description: 'Chairs for the training room',
    category: byName['Equipment & repairs']._id,
    type: 'out',
    amount: 320000,
    method: 'bank',
    reference: 'INV-CHAIRS-19',
    status: 'pending',
    createdAt: new Date(Date.now() - 12 * DAY),
    updatedAt: new Date(Date.now() - 12 * DAY),
  });

  // Waiting for review right now.
  push({
    date: day(0, Math.min(today.getUTCDate(), 20)),
    description: 'Water refill for the coolers',
    category: byName.Supplies._id,
    type: 'out',
    amount: 24000,
    method: 'mobile_money',
    reference: 'MOMO-WATER-5',
    status: 'pending',
    createdAt: new Date(Date.now() - DAY),
    updatedAt: new Date(Date.now() - DAY),
  });

  // Changed after it had already been approved.
  push({
    date: day(0, 7),
    description: 'Generator fuel',
    category: byName.Utilities._id,
    type: 'out',
    amount: 78000,
    method: 'cash',
    reference: 'RCPT-FUEL-31',
    status: 'pending',
    editedAfterReview: true,
    reviewedBy: null,
    reviewedAt: null,
  });

  // Returned to the initiator, with the reason they need.
  push({
    date: day(1, 21),
    description: 'Team lunch',
    category: byName['Events & catering']._id,
    type: 'out',
    amount: 64000,
    method: 'cash',
    status: 'rejected',
    rejectedStage: 'pending',
    reviewNote: 'No receipt attached and the amount does not match the order slip.',
  });

  // Voided, still visible with its reason.
  push({
    date: day(2, 19),
    description: 'Duplicate transport claim',
    category: byName.Transport._id,
    type: 'out',
    amount: 15000,
    method: 'cash',
    reference: 'RCPT-TR-88',
    status: 'void',
    reviewNote: 'Recorded twice — this is the copy.',
  });

  const created = await Transaction.insertMany(entries, { timestamps: false });
  console.log(`  Demo entries: ${created.length} added across the last three months`);

  const logs = [];
  for (const entry of created) {
    logs.push({
      entity: 'transaction',
      entityId: entry._id,
      action: 'create',
      actor: initiator._id,
      actorName: initiator.name,
      at: entry.createdAt,
      summary: `Recorded ${entry.type === 'in' ? 'money in' : 'money out'} of ${entry.amount.toLocaleString('en-US')} for “${entry.description}”`,
      snapshot: entry.toObject(),
    });

    if (entry.status === 'approved' || entry.status === 'rejected' || entry.status === 'void') {
      logs.push({
        entity: 'transaction',
        entityId: entry._id,
        action: entry.status === 'approved' ? 'approve' : entry.status === 'rejected' ? 'reject' : 'void',
        actor: approver1._id,
        actorName: approver1.name,
        at: entry.reviewedAt ?? entry.updatedAt,
        summary:
          entry.status === 'approved'
            ? `Approved “${entry.description}” for ${entry.amount.toLocaleString('en-US')}`
            : `${entry.status === 'rejected' ? 'Rejected' : 'Voided'} “${entry.description}”: ${entry.reviewNote}`,
        changes: [{ field: 'status', from: 'pending', to: entry.status }],
        snapshot: entry.toObject(),
      });
    }

    if (entry.editedAfterReview) {
      logs.push({
        entity: 'transaction',
        entityId: entry._id,
        action: 'update',
        actor: initiator._id,
        actorName: initiator.name,
        at: new Date(entry.updatedAt.getTime() + DAY),
        summary: 'Changed amount 72,000 → 78,000 — back to pending after review',
        changes: [
          { field: 'amount', from: 72000, to: 78000 },
          { field: 'status', from: 'approved', to: 'pending' },
        ],
        snapshot: entry.toObject(),
      });
    }
  }

  await AuditLog.insertMany(logs);
  console.log(`  Audit trail: ${logs.length} entries written`);
  console.log(`  Administrator on file: ${admin.email}`);
}

async function main() {
  const uri = requireEnv('MONGODB_URI');
  requireEnv('JWT_SECRET');

  await mongoose.connect(uri, { bufferCommands: false, maxPoolSize: 5 });
  console.log(`\n  Connected to ${mongoose.connection.name}\n`);

  await seedCategories();
  const admin = await seedAdmin();
  if (DEMO) await seedDemo(admin);
  else console.log('  Run `npm run seed -- --demo` to fill the book with example traffic.');

  await mongoose.disconnect();
  console.log('\n  Done.\n');
}

main().catch(async (error) => {
  console.error('\n  Seed failed:', error.message, '\n');
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
