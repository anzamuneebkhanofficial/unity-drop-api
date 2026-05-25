import express from 'express';
import { authenticateJWT } from '../middlewares/auth-middleware.js';
import { submitPublicFeedback, getPublicFeedbacks } from '../controllers/public-feedback-controller.js';
import { cacheMiddleware, autoResetCache } from '../middlewares/cache-middleware.js';
import { CacheNamespaces } from '../cache/constants.js';
const router = express.Router();
router.post('/', autoResetCache([CacheNamespaces.FEEDBACKS]), submitPublicFeedback);
router.get('/', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.FEEDBACKS), getPublicFeedbacks);

export default router;
