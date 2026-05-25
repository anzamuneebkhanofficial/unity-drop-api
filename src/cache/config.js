import { LRUCache } from 'lru-cache';
import config from '../config/env.js';
const cache = new LRUCache({
  max: 500, // Max items in memory
  ttl: config.cache.ttlMs, // Time to live (ms)
});

export default cache;
