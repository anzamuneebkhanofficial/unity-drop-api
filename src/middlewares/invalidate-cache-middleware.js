import { resetEntireCache } from '../config/cache.js';
import Logger from '../utils/logger.js';


/*
 * 🧹 THE CLEANUP CREW (invalidateCacheAfter)
 * This watches for anytime someone adds, changes, or deletes something.
 * If the change works perfectly (no errors), it does two simple things:
 * 1. It throws away the old saved memory so nobody sees old info.
 * 2. It sends a message to everyone's phone/computer saying "Hey, refresh your screen!"
 */
export const autoResetCache = () => (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    // 🛡️ ONLY ON SUCCESS: We only clean up if the save actually worked.
    // 🚦 STOP ON ERROR: If there is a mistake, we do nothing and leave the memory alone.

    // Check if this action is changing data (like adding or deleting)
    const isChangingData = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (res.statusCode >= 200 && res.statusCode < 300 && isChangingData) {

      // 🚀 1. THROW AWAY OLD MEMORY
      resetEntireCache();
      Logger.info(`🍀 [SUCCESS] ${req.method} ${req.originalUrl} -> Threw away old memory...`);

      Logger.info(`📡 [CACHE INVALIDATED] Cache cleared successfully.`);
    }
    return originalJson(data);
  };

  next();
};

export default autoResetCache;