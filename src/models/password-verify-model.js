
import mongoose, { Schema } from 'mongoose';
import config from '../config/env.js';
const PasswordEmailVerifySchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel',
      index: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Admin', 'Donor', 'Patient'],
    },
    PassToken: {
      type: String,
      required: true,
    },
    PassTokenExpiration: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + config.otp.passwordResetExpiryMs),
      expires: 0,
    },
  },
  {
    timestamps: true,
  }
);
const PasswordVerifyModel =
  mongoose.models.PasswordVerification ||
  mongoose.model('PasswordVerification', PasswordEmailVerifySchema);
export default PasswordVerifyModel;
