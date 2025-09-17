/** @format */

// src/services/cache.js
const memoryCache = new Map();

export default {
  async get(key) {
    const entry = memoryCache.get(key);
    if (!entry) return null;

    const { value, expiresAt } = entry;
    if (expiresAt && Date.now() > expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return value;
  },
  async set(key, value, { ttl = 300 } = {}) {
    const expiresAt = Date.now() + ttl * 1000;
    memoryCache.set(key, { value, expiresAt });
  },
  async del(key) {
    memoryCache.delete(key);
  },
};
