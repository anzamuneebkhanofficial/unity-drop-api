/** @format */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import expressMongoSanitize from '@exortek/express-mongo-sanitize';
import { xss } from 'express-xss-sanitizer';

// Config & Utils
import config from './config/env.js';
import morganMiddleware from './middlewares/morgan-middleware.js';
import globalErrorHandler from './middlewares/global-error-handler.js';
import Logger from './utils/logger.js';
import './lib/passport-config.js'; 
import corsConfig from './config/cors-config.js';
import { globalLimiter } from './middlewares/rate-limiters.js';


// Routes
import FinalAdminRoutes from './routes/index.js';

const app = express();

// 🚀 0. GUARANTEED LIFE-LOG: Raw request interception
app.use((req, res, next) => {
  Logger.info(`\n[TRAFFIC DETECTED] HTTP ${req.method} ${req.originalUrl}`);
  next();
});

// 🚀 1. HTTP STATUS LOGS: Morgan MUST run early
app.use(morganMiddleware);

// 🚀 2. BODY PARSING: Must happen before payload logging
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 🚀 3. PAYLOAD LOGGING: Debug mode data echo
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

// 🛡️ 4. Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: config.isProduction,
}));

// 🌍 5. CORS
app.use(cors(corsConfig));

// 🚦 6. GLOBAL RATE LIMITING
app.use(globalLimiter);

// 🧹 7. SANITIZERS
app.use(expressMongoSanitize());
app.use(xss());

// 🍪 8. COOKIES & PASSPORT
app.use(cookieParser());
app.use(passport.initialize());



// 🛣️ 10. API ROUTES
app.use('/api', FinalAdminRoutes);

// 🚫 10. 404 Handler
app.use((req, res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// 💥 11. Global Error Handler
app.use(globalErrorHandler);

export default app;
