/** @format */

/**
 * A central registry for all resources to easily clear cache without
 * leaking keys accidentally across unrelated items.
 */
export const CacheNamespaces = {
  USERS: 'users',
  ADMINS: 'admins',
  PATIENTS: 'patients',
  DONORS: 'donors',
  FEEDBACKS: 'feedbacks',
  REQUESTS: 'requests',
  STATS: 'stats',
};

export default CacheNamespaces;
