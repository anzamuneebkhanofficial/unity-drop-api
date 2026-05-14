/** @format */
import express from 'express';
import { authenticateJWT } from '../middlewares/auth-middleware.js';
import { submitPublicFeedback, getPublicFeedbacks } from '../controllers/public-feedback-controller.js';

const router = express.Router();

// Public: Anyone can submit feedback without logging in
router.post('/', submitPublicFeedback);

// Private: Admin only — view all submitted public feedbacks
router.get('/', authenticateJWT(['admin']), getPublicFeedbacks);

export default router;
