import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/auth-middleware.js';
import {
  addFeedback,
  changeDonorPassword,
  DonorDeleteOurSelf,
  DonorLogin,
  DonorLogout,
  DonorPasswordReset,
  DonorPasswordResetLink,
  DonorUpdateProfile,
  filterPatients,
  getAllPatientRequestsForDonor,
  getAllPatientsForDonor,
  GetDonor,
  getPatientByIdForDonor,
  getStats,
  RegisterDonor,
  updatePatientRequestStatusByDonor,
  verifyEmailForDonor,
} from '../controllers/donor-controller.js';
import { cacheMiddleware, autoResetCache } from '../middlewares/cache-middleware.js';
import { CacheNamespaces } from '../cache/constants.js';
import { verifyCaptcha } from '../middlewares/verify-captcha.js';
import {
  authLimiter,
} from './../middlewares/rate-limiters.js';
// Public Routes
router.post('/donor-register', authLimiter, verifyCaptcha, autoResetCache([CacheNamespaces.DONORS, CacheNamespaces.STATS, CacheNamespaces.USERS]), RegisterDonor);
router.post(
  '/verify-email-for-donor',
  authLimiter,
  verifyCaptcha,
  autoResetCache([CacheNamespaces.DONORS, CacheNamespaces.STATS, CacheNamespaces.USERS]),
  verifyEmailForDonor
);
router.post('/donor-login', authLimiter, verifyCaptcha, DonorLogin);
router.post(
  '/donor-password-reset-link',
  authLimiter,
  verifyCaptcha,
  DonorPasswordResetLink,
);
router.post(
  '/donor-password-reset/:id/:token',
  authLimiter,
  verifyCaptcha,
  autoResetCache([CacheNamespaces.DONORS, CacheNamespaces.USERS]),
  DonorPasswordReset,
);
// Private Routes
router.put(
  '/donor-change-password',
  authenticateJWT(['donor']),
  autoResetCache([CacheNamespaces.DONORS, CacheNamespaces.USERS]),
  changeDonorPassword,
);
router.post('/donor-logout', authenticateJWT(['donor']), DonorLogout);
router.get(
  '/get-donor',
  authenticateJWT(['donor']),
  GetDonor
);
router.delete(
  '/donor-delete-ourself',
  authenticateJWT(['donor']),
  autoResetCache([CacheNamespaces.DONORS, CacheNamespaces.STATS, CacheNamespaces.REQUESTS, CacheNamespaces.FEEDBACKS, CacheNamespaces.USERS]),
  DonorDeleteOurSelf,
);
// Patient Lookup
router.get(
  '/get-all-patients-for-donor',
  authenticateJWT(['donor']),
  cacheMiddleware(CacheNamespaces.PATIENTS),
  getAllPatientsForDonor,
);
router.get(
  '/get-patient-by-id-for-donor/:id',
  authenticateJWT(['donor']),
  cacheMiddleware(CacheNamespaces.PATIENTS),
  getPatientByIdForDonor,
);
router.get('/filter-all-patients', authenticateJWT(['donor']), cacheMiddleware(CacheNamespaces.PATIENTS), filterPatients);
// Request Management
router.get(
  '/get-all-patient-requests-for-donor',
  authenticateJWT(['donor']),
  cacheMiddleware(CacheNamespaces.REQUESTS),
  getAllPatientRequestsForDonor,
);
router.put(
  '/update-patient-request-status-by-donor/:id',
  authenticateJWT(['donor']),
  autoResetCache([CacheNamespaces.REQUESTS, CacheNamespaces.STATS, CacheNamespaces.DONORS, CacheNamespaces.PATIENTS]),
  updatePatientRequestStatusByDonor,
);
// Profile & Feedback
router.put(
  '/donor-update-profile',
  authenticateJWT(['donor']),
  autoResetCache([CacheNamespaces.DONORS, CacheNamespaces.USERS]),
  DonorUpdateProfile,
);
router.get(
  '/get-stats',
  authenticateJWT(['donor']),
  cacheMiddleware(CacheNamespaces.STATS),
  getStats
);
router.post('/feedback/add', authenticateJWT(['donor']), autoResetCache([CacheNamespaces.FEEDBACKS]), addFeedback);
export default router;
