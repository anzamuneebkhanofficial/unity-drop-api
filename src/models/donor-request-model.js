import mongoose from 'mongoose';
import config from '../config/env.js';
const DonorRequestSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
      index: true, // reference index
    },
    message: {
      type: String,
      required: true,
    },
    patientAge: {
      type: Number,
    },
    bottlesRequired: {
      type: String,
    },
    hospitalName: {
      type: String,
    },
    city: {
      type: String,
    },
    pickAndDrop: {
      type: String,
    },
    exchangePossibility: {
      type: String,
    },
    caseDescription: {
      type: String,
    },
    attendantName: {
      type: String,
    },
    attendantPhone: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'No-Request'],
      default: 'No-Request',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + config.donation.requestExpiryMs),
    },
  },
  { timestamps: true }
);
DonorRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
DonorRequestSchema.index({ patientId: 1, donorId: 1 }, { unique: true });
const DonorRequest =
  mongoose.models.DonorRequest ||
  mongoose.model('DonorRequest', DonorRequestSchema);
export default DonorRequest;
