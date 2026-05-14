/** @format */
import Logger from '../utils/logger.js';

const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // 🔴 HIGH-VISIBILITY NOISY LOGGING
    Logger.error(`\n❌ [ERROR DETECTED] ${req.method} ${req.originalUrl}`);
    Logger.error(`👉 Message: ${message}`);
    Logger.error(`👉 Status: ${statusCode}`);
    if (err.stack && process.env.NODE_ENV !== 'production') {
        Logger.error(`🔍 Stack Trace:\n${err.stack}`);
    }

    res.status(statusCode).json({
        success: false,
        status: 'error',
        statusCode,
        message,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

export default globalErrorHandler;
