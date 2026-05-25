import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

const limiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max: config.isProduction ? max : max * 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message },
});
export const globalLimiter = limiter(15 * 60 * 1000, 100, 'Too many requests. Please try again later.');
export const authLimiter = limiter(15 * 60 * 1000, 10, 'Too many login attempts. Please try again after 15 minutes.');