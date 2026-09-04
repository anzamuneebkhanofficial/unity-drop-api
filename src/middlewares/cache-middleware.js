
import cache from '../cache/config.js';
import { deleteByNamespace, resetEntireCache } from '../cache/utils.js';
import Logger from '../utils/logger.js';
export const cacheMiddleware = (namespace) => (req, res, next) => {
  const pureUrl = req.originalUrl.replace(/([&?])_t=[^&]+(&|$)/, '$1').replace(/[&?]$/, '');
  const userIdentifier = req.user ? `:${req.user.id || req.user._id}` : '';
  const key = `${namespace}:${pureUrl}${userIdentifier}`;
  const cachedData = cache.get(key);
  if (cachedData) {
    Logger.info(`🟩 [CACHE HIT] Serving [${namespace}] from memory.`);
    return res.status(200).json({
      success: true,
      message: 'Data served from cache',
      fromCache: true,
      ...cachedData,
    });
  }
  // response to save to cache for next time
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && data != null) {
      cache.set(key, data);
    }
    return originalJson(data);
  };
  next();
};
// autoResetCache => Cleaner
// Used on POST, PUT, PATCH, and DELETE routes to clear memory.
export const autoResetCache = (namespaces = []) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (!namespaces || namespaces.length === 0) {
        resetEntireCache();
      } else {
        namespaces.forEach((ns) => deleteByNamespace(ns));
      }
    }
    return originalJson(data);
  };
  next();
};
