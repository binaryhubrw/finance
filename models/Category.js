import mongoose from 'mongoose';
import { KINDS } from '../lib/enums.js';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Give the budget line a name.'],
      unique: true,
      trim: true,
      maxlength: 120,
    },
    kind: {
      type: String,
      enum: { values: KINDS, message: 'A budget line is either income or expense.' },
      required: [true, 'Say whether this line is income or expense.'],
    },
    monthlyBudget: { type: Number, default: null, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export default Category;
