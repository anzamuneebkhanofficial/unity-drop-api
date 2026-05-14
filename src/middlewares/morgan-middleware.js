import morgan from 'morgan';
import Logger from '../utils/logger.js';

const isProd = process.env.NODE_ENV === 'production';

const morganMiddleware = morgan(isProd ? 'combined' : 'dev', {
  stream: { write: (message) => Logger.http(message.trim()) },
  skip: (req) => isProd && (req.url === '/health' || req.url === '/ping')
});

export default morganMiddleware;
