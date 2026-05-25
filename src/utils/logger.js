import winston from 'winston';
import 'winston-daily-rotate-file';
const { combine, timestamp, json, colorize, errors, printf } = winston.format;
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
const fileTransports = [
  new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '5m',
    maxFiles: '1d',  // Auto-delete error logs after 1 day
  }),
  new winston.transports.DailyRotateFile({
    filename: 'logs/all-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '5m',
    maxFiles: '1d',  // Auto-delete all logs after 1 day
  })
];
const Logger = winston.createLogger({
  level: isProd ? (getEnv('LOG_LEVEL') || 'warn') : 'silly',
  format: isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      level: isProd ? (getEnv('LOG_LEVEL') || 'warn') : 'silly',
      format: isProd ? prodFormat : devFormat, // 🚀 Use prodFormat in production, devFormat in dev
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
      maxFiles: '1d', // Auto-delete promise rejections after 1 day
      zippedArchive: true
    })] : [])
  ],
  exitOnError: false
});

export default Logger;
