/** @format */

import mongoose from 'mongoose';

const DonorRequestSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true, // reference index
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
    // Detailed fields from request images
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
      type: String, // "Yes", "No", or custom message
    },
    exchangePossibility: {
      type: String, // "Yes", "No"
    },
    caseDescription: {
      type: String, // e.g., "Child Delivery"
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
      default: () => {
        const days = Number(process.env.DONATION_REQUEST_EXPIRY_DAYS) || 7;
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      },
    },
  },
  { timestamps: true }
);
// Optional: MongoDB TTL index to automatically remove documents after expiration
DonorRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
DonorRequestSchema.index({ createdAt: -1 }); // index for sorting by newest

const DonorRequest =
  mongoose.models.DonorRequest ||
  mongoose.model('DonorRequest', DonorRequestSchema);
export default DonorRequest;
