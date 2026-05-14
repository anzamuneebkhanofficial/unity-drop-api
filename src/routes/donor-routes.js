/** @format */

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
import { cacheMiddleware } from '../middlewares/cache-middleware.js';
import { autoResetCache } from '../middlewares/invalidate-cache-middleware.js';
import { CacheNamespaces } from '../utils/cache-keys.js';
import { verifyCaptcha } from '../middlewares/verify-captcha.js';
import {
  authLimiter,
} from './../middlewares/rate-limiters.js';
//Public Routes
router.post('/donor-register', authLimiter, verifyCaptcha, RegisterDonor);
router.post(
  '/verify-email-for-donor',
  authLimiter,
  verifyCaptcha,
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
  autoResetCache(),
  DonorPasswordReset,
);
// Private Routes
// Change password - clears donor profile cache
router.put(
  '/donor-change-password',
  authenticateJWT(['donor']),
  autoResetCache(),
  changeDonorPassword,
);
router.post('/donor-logout', authenticateJWT(['donor']), DonorLogout);
router.get(
  '/get-donor',
  authenticateJWT(['donor']),
  GetDonor
);
// Delete donor - clears donor profile, donors list, and stats
router.delete(
  '/donor-delete-ourself',
  authenticateJWT(['donor']),
  autoResetCache(),
  DonorDeleteOurSelf,
);
router.get(
  '/get-all-patients-for-donor',
  authenticateJWT(['donor']),

  getAllPatientsForDonor,
);
router.get(
  '/get-patient-by-id-for-donor/:id',
  authenticateJWT(['donor']),
  getPatientByIdForDonor,
);
router.get(
  '/get-all-patient-requests-for-donor',
  authenticateJWT(['donor']),
  getAllPatientRequestsForDonor,
);
// Update request status - clears donor requests cache
router.put(
  '/update-patient-request-status-by-donor/:id',
  authenticateJWT(['donor']),
  autoResetCache(),
  updatePatientRequestStatusByDonor,
);
// Update profile - clears donor profile cache and stats
router.put(
  '/donor-update-profile',
  authenticateJWT(['donor']),
  autoResetCache(),
  DonorUpdateProfile,
);
router.get(
  '/get-stats',
  authenticateJWT(['donor']),

  getStats
);
// Add feedback - clears feedbacks cache
router.post('/feedback/add', authenticateJWT(['donor']), autoResetCache(), addFeedback);
// Filter patients - clears patients cache
router.get('/filter-all-patients', authenticateJWT(['donor']), cacheMiddleware(CacheNamespaces.PATIENTS), filterPatients);
export default router;
