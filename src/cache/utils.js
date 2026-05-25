import cache from './config.js';
import Logger from '../utils/logger.js';
export const deleteByNamespace = (namespace) => {
  if (!namespace) return;
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(`${namespace}:`)) {
      cache.delete(key);
      count++;
    }
  }
  if (count > 0) {
    Logger.info(` [Cache Utils] Purged ${count} items from category: [${namespace}]`);
  }
};
export const resetEntireCache = () => {
  cache.clear();
  Logger.warn('🔥 [Cache Utils] Complete system reset performed.');
};
