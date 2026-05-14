/** @format */
import { LRUCache } from 'lru-cache';
import Logger from '../utils/logger.js';

/**
 * Single LRU cache instance.
 * TTL is driven by the CACHE_TTL_MINUTES env variable (defaults to 5).
 * Change it in .env → entire application cache timing updates.
 */
const CACHE_TTL_MS = 1000 * 60 * (Number(process.env.CACHE_TTL_MINUTES) || 5);

const lru = new LRUCache({
  max: 500, // 500 slots is more than enough for this application
  ttl: CACHE_TTL_MS,
});

Logger.info(`[Cache] Started LRU Cache → TTL: ${Number(process.env.CACHE_TTL_MINUTES) || 5} minutes | Max Items: 500`);

/**
 * Completely drops all cache keys.
 * Called after any successful mutation (POST, PUT, DELETE).
 */
export const resetEntireCache = () => {
  lru.clear();
  Logger.info('[Cache] COMPLETE RESET: All cache cleared.');
};

export const cache = lru;
export default cache;
