import express from 'express';
import authRoutes from '../auth/routes.js';
import superAdminRoutes from '../super-admin/routes.js';
import tenantRoutes from '../tenant/routes.js';
import attendanceRoutes from '../attendance/routes.js';
import leaveRoutes from '../leave/routes.js';
import auditRoutes from '../audit/routes.js';

const router = express.Router();

// Super Admin routes
router.use('/super-admin', superAdminRoutes);

// Tenant routes
router.use('/tenant', tenantRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/audit', auditRoutes);

// Legacy auth routes (can be deprecated later)
router.use('/', authRoutes);

export default router;