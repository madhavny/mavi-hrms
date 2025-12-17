import { Router } from 'express';
import {
  getAuditLogs,
  getAuditLogDetail,
  getEntityAuditLogs,
  getEntityTypes,
  getAuditStats,
  getUserActivity
} from './index.js';
import { verifyTenantUser, requireRole } from '@shared/middlewares/tenant.middleware.js';
import asyncHandler from '@shared/helpers/asyncHandler.js';

const router = Router();

// All audit routes require authentication
router.use(verifyTenantUser);

// Only Admin and HR can view audit logs
router.use(requireRole('ADMIN', 'HR'));

// Get audit log statistics
router.get('/stats', asyncHandler(getAuditStats));

// Get available entity types for filtering
router.get('/entity-types', asyncHandler(getEntityTypes));

// Get audit logs for a specific entity (e.g., User, Attendance)
router.get('/entity/:entity/:entityId', asyncHandler(getEntityAuditLogs));

// Get user activity (all actions by a specific user)
router.get('/user/:userId', asyncHandler(getUserActivity));

// Get audit log detail
router.get('/:id', asyncHandler(getAuditLogDetail));

// Get audit logs (list with filters)
router.get('/', asyncHandler(getAuditLogs));

export default router;
