import mongoose from 'mongoose';
import { ENTITIES } from '../lib/enums.js';

/**
 * A remark someone left against a record — "checked against the March
 * statement", "asked Claudine about this".
 *
 * Kept in its own collection rather than on the transaction, so that leaving a
 * comment cannot touch the entry itself: no amount, no status, nothing that
 * moves a balance. Like the audit log it is append-only — there is no route
 * that edits or removes one, and none should be added. A comment that could be
 * quietly rewritten would be worth nothing to the person reading it later.
 */
const commentSchema = new mongoose.Schema({
  entity: { type: String, enum: ENTITIES, required: true, default: 'transaction' },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  body: {
    type: String,
    required: [true, 'Write something before posting the comment.'],
    trim: true,
    maxlength: [1000, 'Keep a comment under 1000 characters.'],
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Denormalised so the remark still reads properly after a rename.
  authorName: { type: String, default: '' },
  authorRole: { type: String, default: '' },
  at: { type: Date, default: Date.now },
});

commentSchema.index({ entity: 1, entityId: 1, at: -1 });
commentSchema.index({ at: -1 });

const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
export default Comment;
