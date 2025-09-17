/** @format */

import express from 'express';
const router = express.Router();

import { authenticateJWT } from '../middlewares/auth.middleware.js';
import {
  addFeedback,
  changeDonorPassword,
  DonorDeleteOurSelf,
  DonorLogin,
  DonorLogout,
  DonorPasswordReset,
  DonorPasswordResetLink,
  donorSuggestionsAI,
  DonorUpdateProfile,
  filterPatients,
  getAllPatientRequestsForDonor,
  getAllPatientsForDonor,
  GetDonor,
  getDonorWarnings,
  getPatientByIdForDonor,
  getStats,
  RegisterDonor,
  updatePatientRequestStatusByDonor,
  verifyEmailForDonor,
} from '../controllers/donor.controller.js';
import { verifyCaptcha } from '../middlewares/verifyCaptcha.js';
//Public Routes
router.post('/donor-register', verifyCaptcha, RegisterDonor);
router.post('/verify-email-for-donor', verifyCaptcha, verifyEmailForDonor);
router.post('/donor-login', verifyCaptcha, DonorLogin);
router.post(
  '/donor-password-reset-link',
  verifyCaptcha,
  DonorPasswordResetLink
);
router.post(
  '/donor-password-reset/:id/:token',
  verifyCaptcha,
  DonorPasswordReset
);
// Private Routes
router.put(
  '/donor-change-password',
  authenticateJWT(['donor']),
  changeDonorPassword
);
router.post('/donor-logout', authenticateJWT(['donor']), DonorLogout);
router.get('/get-donor', authenticateJWT(['donor']), GetDonor);
router.delete(
  '/donor-delete-ourself',
  authenticateJWT(['donor']),
  DonorDeleteOurSelf
);
router.get(
  '/get-all-patients-for-donor',
  authenticateJWT(['donor']),
  getAllPatientsForDonor
);
router.get(
  '/get-patient-by-id-for-donor/:id',
  authenticateJWT(['donor']),
  getPatientByIdForDonor
);
router.get(
  '/get-all-patient-requests-for-donor',
  authenticateJWT(['donor']),
  getAllPatientRequestsForDonor
);
router.put(
  '/update-patient-request-status-by-donor/:id',
  authenticateJWT(['donor']),
  updatePatientRequestStatusByDonor
);
router.put(
  '/donor-update-profile',
  authenticateJWT(['donor']),
  DonorUpdateProfile
);
router.get('/get-stats', authenticateJWT(['donor']), getStats);
router.get('/get-donor-warnings', authenticateJWT(['donor']), getDonorWarnings);
router.get('/filter-all-patients', authenticateJWT(['donor']), filterPatients);
router.post('/feedback/add', authenticateJWT(['donor']), addFeedback);
// router.get(
//   '/suggestions-no-ai',
//   authenticateJWT(['donor']),
//   suggestionLimiter,
//   donorSuggestionsNoAI
// );
router.get('/suggestions-ai', authenticateJWT(['donor']), donorSuggestionsAI);
export default router;
