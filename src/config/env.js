/** @format */
import dotenv from 'dotenv';
import path from 'path';

// Load .env relative to project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const requiredEnv = [
  'DATABASE_URL',
  'JWT_ACCESS_TOKEN_SECRET_KEY',
  'JWT_REFRESH_TOKEN_SECRET_KEY',
  'JWT_SECRET',
  'FRONTEND_URL',
];

const optionalEnv = [
  'NODE_ENV',
  'PORT',
  'PASSWORD_RESET_TOKEN_PRIVATE_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SERVICE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
  'RECAPTCHA_SITE_KEY',
  'RECAPTCHA_SECRET_KEY',

  'PLATFORM',
];

// Check for missing required keys
const missingKeys = requiredEnv.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  throw new Error(`❌ Missing required environment variables: ${missingKeys.join(', ')}`);
}

// Validate optional environment variables and provide defaults
const validateEnvVar = (key, defaultValue = null, type = 'string') => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  switch (type) {
    case 'number':
      const num = parseInt(value, 10);
      return isNaN(num) ? defaultValue : num;
    case 'boolean':
      return value === 'true' || value === '1';
    default:
      return value;
  }
};

const config = {
  env: validateEnvVar('NODE_ENV', 'development'),
  isProduction: validateEnvVar('NODE_ENV') === 'production',
  isDevelopment: validateEnvVar('NODE_ENV') !== 'production',
  port: validateEnvVar('PORT', 8000, 'number'),
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
    refreshSecret: process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
    secret: process.env.JWT_SECRET,
    resetKey: validateEnvVar('PASSWORD_RESET_TOKEN_PRIVATE_KEY'),
  },
  smtp: {
    host: validateEnvVar('SMTP_HOST'),
    port: validateEnvVar('SMTP_PORT', null, 'number'),
    service: validateEnvVar('SMTP_SERVICE'),
    user: validateEnvVar('SMTP_USER'),
    pass: validateEnvVar('SMTP_PASS'),
    from: validateEnvVar('SMTP_FROM_EMAIL'),
  },
  recaptcha: {
    siteKey: validateEnvVar('RECAPTCHA_SITE_KEY'),
    secretKey: validateEnvVar('RECAPTCHA_SECRET_KEY'),
  },

  platform: validateEnvVar('PLATFORM', 'development'), // 'vercel', 'render', or 'development'
};

export default config;
