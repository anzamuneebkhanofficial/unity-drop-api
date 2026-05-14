/** @format */
import config from './src/config/env.js';
import app from './src/app.js';
import dbConnection from './src/config/db/db-connection.js';
import Logger from './src/utils/logger.js';
import mongoose from 'mongoose';
import { startAdminApprovalScheduler } from './src/lib/admin-approval-scheduler.js';

// Handle uncaught exceptions (synchronous errors)
process.on('uncaughtException', (err) => {
  Logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  Logger.error(err.name, err.message);
  process.exit(1);
});

const startServer = async () => {
  try {
    await dbConnection();
    Logger.info('🚀 MongoDB connected');

    const server = app.listen(config.port, '0.0.0.0', () => {
      Logger.info(`✅ Server running at http://0.0.0.0:${config.port}`);
    });

    // Start the admin approval cleanup scheduler
    startAdminApprovalScheduler();
    // Handle unhandled rejections (asynchronous errors)
    process.on('unhandledRejection', (err) => {
      Logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      Logger.error(`${err.name}: ${err.message}`);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful Shutdown
    const shutdown = async () => {
      Logger.info('👋 SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        Logger.info('💥 Process terminated. Closed HTTP server.');
        await mongoose.connection.close(false);
        Logger.info('zzz MongoDB connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    Logger.error('❌ DB connection error:', err);
    process.exit(1);
  }
};

// Conditional Start for different platforms
if (config.platform === 'vercel' && config.isProduction) {
  // Vercel Production: Export app for serverless deployment
  // Connect to DB immediately
  dbConnection()
    .then(() => Logger.info('🚀 MongoDB connected (Vercel)'))
    .catch((err) => Logger.error('❌ DB connection error:', err));

  // Export app as default for Vercel
  // Note: Vercel will use this exported app as the request handler
} else {
  // Traditional Deployment (Render, Local, etc.)
  startServer();
}

export default app;
