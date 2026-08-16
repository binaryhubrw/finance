import User from './User.js';
import Category from './Category.js';
import Transaction from './Transaction.js';
import AuditLog from './AuditLog.js';
import ClosedPeriod from './ClosedPeriod.js';
import Comment from './Comment.js';

/**
 * Importing a model registers its schema with Mongoose. `populate('recordedBy')`
 * needs the *referenced* model registered too, and a route that only imports
 * Transaction has no reason to have loaded User — so the first request a cold
 * container serves would fail with MissingSchemaError while a warm one, where
 * some other page had already pulled the model in, worked fine.
 *
 * `lib/db.js` calls this on every connection, so the registry is always complete
 * whichever route happens to run first.
 */
export function registerModels() {
  return { User, Category, Transaction, AuditLog, ClosedPeriod, Comment };
}

export { User, Category, Transaction, AuditLog, ClosedPeriod, Comment };
