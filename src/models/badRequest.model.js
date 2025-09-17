/** @format */
import mongoose from 'mongoose';

const BadRequestSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    patientName: { type: String, required: true },
    patientEmail: { type: String, required: true },
    declineCount: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['Pending', 'Acknowledged', 'Expired'],
      default: 'Pending',
    },
    expiresAt: { type: Date, required: true }, // e.g., 24h from creation
  },
  { timestamps: true }
);

// Optional: MongoDB TTL index to automatically remove documents after expiration
BadRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BadRequest =
  mongoose.models.BadRequest || mongoose.model('BadRequest', BadRequestSchema);
export default BadRequest;
