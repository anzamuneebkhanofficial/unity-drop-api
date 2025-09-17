/** @format */
import mongoose, { Schema } from 'mongoose';

const OtpSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel', // Dynamic reference
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Admin', 'Donor', 'Patient'], // Which collection to use
    },
    otpNumber: {
      type: Number,
      required: true,
    },
    otpExpirationTime: {
      type: Date,
      required: true,
      index: { expires: 0 }, // use actual Date value
    },
  },
  { timestamps: true }
);

const Otp = mongoose.models.Otp || mongoose.model('Otp', OtpSchema);
export default Otp;
