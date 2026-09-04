/** @format */
import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/auth-middleware.js';
import {
  changePatientPassword,
  PatientDeleteOurSelf,
  PatientLogin,
  PatientLogout,
  PatientPasswordReset,
  PatientPasswordResetLink,
  PatientUpdateProfile,
  getAllDonorsForPatient,
  GetPatient,
  RegisterPatient,
  verifyEmailForPatient,
  getDonorByIdForPatient,
  filterDonors,
  addFeedback,
  getStats,
  sendBloodRequestToDonor,
  getAllDonorRequestsForPatient,
} from '../controllers/patient-controller.js';
import { cacheMiddleware, autoResetCache } from '../middlewares/cache-middleware.js';
import { CacheNamespaces } from '../cache/constants.js';
import { verifyCaptcha } from '../middlewares/verify-captcha.js';
import { authLimiter } from '../middlewares/rate-limiters.js';
// Public Routes
router.post('/patient-register', authLimiter, verifyCaptcha, autoResetCache([CacheNamespaces.PATIENTS, CacheNamespaces.STATS, CacheNamespaces.USERS]), RegisterPatient);
router.post(
  '/verify-email-for-patient',
  authLimiter,
  verifyCaptcha,
  autoResetCache([CacheNamespaces.PATIENTS, CacheNamespaces.STATS, CacheNamespaces.USERS]),
  verifyEmailForPatient
);
router.post('/patient-login', authLimiter, verifyCaptcha, PatientLogin);
router.post(
  '/patient-password-reset-link',
  authLimiter,
  verifyCaptcha,
  PatientPasswordResetLink
);
router.post(
  '/patient-password-reset/:id/:token',
  authLimiter,
  verifyCaptcha,
  autoResetCache([CacheNamespaces.PATIENTS, CacheNamespaces.USERS]),
  PatientPasswordReset
);
// Private Routes
router.put(
  '/patient-change-password',
  authenticateJWT(['patient']),
  autoResetCache([CacheNamespaces.PATIENTS, CacheNamespaces.USERS]),
  changePatientPassword
);
router.post('/patient-logout', authenticateJWT(['patient']), PatientLogout);
router.get(
  '/get-patient',
  authenticateJWT(['patient']),
  GetPatient
);
router.delete(
  '/patient-delete-ourself',
  authenticateJWT(['patient']),
  autoResetCache([CacheNamespaces.PATIENTS, CacheNamespaces.STATS, CacheNamespaces.REQUESTS, CacheNamespaces.FEEDBACKS, CacheNamespaces.USERS]),
  PatientDeleteOurSelf
);
router.put(
  '/patient-update-profile',
  authenticateJWT(['patient']),
  autoResetCache([CacheNamespaces.PATIENTS, CacheNamespaces.USERS]),
  PatientUpdateProfile
);
// Donor Look
router.get(
  '/get-all-donors-for-patient',
  authenticateJWT(['patient']),
  cacheMiddleware(CacheNamespaces.DONORS),
  getAllDonorsForPatient,
);
router.get(
  '/get-donor-by-id-for-patient/:id',
  authenticateJWT(['patient']),
  cacheMiddleware(CacheNamespaces.DONORS),
  getDonorByIdForPatient,
);
router.get('/filter-donors', authenticateJWT(['patient']), cacheMiddleware(CacheNamespaces.DONORS), filterDonors);
// Blood Requests & System
router.post(
  '/send-blood-request-to-donor/:donorId',
  authenticateJWT(['patient']),
  autoResetCache([CacheNamespaces.REQUESTS, CacheNamespaces.STATS, CacheNamespaces.DONORS]),
  sendBloodRequestToDonor
);
router.get(
  '/get-all-donor-requests-for-patient',
  authenticateJWT(['patient']),
  cacheMiddleware(CacheNamespaces.REQUESTS),
  getAllDonorRequestsForPatient
);
router.get(
  '/get-stats',
  authenticateJWT(['patient']),
  cacheMiddleware(CacheNamespaces.STATS),
  getStats
);
router.post('/feedback/add', authenticateJWT(['patient']), autoResetCache([CacheNamespaces.FEEDBACKS]), addFeedback);

export default router;
