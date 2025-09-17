/** @format */

import mongoose from 'mongoose';

const DonorRequestSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
// Optional: MongoDB TTL index to automatically remove documents after expiration
DonorRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DonorRequest =
  mongoose.models.DonorRequest ||
  mongoose.model('DonorRequest', DonorRequestSchema);
export default DonorRequest;
