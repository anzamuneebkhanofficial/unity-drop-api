import express from 'express';
const router = express.Router();
import {
  authLimiter,
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
import { cacheMiddleware, autoResetCache } from '../middlewares/cache-middleware.js';
import { CacheNamespaces } from '../cache/constants.js';
import { verifyCaptcha } from '../middlewares/verify-captcha.js';
// Public Routes
router.get('/status', GetAdminStatus);
router.post('/register', authLimiter, verifyCaptcha, autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.STATS, CacheNamespaces.USERS]), RegisterAdmin);
router.post('/verify-email-for-admin', authLimiter, verifyCaptcha, autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.STATS, CacheNamespaces.USERS]), verifyEmailForAdmin);
router.post('/admin-login', authLimiter, verifyCaptcha, AdminLogin);
router.post('/admin-password-reset-link', authLimiter, verifyCaptcha, AdminPasswordResetLink);
router.post(
  '/admin-password-reset/:id/:token',
  authLimiter,
  verifyCaptcha,
  autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.USERS]),
  AdminPasswordReset
);
// Private Routes
router.put('/admin-change-password', authenticateJWT(['admin']), autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.USERS]), changePassword);
router.post('/admin-logout', authenticateJWT(['admin']), AdminLogout);
router.get('/get-admin', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), GetAdmin);
router.delete('/admin-delete-ourself', authenticateJWT(['admin']), autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.STATS, CacheNamespaces.USERS]), AdminDeleteOurSelf);
// Donor Management
router.get('/get-all-donors-from-admin', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.DONORS), getAllDonorsForAdmin);
router.get('/getSingleDonor/:id', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.DONORS), getSingleDonor);
router.delete('/deleteSingleDonor/:id', authenticateJWT(['admin']), autoResetCache([CacheNamespaces.DONORS, CacheNamespaces.STATS, CacheNamespaces.REQUESTS, CacheNamespaces.FEEDBACKS, CacheNamespaces.USERS]), deleteSingleDonor);
// Patient Management
router.get('/get-all-patients-from-admin', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.PATIENTS), getAllPatientsForAdmin);
router.get('/getSinglePatient/:id', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.PATIENTS), getSinglePatient);
router.delete('/deleteSinglePatient/:id', authenticateJWT(['admin']), autoResetCache([CacheNamespaces.PATIENTS, CacheNamespaces.STATS, CacheNamespaces.REQUESTS, CacheNamespaces.FEEDBACKS, CacheNamespaces.USERS]), deleteSinglePatient);
// Admin Management
router.delete('/deleteSingleAdmin/:id', authenticateJWT(['admin']), autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.STATS, CacheNamespaces.USERS]), deleteSingleAdmin);
router.get('/get-all-admins', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.ADMINS), getAllAdmins);
router.patch('/admin-approval/:id', authenticateJWT(['admin']), autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.STATS, CacheNamespaces.USERS]), updateAdminApproval);
router.patch('/admin-privileges/:id', authenticateJWT(['admin']), autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.USERS]), updateAdminPrivileges);
// System & Feedback
router.get('/get-stats', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.STATS), getStats);
router.put('/admin-update-profile', authenticateJWT(['admin']), autoResetCache([CacheNamespaces.ADMINS, CacheNamespaces.USERS]), AdminUpdateProfile);
router.get('/filter-users', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.USERS), filterUsers);
router.get('/feedback/all', authenticateJWT(['admin']), cacheMiddleware(CacheNamespaces.FEEDBACKS), getAllFeedbacks);
export default router;
