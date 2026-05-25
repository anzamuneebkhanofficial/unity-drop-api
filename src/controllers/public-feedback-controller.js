
import PublicFeedback from '../models/public-feedback-model.js';

export const submitPublicFeedback = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const newFeedback = new PublicFeedback({ name, email, message });
    await newFeedback.save();

    res.status(201).json({ success: true, message: 'Feedback submitted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
export const getPublicFeedbacks = async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied. Super Admin only.' });
    }
    const feedbacks = await PublicFeedback.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
