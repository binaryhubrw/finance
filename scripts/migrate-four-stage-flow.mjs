import mongoose from 'mongoose';

/**
 * One-off migration to the four-stage flow
 * (Initiator -> Approver 1 -> Accountant -> Approver 2).
 *
 *   node --env-file=.env.local scripts/migrate-four-stage-flow.mjs
 *
 * Users:   accountant -> initiator, auditor -> approver1.
 *          admin and viewer are unchanged. Nobody becomes an `accountant` (the
 *          new payer role) or `approver2`: the administrator assigns those.
 * Entries: already-approved entries keep counting and are flagged `legacy`,
 *          since they carry no accountant or Approver 2 record. Pending ones
 *          now read "Awaiting Approver 1". Nothing is deleted.
 *
 * `accountant` changes meaning in this migration, so running it twice would
 * turn the new payers into initiators. A marker document makes a second run a
 * no-op.
 */

const MARKER = 'four-stage-flow';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('\n  MONGODB_URI is not set. Run with --env-file=.env.local.\n');
  process.exit(1);
}

await mongoose.connect(uri, { bufferCommands: false, maxPoolSize: 2 });
const db = mongoose.connection.db;
console.log(`\n  Connected to ${mongoose.connection.name}\n`);

const migrations = db.collection('migrations');
if (await migrations.findOne({ _id: MARKER })) {
  console.log('  Already migrated. Nothing to do.\n');
  await mongoose.disconnect();
  process.exit(0);
}

const users = db.collection('users');
const initiators = await users.updateMany({ role: 'accountant' }, { $set: { role: 'initiator' } });
const approvers = await users.updateMany({ role: 'auditor' }, { $set: { role: 'approver1' } });
console.log(`  Users: ${initiators.modifiedCount} accountant -> initiator, ${approvers.modifiedCount} auditor -> approver1`);

const entries = await db
  .collection('transactions')
  .updateMany({ status: 'approved', approval1: { $exists: false } }, { $set: { legacy: true } });
console.log(`  Entries: ${entries.modifiedCount} approved entries marked as legacy`);

await migrations.insertOne({ _id: MARKER, at: new Date() });
console.log('\n  Done. Assign the Accountant and Approver 2 roles in Settings -> People.\n');

await mongoose.disconnect();
