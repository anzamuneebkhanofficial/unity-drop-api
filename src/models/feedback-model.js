/** @format */
import mongoose, { Schema } from 'mongoose';
import config from '../config/env.js';

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
      max: 5,
    },
    reaction: {
      type: String,
      enum: ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💡', '🤔', '👀'],
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + config.donation.feedbackExpiryMs),
      index: { expires: '0s' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', feedbackSchema);
