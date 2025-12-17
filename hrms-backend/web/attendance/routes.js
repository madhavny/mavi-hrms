import { Router } from 'express';
import { clockIn, clockOut, getMyAttendance, getAttendance, markAttendance, updateAttendance, getAttendanceSummary } from './index.js';
import { markAttendanceSchema, updateAttendanceSchema } from './schema.js';
import validate from '@shared/middlewares/validate.middleware.js';
import { verifyTenantUser } from '@shared/middlewares/tenant.middleware.js';
import asyncHandler from '@shared/helpers/asyncHandler.js';

const router = Router();

// Protected - Tenant users
router.use(verifyTenantUser);

// Employee self-service
router.post('/clock-in', asyncHandler(clockIn));
router.post('/clock-out', asyncHandler(clockOut));
router.get('/my-attendance', asyncHandler(getMyAttendance));
router.get('/my-summary', asyncHandler(getAttendanceSummary));

// Admin/HR/Manager
router.get('/', asyncHandler(getAttendance));
router.post('/mark', validate(markAttendanceSchema), asyncHandler(markAttendance));
router.patch('/:id', validate(updateAttendanceSchema), asyncHandler(updateAttendance));
router.get('/summary', asyncHandler(getAttendanceSummary));

export default router;
