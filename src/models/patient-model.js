/** @format */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoosePaginate from 'mongoose-paginate-v2';
const PatientSchema = new mongoose.Schema(
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
      unique: true,
    },
    availabilityStatus: {
      type: Boolean,
      default: false,
    },
    hospitalName: {
      type: String,
      index: true,
    },
    hospitalAddress: {
      type: String,
    },
    hospitalLocation: {
      type: String,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: 'patient',
    },
  },
  {
    timestamps: true,
  }
);
PatientSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(new Error(`Error hashing password: ${error.message}`));
  }
});
PatientSchema.index({ bloodGroup: 1 });
PatientSchema.index({ location: 1 });

PatientSchema.index({ fullName: 'text' });
PatientSchema.index({ createdAt: -1 });
PatientSchema.index({ bloodGroup: 1, location: 1 });
PatientSchema.plugin(mongoosePaginate);
const Patient =
  mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
export default Patient;
