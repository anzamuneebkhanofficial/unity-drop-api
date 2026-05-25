import mongoose from 'mongoose';
const publicFeedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
}, { timestamps: true });
publicFeedbackSchema.index({ createdAt: -1 });
export default mongoose.model('PublicFeedback', publicFeedbackSchema);
