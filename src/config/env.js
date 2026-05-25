import dotenv from 'dotenv';
import { parseDurationToMs, getDurationText } from '../utils/duration-helper.js';
dotenv.config();
const required = ['DATABASE_URL', 'JWT_ACCESS_TOKEN_SECRET_KEY', 'JWT_REFRESH_TOKEN_SECRET_KEY', 'JWT_SECRET', 'FRONTEND_URL'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) throw new Error(`Missing required env variables: ${missing.join(', ')}`);
const env = process.env;
const config = {
  env: env.NODE_ENV || 'development',
  isProduction: env.NODE_ENV === 'production',
  port: parseInt(env.PORT) || 8000,
  platform: env.PLATFORM || 'development',
  logLevel: env.LOG_LEVEL || 'info',
  databaseUrl: env.DATABASE_URL,
  frontendUrl: env.FRONTEND_URL,
  jwt: {
    accessSecret: env.JWT_ACCESS_TOKEN_SECRET_KEY,
    refreshSecret: env.JWT_REFRESH_TOKEN_SECRET_KEY,
    secret: env.JWT_SECRET,
    resetKey: env.PASSWORD_RESET_TOKEN_PRIVATE_KEY || null,
  },

  smtp: {
    host: env.SMTP_HOST || null,
    port: parseInt(env.SMTP_PORT) || null,
    service: env.SMTP_SERVICE || null,
    user: env.SMTP_USER || null,
    pass: env.SMTP_PASS || null,
    from: env.SMTP_FROM_EMAIL || null,
  },
  recaptcha: {
    siteKey: env.RECAPTCHA_SITE_KEY || null,
    secretKey: env.RECAPTCHA_SECRET_KEY || null,
  },
  cache: {
    ttlMs: parseDurationToMs(env.CACHE_TTL_MINUTES, 5, 'm'),
    ttlMinutes: parseDurationToMs(env.CACHE_TTL_MINUTES, 5, 'm') / (60 * 1000), // backward compatibility
  },
  otp: {
    expiryMs: parseDurationToMs(env.OTP_EXPIRY_MINUTES, 2, 'm'),
    expiryText: getDurationText(env.OTP_EXPIRY_MINUTES, 2, 'm'),
    passwordResetExpiryMs: parseDurationToMs(env.PASSWORD_RESET_EXPIRY_MINUTES, 2, 'm'),
    passwordResetExpiryText: getDurationText(env.PASSWORD_RESET_EXPIRY_MINUTES, 2, 'm'),
  },
  donation: {
    requestExpiryMs: parseDurationToMs(env.DONATION_REQUEST_EXPIRY_DAYS, 7, 'd'),
    requestExpiryText: getDurationText(env.DONATION_REQUEST_EXPIRY_DAYS, 7, 'd'),
    feedbackExpiryMs: parseDurationToMs(env.FEEDBACK_EXPIRY_DAYS, 7, 'd'),
    feedbackExpiryText: getDurationText(env.FEEDBACK_EXPIRY_DAYS, 7, 'd'),
  },
  admin: {
    quotaLimit: parseInt(env.ADMIN_QUOTA_LIMIT) || 2,
  },
};

export default config;