/** @format */
import mongoose, { Schema } from 'mongoose';

const OtpSchema = new Schema(
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
      enum: ['Admin', 'Donor', 'Patient'],
    },
    otpNumber: {
      type: Number,
      required: true,
    },
    otpExpirationTime: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

const Otp = mongoose.models.Otp || mongoose.model('Otp', OtpSchema);
export default Otp;
