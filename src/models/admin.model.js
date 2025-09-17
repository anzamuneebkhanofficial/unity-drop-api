/** @format */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const AdminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    availabilityStatus: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: { type: String, default: 'admin' },
  },
  {
    timestamps: true,
  }
);
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(new Error(`Error hashing password: ${error.message}`));
  }
});
// ✅ Indexes
// AdminSchema.index({ email: 1 }, { unique: true }); // fast login
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
export default Admin;
