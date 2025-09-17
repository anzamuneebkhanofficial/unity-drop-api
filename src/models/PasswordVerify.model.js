/** @format */

import mongoose, { Schema } from 'mongoose';

const PasswordEmailVerifySchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel', // Dynamic reference
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
      default: () => new Date(Date.now() + 5 * 60 * 1000), // expires in 5 min
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
