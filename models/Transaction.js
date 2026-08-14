import mongoose from 'mongoose';
import { METHODS, STATUSES, TYPES } from '../lib/enums.js';

const round2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const transactionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: [true, 'Pick the date the money moved.'] },
    description: {
      type: String,
      required: [true, 'Describe what this entry is for.'],
      trim: true,
      maxlength: [300, 'Keep the description under 300 characters.'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Choose a budget line.'],
    },
    type: {
      type: String,
      enum: { values: TYPES, message: 'Money either came in or went out.' },
      required: [true, 'Say whether money came in or went out.'],
    },
    amount: {
      type: Number,
      required: [true, 'Enter an amount.'],
      min: [0.01, 'The amount must be greater than zero.'],
      set: round2,
    },
    method: { type: String, enum: METHODS, default: 'cash' },
    reference: { type: String, trim: true, maxlength: 120, default: '' },
    receiptUrl: { type: String, trim: true, maxlength: 500, default: '' },
    // A receipt held on this server, as opposed to receiptUrl's link elsewhere.
    attachment: {
      type: {
        filename: { type: String, required: true },
        originalName: { type: String, default: 'receipt' },
        mimeType: { type: String, default: 'application/octet-stream' },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
      },
      default: null,
      _id: false,
    },
    payee: { type: String, trim: true, maxlength: 160, default: '' },
    note: { type: String, trim: true, maxlength: [500, 'Keep the note under 500 characters.'], default: '' },

    status: { type: String, enum: STATUSES, default: 'pending' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true, maxlength: 500, default: '' },
    editedAfterReview: { type: Boolean, default: false },
  },
  { timestamps: true },
);

transactionSchema.index({ date: 1 });
transactionSchema.index({ status: 1, date: 1 });
transactionSchema.index({ category: 1, date: 1 });
transactionSchema.index({ recordedBy: 1, date: 1 });

const Transaction =
  mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
export default Transaction;
