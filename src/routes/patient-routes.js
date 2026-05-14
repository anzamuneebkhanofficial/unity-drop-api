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
} from '../controllers/patient-controller.js';
import { cacheMiddleware } from '../middlewares/cache-middleware.js';
import { autoResetCache } from '../middlewares/invalidate-cache-middleware.js';
import { CacheNamespaces } from '../utils/cache-keys.js';
import { verifyCaptcha } from '../middlewares/verify-captcha.js';
import { authLimiter } from '../middlewares/rate-limiters.js';

// =========================
// Public Routes
// =========================
router.post('/patient-register', authLimiter, verifyCaptcha, RegisterPatient);
router.post(
  '/verify-email-for-patient',
  authLimiter,
  verifyCaptcha,
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
  autoResetCache(),
  PatientPasswordReset
);
router.get(
  '/get-stats',
  authenticateJWT(['patient']),

  getStats
);
// =========================
// Private Routes
// =========================
// Change password - clears patient profile cache
router.put(
  '/patient-change-password',
  authenticateJWT(['patient']),
  autoResetCache(),
  changePatientPassword
);
router.post('/patient-logout', authenticateJWT(['patient']), PatientLogout);
router.get(
  '/get-patient',
  authenticateJWT(['patient']),

  GetPatient
);
// Delete patient - clears patient profile, patients list, and stats
router.delete(
  '/patient-delete-ourself',
  authenticateJWT(['patient']),
  autoResetCache(),
  PatientDeleteOurSelf
);
router.get(
  '/get-all-donors-for-patient',
  authenticateJWT(['patient']),

  getAllDonorsForPatient,
);
router.get(
  '/get-donor-by-id-for-patient/:id',
  authenticateJWT(['patient']),

  getDonorByIdForPatient,
);
// Send blood request - clears donor requests, patient requests, and stats
router.post(
  '/send-blood-request-to-donor/:donorId',
  authenticateJWT(['patient']),
  autoResetCache(),
  sendBloodRequestToDonor
);
// Update profile - clears patient profile cache and stats
router.put(
  '/patient-update-profile',
  authenticateJWT(['patient']),
  autoResetCache(),
  PatientUpdateProfile
);

// Add feedback - clears feedbacks cache
router.post('/feedback/add', authenticateJWT(['patient']), autoResetCache(), addFeedback);
export default router;
