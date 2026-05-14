/** @format */

import express from 'express';
const router = express.Router();
import {
  authLimiter,
  exportLimiter,
} from './../middlewares/rate-limiters.js';
import {
  AdminDeleteOurSelf,
  AdminLogin,
  AdminLogout,
  AdminPasswordReset,
  AdminPasswordResetLink,
  AdminUpdateProfile,
  changePassword,
  deleteSingleAdmin,
  getAllAdmins,
  deleteSingleDonor,
  deleteSinglePatient,
  exportDonors,
  exportPatients,
  filterDonors,
  filterPatients,
  filterUsers,
  GetAdminStatus,
  GetAdmin,
  getAllDonorsForAdmin,
  getAllFeedbacks,
  getAllPatientsForAdmin,
  getSingleDonor,
  getSinglePatient,
  getStats,
  RegisterAdmin,
  verifyEmailForAdmin,
  updateAdminApproval,
  updateAdminPrivileges,
} from '../controllers/admin-controller.js';
import { authenticateJWT } from '../middlewares/auth-middleware.js';
import { cacheMiddleware } from '../middlewares/cache-middleware.js';
import { autoResetCache } from '../middlewares/invalidate-cache-middleware.js';
import { CacheNamespaces } from '../utils/cache-keys.js';
import { verifyCaptcha } from '../middlewares/verify-captcha.js';

// Public Routes
router.get('/status', GetAdminStatus);
// Note: No autoResetCache on register/verify — they don't affect cached list data
router.post('/register', authLimiter, verifyCaptcha, RegisterAdmin);
router.post('/verify-email-for-admin', authLimiter, verifyCaptcha, verifyEmailForAdmin);
router.post('/admin-login', authLimiter, verifyCaptcha, AdminLogin);
router.post('/admin-password-reset-link', authLimiter, verifyCaptcha, AdminPasswordResetLink);
router.post(
  '/admin-password-reset/:id/:token',
  authLimiter,
  verifyCaptcha,
  autoResetCache(),
  AdminPasswordReset
);

// Private Routes
router.put('/admin-change-password', authenticateJWT(['admin']), autoResetCache(), changePassword);
router.post('/admin-logout', authenticateJWT(['admin']), AdminLogout);
router.get('/get-admin', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), GetAdmin);
router.delete('/admin-delete-ourself', authenticateJWT(['admin']), autoResetCache(), AdminDeleteOurSelf);

router.get('/get-all-donors-from-admin', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), getAllDonorsForAdmin);
router.get('/getSingleDonor/:id', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), getSingleDonor);
router.delete('/deleteSingleDonor/:id', authenticateJWT(['admin']), autoResetCache(), deleteSingleDonor);
router.get('/export-donors', exportLimiter, authenticateJWT(['admin']), exportDonors);

router.get('/get-all-patients-from-admin', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), getAllPatientsForAdmin);
router.get('/getSinglePatient/:id', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), getSinglePatient);
router.delete('/deleteSinglePatient/:id', authenticateJWT(['admin']), autoResetCache(), deleteSinglePatient);
router.get('/export-patients', exportLimiter, authenticateJWT(['admin']), exportPatients);

router.delete('/deleteSingleAdmin/:id', authenticateJWT(['admin']), autoResetCache(), deleteSingleAdmin);
router.get('/get-all-admins', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), getAllAdmins);
// Super Admin only: approve or reject a pending admin
router.patch('/admin-approval/:id', authenticateJWT(['admin']), autoResetCache(), updateAdminApproval);
// Super Admin only: grant or revoke delete privilege for a normal admin
router.patch('/admin-privileges/:id', authenticateJWT(['admin']), autoResetCache(), updateAdminPrivileges);

router.get('/get-stats', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), getStats);
router.put('/admin-update-profile', authenticateJWT(['admin']), autoResetCache(), AdminUpdateProfile);

router.get('/filter-donors', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), filterDonors);
router.get('/filter-patients', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), filterPatients);
router.get('/filter-users', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), filterUsers);

router.get('/feedback/all', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), getAllFeedbacks);

export default router;
