import winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, json, colorize, errors, printf } = winston.format;

// 🛡️ Robust Environment Check (Bypasses trailing whitespace issues)
const getEnv = (name) => (process.env[name] || '').trim();
const isProd = getEnv('NODE_ENV') === 'production';
const isVercel = getEnv('VERCEL') === '1' || getEnv('PLATFORM') === 'vercel';

console.log(`\n👷 [INTERNAL DEBUG] Logger initializing in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode [Level: debug]`);

const devFormat = combine(
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : '';
    const stackStr = stack ? '\n' + stack : '';
    // Bold and Uppercase Level for maximum visibility
    const levelStr = level.toUpperCase().padEnd(7);
    return `[${timestamp}] ${levelStr}: ${message}${metaStr}${stackStr}`;
  }),
  colorize({ all: true })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// 📁 File Transports — Auto-delete old logs to save disk space
const fileTransports = [
  new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '5m',
    maxFiles: '3d',  // Auto-delete error logs after 3 days
  }),
  new winston.transports.DailyRotateFile({
    filename: 'logs/all-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '5m',
    maxFiles: '2d',  // Auto-delete all logs after 2 days
  })
];

const Logger = winston.createLogger({
  level: isProd ? (getEnv('LOG_LEVEL') || 'warn') : 'silly', // Extreme logging in Dev
  format: isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({ 
      level: 'silly',
      format: devFormat, // 🚀 Explicitly use the high-vis dev format
      handleExceptions: true,
      handleRejections: true
    }), 
    ...fileTransports
  ],
  exceptionHandlers: [
    new winston.transports.Console({ level: 'debug' })
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(isProd && !isVercel ? [new winston.transports.DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '5m',
      maxFiles: '7d', // Auto-delete promise rejections after 7 days
      zippedArchive: true
    })] : [])
  ],
  exitOnError: false
});

export default Logger;
