/** @format */

// models/warning.model.js
import mongoose from 'mongoose';

const WarningSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient', // who complained
      required: true,
    },
    action: {
      type: String,
      enum: ['Forgive', 'Ignore', 'Ban'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin', // who issued warning
      required: true,
    },
    whoGivedWarning: {
      type: String, // admin name
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Warning', WarningSchema);
