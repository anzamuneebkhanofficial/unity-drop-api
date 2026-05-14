/** @format */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoosePaginate from 'mongoose-paginate-v2';
const DonorSchema = new mongoose.Schema(
  {
    // DonateRequestId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Patient',
    // },
    // DonateBloodRequestType: {
    //   type: String,
    //   enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    // },
    // DonateBloodRequetStatus: {
    //   type: String,
    //   enum: ['Pending', 'Accepted', 'Rejected'],
    //   default: 'Pending',
    // },
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
      type: String, // City / Area
      required: true,
    },

    address: {
      type: String,
    },
    phone: {
      type: String,
      required: true,
      index: true, // single index — donors searched/filtered by phone
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: { type: String, default: 'donor' },
  },
  {
    timestamps: true, // 👈 this needs a comma before
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
// ✅ Add same indexes
DonorSchema.index({ bloodGroup: 1 });
DonorSchema.index({ location: 1 });



DonorSchema.index({ fullName: 'text' });
DonorSchema.index({ createdAt: -1 }); // index for sorting by newest
DonorSchema.index({ bloodGroup: 1, location: 1 });
// ✅ Add pagination plugin
DonorSchema.plugin(mongoosePaginate);
const Donor = mongoose.models.Donor || mongoose.model('Donor', DonorSchema);
export default Donor;
