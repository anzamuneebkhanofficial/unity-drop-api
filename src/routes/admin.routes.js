/** @format */

import express from 'express';
const router = express.Router();
import {
  AdminDeleteOurSelf,
  AdminLogin,
  AdminLogout,
  AdminPasswordReset,
  AdminPasswordResetLink,
  AdminUpdateProfile,
  changePassword,
  deleteSingleDonor,
  deleteSinglePatient,
  exportDonors,
  exportPatients,
  filterDonors,
  filterPatients,
  filterUsers,
  filterUsersCombined,
  generateSuperKey,
  GetAdmin,
  getAllBadRequests,
  getAllDonorsForAdmin,
  getAllFeedbacks,
  getAllPatientsForAdmin,
  getSingleDonor,
  getSinglePatient,
  getStats,
  getSuperKey,
  RegisterAdmin,
  resolveBadRequest,
  verifyEmailForAdmin,
} from '../controllers/admin.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { verifyCaptcha } from '../middlewares/verifyCaptcha.js';
//Public Routes
router.post('/register', verifyCaptcha, RegisterAdmin);
router.post('/verify-email-for-admin', verifyCaptcha, verifyEmailForAdmin);
router.post('/admin-login', verifyCaptcha, AdminLogin);
router.post(
  '/admin-password-reset-link',
  verifyCaptcha,
  AdminPasswordResetLink
);
router.post(
  '/admin-password-reset/:id/:token',
  verifyCaptcha,
  AdminPasswordReset
);
// Private Routes
router.put(
  '/admin-change-password',
  authenticateJWT(['admin']),
  changePassword
);
router.post('/admin-logout', authenticateJWT(['admin']), AdminLogout);
router.get('/get-admin', authenticateJWT(['admin']), GetAdmin);
router.delete(
  '/admin-delete-ourself',
  authenticateJWT(['admin']),
  AdminDeleteOurSelf
);
router.get(
  '/get-all-donors-from-admin',
  authenticateJWT(['admin']),
  getAllDonorsForAdmin
);
router.get('/getSingleDonor/:id', authenticateJWT(['admin']), getSingleDonor);
router.delete(
  '/deleteSingleDonor/:id',
  authenticateJWT(['admin']),
  deleteSingleDonor
);
router.get('/export-donors', authenticateJWT(['admin']), exportDonors);
router.get(
  '/get-all-patients-from-admin',
  authenticateJWT(['admin']),
  getAllPatientsForAdmin
);
router.get(
  '/getSinglePatient/:id',
  authenticateJWT(['admin']),
  getSinglePatient
);
router.delete(
  '/deleteSinglePatient/:id',
  authenticateJWT(['admin']),
  deleteSinglePatient
);
// Super Admin
router.post(
  '/super/generate-key',
  authenticateJWT(['admin']),
  generateSuperKey
);
// Super Admin: get current active key
router.get('/super/get-key', authenticateJWT(['admin']), getSuperKey);

router.get('/export-patients', authenticateJWT(['admin']), exportPatients);
router.get('/get-stats', authenticateJWT(['admin']), getStats);
router.put(
  '/admin-update-profile',
  authenticateJWT(['admin']),
  AdminUpdateProfile
);
router.get('/bad-requests', authenticateJWT(['admin']), getAllBadRequests);
router.post(
  '/bad-requests/resolve',
  authenticateJWT(['admin']),
  resolveBadRequest
);
router.get('/filter-donors', authenticateJWT(['admin']), filterDonors);
router.get('/filter-patients', authenticateJWT(['admin']), filterPatients);
router.get('/filter-userss', authenticateJWT(['admin']), filterUsersCombined);
// ✅ Single flexible filter API
router.get('/filter-users', authenticateJWT(['admin']), filterUsers);
router.get('/feedback/all', authenticateJWT(['admin']), getAllFeedbacks);
export default router;
