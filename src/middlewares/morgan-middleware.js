import morgan from 'morgan';
import Logger from '../utils/logger.js';
const morganMiddleware = morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (message) => Logger.http(message.trim()) },
  skip: (req) => process.env.NODE_ENV === 'production' && (req.url === '/health' || req.url === '/ping'),
});
export default morganMiddleware;