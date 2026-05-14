/** @format */

import { Router } from 'express';
import AdminRoutes from './admin-routes.js';
import DonorRoutes from './donor-routes.js';
import PatientRoutes from './patient-routes.js';
import PublicFeedbackRoutes from './public-feedback-routes.js';

const router = Router();
import { authenticateJWT } from '../middlewares/auth-middleware.js';

router.use('/admin', AdminRoutes);
router.use('/donor', DonorRoutes);
router.use('/patient', PatientRoutes);
router.use('/public-feedback', PublicFeedbackRoutes);

export default router;
