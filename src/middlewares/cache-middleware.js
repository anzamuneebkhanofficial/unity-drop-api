/** @format */
import { cache } from '../config/cache.js';
import Logger from '../utils/logger.js';

/*
 * 💾 THE MEMORY SAVER (cacheMiddleware)
 * This tool acts like a fast memory for the app. 
 * When someone asks for data (like a list of patients), it checks if we already 
 * looked this up recently. If yes, it gives the saved answer instantly (super fast). 
 * If no, it goes to the real database, gets the answer, saves a copy in memory for 
 * next time, and then gives it to the user.
 */
export const cacheMiddleware = (namespace) => (req, res, next) => {
  // 1. Clean up the link (URL). Sometimes browsers add random numbers to the link.
  // We remove them so the app knows it is the exact same page we saved before.
  let pureUrl = req.originalUrl;
  pureUrl = pureUrl.replace(/([&?])_t=[^&]+(&|$)/, '$1').replace(/[&?]$/, '');

  // Build unique cache key including query string for pagination/filters
  const key = `${namespace}:${pureUrl}`;

  // 2. Look inside our fast memory to see if we already have the answer for this link.
  const cachedData = cache.get(key);

  if (cachedData) {
    // 3. IF WE FOUND SAVED DATA: We do a quick check. Sometimes the memory saves an empty list by mistake.
    // If the list is empty, we delete it from memory and force the app to check the real database again.
    const emptyIndicators = ['data', 'docs', 'list', 'results'];
    let isEmptyList = false;
    for (const key of emptyIndicators) {
      if (cachedData[key] && Array.isArray(cachedData[key]) && cachedData[key].length === 0) {
        isEmptyList = true;
        break;
      }
    }

    if (isEmptyList) {
      Logger.warn(`⚠️  [CACHE STALE] Found empty data in cache for ${key}. Purging and hitting database...`);
      cache.delete(key);
    } else {
      // If the list has real data, we send it to the user right now and STOP here.
      Logger.info(`🟩 [CACHE HIT] Successfully served from memory. Source: [${namespace}] -> URL: ${pureUrl}`);
      // Log summarized data keys for better "noise"
      const keys = Object.keys(cachedData);
      Logger.debug(`   ↳ Data Keys: ${keys.join(', ')}`);

      return res.status(200).json({
        success: true,
        message: 'Data fetched from cache',
        fromCache: true,
        ...cachedData,
      });
    }
  }

  // 4. IF WE DID NOT FIND DATA (or it was empty): We let the app talk to the real database.
  Logger.info(`🔴 [CACHE MISS] Navigating directly to the database. Source: [${namespace}] -> URL: ${pureUrl}`);

  // We set a trap to catch the answer before it goes back to the user.
  const originalJson = res.json.bind(res);

  // 5. This is the trap. When the database gives the final answer, we check it.
  res.json = (data) => {
    // If the answer is good (no errors) AND the answer actually exists...
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (data != null) {
        let shouldCache = true;

        // --- EMPTY DATA PROTECTION ---
        // We double check to make sure the database isn't giving us an empty list.
        // 1. Root is empty array
        if (Array.isArray(data) && data.length === 0) {
          shouldCache = false;
        }

        // 2. Object contains common empty collection keys
        const emptyIndicators = ['data', 'docs', 'list', 'results', 'users', 'patients', 'donors'];
        for (const key of emptyIndicators) {
          if (data[key] && Array.isArray(data[key]) && data[key].length === 0) {
            shouldCache = false;
            break;
          }
        }

        // If the data has real stuff in it, we save a copy in our fast memory for the next person.
        if (shouldCache) {
          cache.set(key, data);
        } else {
          Logger.debug(`[Cache] Skipped caching empty or incomplete payload for ${key}`);
        }
      }
    }
    // Finally, we let the answer go to the user.
    return originalJson(data);
  };

  next();
};