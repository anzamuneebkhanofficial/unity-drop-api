/** @format */

// models/SuperKey.js
import mongoose from 'mongoose';

const superKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    }, // super admin who generated it
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true }, // 🔹 expiry timestamp
  },
  { timestamps: true }
);

// 🔹 Automatically delete expired keys after 1 hour
superKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('SuperKey', superKeySchema);
