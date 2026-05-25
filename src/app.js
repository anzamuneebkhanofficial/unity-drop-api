/** @format */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import expressMongoSanitize from '@exortek/express-mongo-sanitize';
import { xss } from 'express-xss-sanitizer';
import config from './config/env.js';
import morganMiddleware from './middlewares/morgan-middleware.js';
import globalErrorHandler from './middlewares/global-error-handler.js';
import Logger from './utils/logger.js';
import './lib/passport-config.js';
import corsConfig from './config/cors-config.js';
import { globalLimiter } from './middlewares/rate-limiters.js';
import FinalAdminRoutes from './routes/index.js';
const app = express();
// TRUST PROXY: Required for express-rate-limit in production (Render, Vercel, etc.)
app.set('trust proxy', 1);
app.use((req, res, next) => {
  Logger.info(`\n[TRAFFIC DETECTED] HTTP ${req.method} ${req.originalUrl}`);
  next();
});
// HTTP STATUS LOGS: Morgan MUST run early
app.use(morganMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
if (!config.isProduction) {
  app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
      Logger.debug(`📦 Request Body: ${JSON.stringify(req.body, null, 2)}`);
    }
    if (req.query && Object.keys(req.query).length > 0) {
      Logger.debug(`🔍 Request Query: ${JSON.stringify(req.query, null, 2)}`);
    }
    next();
  });
}
// Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: config.isProduction,
}));
app.use(cors(corsConfig));
// GLOBAL RATE LIMITING
app.use(globalLimiter);
//  SANITIZERS
app.use(expressMongoSanitize());
app.use(xss());
// COOKIES & PASSPORT
app.use(cookieParser());
app.use(passport.initialize());
// API ROUTES
app.use('/api', FinalAdminRoutes);
//  404 Handler
app.use((req, res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});
// Global Error Handler
app.use(globalErrorHandler);

export default app;
