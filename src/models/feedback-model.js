/** @format */
import mongoose, { Schema } from 'mongoose';

const feedbackSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel', // can point to Donor or Patient
      index: true, // reference index
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
    },
    rating: {
      type: Number,
      min: 1,
      max: 5, // optional, if you want rating system (1–5 stars)
    },
    reaction: {
      type: String,
      enum: ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💡', '🤔', '👀'],
    },
    expiresAt: {
      type: Date,
      default: () => {
        const days = Number(process.env.FEEDBACK_EXPIRY_DAYS) || 7;
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      },
      index: { expires: '0s' }, // MongoDB TTL index
    },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', feedbackSchema);
