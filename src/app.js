/** @format */

// /** @format */

// // /** @format */
// // import express from 'express';
// // import cors from 'cors';
// // import cookieParser from 'cookie-parser';
// // import passport from 'passport';
// // import rateLimit from 'express-rate-limit';
// // import helmet from 'helmet';
// // import expressMongoSanitize from '@exortek/express-mongo-sanitize';
// // import { xss } from 'express-xss-sanitizer';

// // import FinalAdminRoutes from './routes/index.js';
// // import './lib/passportConfig.js';

// // const app = express();
// // app.set('trust proxy', 1);
// // // ✅ Rate Limiting (global)
// // const globalLimiter = rateLimit({
// //   windowMs: 10 * 60 * 1000, // 10 minutes
// //   max: process.env.NODE_ENV === 'production' ? 30 : 300,
// //   standardHeaders: true,
// //   legacyHeaders: false,
// //   message: 'Too many requests, slow down.',
// // });

// // app.use(globalLimiter);

// // // ✅ Security headers
// // app.use(helmet());

// // // ✅ CORS
// // const allowedOrigins = [process.env.FrontEnd_URL];
// // app.use(
// //   cors({
// //     origin: allowedOrigins,
// //     credentials: true,
// //   })
// // );

// // // ✅ Body parsing with size limit
// // app.use(express.json({ limit: '10kb' }));
// // app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// // // ✅ Sanitizers (NoSQL injection + XSS)
// // app.use(expressMongoSanitize());
// // app.use(xss());

// // // ✅ Cookies & Passport
// // app.use(cookieParser());
// // app.use(passport.initialize());

// // // ✅ Routes
// // app.use('/api', FinalAdminRoutes);

// // export default app;
// /** @format */
// import express from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';
// import passport from 'passport';
// import rateLimit from 'express-rate-limit';
// import helmet from 'helmet';
// import expressMongoSanitize from '@exortek/express-mongo-sanitize';
// import { xss } from 'express-xss-sanitizer';

// import FinalAdminRoutes from './routes/index.js';
// import './lib/passportConfig.js';

// const app = express();
// app.set('trust proxy', 1);

// // ✅ Global Rate Limiting
// const globalLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 minutes
//   max: process.env.NODE_ENV === 'production' ? 30 : 300,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: 'Too many requests, slow down.',
// });
// app.use(globalLimiter);

// // ✅ Security headers
// app.use(helmet());

// // ✅ CORS (safe default)
// const allowedOrigins = [process.env.FrontEnd_URL || '*'];
// app.use(
//   cors({
//     origin: allowedOrigins,
//     credentials: true,
//   })
// );

// // ✅ Body parsing
// app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// // ✅ Sanitizers
// app.use(expressMongoSanitize());
// app.use(xss());

// // ✅ Cookies & Passport
// app.use(cookieParser());
// app.use(passport.initialize());

// // ✅ Routes
// app.use('/api', FinalAdminRoutes);

// export default app;
/** @format */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import expressMongoSanitize from '@exortek/express-mongo-sanitize';
import { xss } from 'express-xss-sanitizer';

import FinalAdminRoutes from './routes/index.js';
import './lib/passportConfig.js';

const app = express();
app.set('trust proxy', 1);

// ✅ Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, slow down.',
});
app.use(globalLimiter);

// ✅ Security headers
app.use(helmet());

// ✅ CORS (safe default)
const allowedOrigins = [process.env.FrontEnd_URL || '*'];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ✅ Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ✅ Sanitizers
app.use(expressMongoSanitize());
app.use(xss());

// ✅ Cookies & Passport
app.use(cookieParser());
app.use(passport.initialize());

// ✅ Routes
app.use('/api', FinalAdminRoutes);

export default app;
