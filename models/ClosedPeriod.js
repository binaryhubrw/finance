import mongoose from 'mongoose';

const closedPeriodSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, min: 2000, max: 2200 },
    month: { type: Number, required: true, min: 1, max: 12 },
    closingBalance: { type: Number, default: 0 },
    countedCash: { type: Number, default: null },
    variance: { type: Number, default: null },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

closedPeriodSchema.index({ year: 1, month: 1 }, { unique: true });

const ClosedPeriod =
  mongoose.models.ClosedPeriod || mongoose.model('ClosedPeriod', closedPeriodSchema);
export default ClosedPeriod;
