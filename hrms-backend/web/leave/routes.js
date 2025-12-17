import { Router } from 'express';
import {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getMyLeaveBalance,
  getLeaveBalances,
  allocateLeaveBalance,
  applyLeave,
  getMyLeaveRequests,
  getLeaveRequests,
  getLeaveRequest,
  reviewLeaveRequest,
  cancelLeaveRequest
} from './index.js';
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  allocateLeaveBalanceSchema,
  applyLeaveSchema,
  reviewLeaveSchema
} from './schema.js';
import validate from '@shared/middlewares/validate.middleware.js';
import { verifyTenantUser } from '@shared/middlewares/tenant.middleware.js';
import asyncHandler from '@shared/helpers/asyncHandler.js';

const router = Router();

// Protected - Tenant users
router.use(verifyTenantUser);

// Leave Types
router.get('/types', asyncHandler(getLeaveTypes));
router.post('/types', validate(createLeaveTypeSchema), asyncHandler(createLeaveType));
router.patch('/types/:id', validate(updateLeaveTypeSchema), asyncHandler(updateLeaveType));
router.delete('/types/:id', asyncHandler(deleteLeaveType));

// Leave Balances
router.get('/my-balance', asyncHandler(getMyLeaveBalance));
router.get('/balances', asyncHandler(getLeaveBalances));
router.post('/balances/allocate', validate(allocateLeaveBalanceSchema), asyncHandler(allocateLeaveBalance));

// Leave Requests
router.post('/apply', validate(applyLeaveSchema), asyncHandler(applyLeave));
router.get('/my-requests', asyncHandler(getMyLeaveRequests));
router.get('/requests', asyncHandler(getLeaveRequests));
router.get('/requests/:id', asyncHandler(getLeaveRequest));
router.patch('/requests/:id/review', validate(reviewLeaveSchema), asyncHandler(reviewLeaveRequest));
router.patch('/requests/:id/cancel', asyncHandler(cancelLeaveRequest));

export default router;
