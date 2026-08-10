import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../lib/enums.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Give this person a name.'], trim: true, maxlength: 120 },
    email: {
      type: String,
      required: [true, 'An email address is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'That does not look like an email address.'],
    },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ROLES, default: 'viewer' },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function setPassword(plain) {
  if (typeof plain !== 'string' || plain.length < 8) {
    throw new Error('The password must be at least 8 characters.');
  }
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.checkPassword = async function checkPassword(plain) {
  if (!this.passwordHash || !plain) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
