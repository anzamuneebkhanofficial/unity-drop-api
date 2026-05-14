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
      index: true, // single index — admins searched/filtered by phone
    },
    location: {
      type: String, // City / Area
      required: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: { type: String, default: 'admin' },
    isSuperAdmin: { type: Boolean, default: false },

    // ─── Admin Approval System ───────────────────────────────────────────────
    // Super Admin must approve a newly registered admin before they can work.
    // Statuses: pending → approved | rejected
    // Super Admin is auto-approved (isSuperAdmin:true skips this check at login).
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Auto-delete timestamp: 24 hours after email verification, if still pending.
    approvalExpiresAt: {
      type: Date,
      default: null,
    },

    // ─── Privilege System ──────────────────────────────────────────────────
    // By default every admin can READ (view) users.
    // Super Admin can grant or revoke the ability to DELETE users.
    canDelete: {
      type: Boolean,
      default: false, // Admins cannot delete by default; Super Admin grants this.
    },
  },
  {
    timestamps: true,
  }
);


AdminSchema.index({ location: 1 });
AdminSchema.index({ createdAt: -1 }); // index for sorting by newest


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
