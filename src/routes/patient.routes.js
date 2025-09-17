/** @format */

import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middlewares/auth.middleware.js';
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
  sendBloodRequestToDonor,
  getPatientResponses,
  filterDonors,
  addFeedback,
  getStats,
  patientSuggestionsAI,
} from '../controllers/patient.controller.js';
import { verifyCaptcha } from '../middlewares/verifyCaptcha.js';

// =========================
// Public Routes
// =========================
router.post('/patient-register', verifyCaptcha, RegisterPatient);
router.post('/verify-email-for-patient', verifyCaptcha, verifyEmailForPatient);
router.post('/patient-login', verifyCaptcha, PatientLogin);
router.post(
  '/patient-password-reset-link',
  verifyCaptcha,
  PatientPasswordResetLink
);
router.post(
  '/patient-password-reset/:id/:token',
  verifyCaptcha,
  PatientPasswordReset
);
router.get('/get-stats', authenticateJWT(['patient']), getStats);
// =========================
// Private Routes
// =========================
router.put(
  '/patient-change-password',
  authenticateJWT(['patient']),
  changePatientPassword
);
router.post('/patient-logout', authenticateJWT(['patient']), PatientLogout);
router.get('/get-patient', authenticateJWT(['patient']), GetPatient);
router.delete(
  '/patient-delete-ourself',
  authenticateJWT(['patient']),
  PatientDeleteOurSelf
);
router.get(
  '/get-all-donors-for-patient',
  authenticateJWT(['patient']),
  getAllDonorsForPatient
);
router.get(
  '/get-donor-by-id-for-patient/:id',
  authenticateJWT(['patient']),
  getDonorByIdForPatient
);
router.post(
  '/send-blood-request-to-donor/:donorId',
  authenticateJWT(['patient']),
  sendBloodRequestToDonor
);
router.put(
  '/patient-update-profile',
  authenticateJWT(['patient']),
  PatientUpdateProfile
);
router.get(
  '/get-admin-donor-responses',
  authenticateJWT(['patient']),
  getPatientResponses
);

router.get(
  '/suggestions-ai',
  authenticateJWT(['patient']),
  patientSuggestionsAI
);
router.get('/filter-all-donors', authenticateJWT(['patient']), filterDonors);
router.post('/feedback/add', authenticateJWT(['patient']), addFeedback);
export default router;
