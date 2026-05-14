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
    // NeedBloodRequestType: {
    //   type: String,
    //   enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    //   required: true,
    // },
    // NeedBloodRequestStatus: {
    //   type: String,
    //   enum: ['Pending', 'Approved', 'Rejected'],
    //   default: 'Pending',
    // },
    // NeedRequest: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Donor',
    // },
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
      index: true, // single index — patients searched/filtered by phone
    },
    hospitalName: {
      type: String,
      index: true, // patients often searched by hospital
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
    timestamps: true, // ✅ correct placement
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
// ✅ Create indexes for faster filtering
PatientSchema.index({ bloodGroup: 1 });
PatientSchema.index({ location: 1 });



PatientSchema.index({ fullName: 'text' });
PatientSchema.index({ createdAt: -1 }); // index for sorting by newest
// 🔥 If you want to filter by both together often
PatientSchema.index({ bloodGroup: 1, location: 1 });
// ✅ Add pagination plugin
PatientSchema.plugin(mongoosePaginate);
const Patient =
  mongoose.models.Patient || mongoose.model('Patient', PatientSchema);

export default Patient;
