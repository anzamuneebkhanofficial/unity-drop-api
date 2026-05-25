/** @format */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoosePaginate from 'mongoose-paginate-v2';
const DonorSchema = new mongoose.Schema(
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
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    location: {
      type: String,
      required: true,
    },

    address: {
      type: String,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: { type: String, default: 'donor' },
  },
  {
    timestamps: true,
  }
);
DonorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(new Error(`Error hashing password: ${error.message}`));
  }
});

DonorSchema.index({ bloodGroup: 1 });
DonorSchema.index({ location: 1 });
DonorSchema.index({ fullName: 'text' });
DonorSchema.index({ createdAt: -1 });
DonorSchema.index({ bloodGroup: 1, location: 1 });
DonorSchema.plugin(mongoosePaginate);
const Donor = mongoose.models.Donor || mongoose.model('Donor', DonorSchema);
export default Donor;
