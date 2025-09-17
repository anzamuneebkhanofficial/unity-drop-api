/** @format */
import mongoose, { Schema } from 'mongoose';

const feedbackSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel', // can point to Donor or Patient
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Donor', 'Patient'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5, // optional, if you want rating system (1–5 stars)
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // auto-expire after 24 hrs
      index: { expires: '0s' }, // MongoDB TTL index auto-delete
    },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', feedbackSchema);
