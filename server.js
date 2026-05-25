import config from './src/config/env.js';
import app from './src/app.js';
import dbConnection from './src/config/db/db-connection.js';
import Logger from './src/utils/logger.js';
import mongoose from 'mongoose';
process.on('uncaughtException', (err) => {
  Logger.error(`[UncaughtException] ${err.name}: ${err.message}`);
  process.exit(1);
});
const startServer = async () => {
  try {
    await dbConnection();
    Logger.info('MongoDB connected');
    const server = app.listen(config.port, '0.0.0.0', () => {
      Logger.info(`Server running on port ${config.port}`);
    });
    process.on('unhandledRejection', (err) => {
      Logger.error(`[UnhandledRejection] ${err.name}: ${err.message}`);
      server.close(() => process.exit(1));
    });
    const shutdown = async () => {
      Logger.info('Shutting down gracefully...');
      server.close(async () => {
        await mongoose.connection.close(false);
        Logger.info('MongoDB connection closed.');
        process.exit(0);
      });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    Logger.error(`[Startup] DB connection failed: ${err.message}`);
    process.exit(1);
  }
};
startServer();
export default app;