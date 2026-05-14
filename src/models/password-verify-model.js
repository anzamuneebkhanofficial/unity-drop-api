/** @format */

import mongoose, { Schema } from 'mongoose';

const PasswordEmailVerifySchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel', // Dynamic reference
      index: true, // reference index
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Admin', 'Donor', 'Patient'], // Same as RefreshToken
    },
    PassToken: {
      type: String,
      required: true,
    },
    PassTokenExpiration: {
      type: Date,
      required: true,
      default: () => {
        const mins = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES) || 5;
        return new Date(Date.now() + mins * 60 * 1000);
      },
      expires: 0, // TTL index, auto delete at PassTokenExpiration
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

const PasswordVerifyModel =
  mongoose.models.PasswordVerification ||
  mongoose.model('PasswordVerification', PasswordEmailVerifySchema);

export default PasswordVerifyModel;
