import { Router } from 'express';
import { login, getProfile, listUsers, createUser, getUser, updateUser, deleteUser, getRoles, getDepartments, getDesignations, getLocations, getDashboardStats, forgotPassword, verifyResetToken, resetPassword, uploadAvatar, deleteAvatar } from './index.js';
import { downloadEmployeeTemplate, bulkImportEmployees, exportEmployees, bulkMarkAttendance, getEmployeesForAttendance } from './bulk.js';
import { exportEmployeesExcel, exportEmployeesPDF, exportAttendanceExcel, exportAttendancePDF, exportLeaveExcel, exportLeavePDF } from './exports.js';
import { loginSchema, createUserSchema, updateUserSchema, forgotPasswordSchema, verifyResetTokenSchema, resetPasswordSchema } from './schema.js';
import validate from '@shared/middlewares/validate.middleware.js';
import { verifyTenantUser } from '@shared/middlewares/tenant.middleware.js';
import { uploadAvatar as uploadAvatarMiddleware, uploadCSV, handleMulterError } from '@shared/middlewares/upload.middleware.js';
import asyncHandler from '@shared/helpers/asyncHandler.js';

const router = Router();

// Public
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/verify-reset-token', validate(verifyResetTokenSchema), asyncHandler(verifyResetToken));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(resetPassword));

// Protected - Tenant users
router.use(verifyTenantUser);

router.get('/profile', asyncHandler(getProfile));
router.get('/dashboard', asyncHandler(getDashboardStats));

// Profile Avatar
router.post('/profile/avatar', uploadAvatarMiddleware, handleMulterError, asyncHandler(uploadAvatar));
router.delete('/profile/avatar', asyncHandler(deleteAvatar));

// User Management
router.get('/users', asyncHandler(listUsers));
router.post('/users', validate(createUserSchema), asyncHandler(createUser));

// Bulk Operations (must come before :id routes)
router.get('/users/template', asyncHandler(downloadEmployeeTemplate));
router.get('/users/export', asyncHandler(exportEmployees));
router.post('/users/bulk-import', uploadCSV, handleMulterError, asyncHandler(bulkImportEmployees));
router.post('/attendance/bulk-mark', asyncHandler(bulkMarkAttendance));
router.get('/attendance/employees', asyncHandler(getEmployeesForAttendance));

// Export to Excel/PDF
router.get('/export/employees/excel', asyncHandler(exportEmployeesExcel));
router.get('/export/employees/pdf', asyncHandler(exportEmployeesPDF));
router.get('/export/attendance/excel', asyncHandler(exportAttendanceExcel));
router.get('/export/attendance/pdf', asyncHandler(exportAttendancePDF));
router.get('/export/leave/excel', asyncHandler(exportLeaveExcel));
router.get('/export/leave/pdf', asyncHandler(exportLeavePDF));

// User by ID
router.get('/users/:id', asyncHandler(getUser));
router.patch('/users/:id', validate(updateUserSchema), asyncHandler(updateUser));
router.delete('/users/:id', asyncHandler(deleteUser));

// Master Data
router.get('/roles', asyncHandler(getRoles));
router.get('/departments', asyncHandler(getDepartments));
router.get('/designations', asyncHandler(getDesignations));
router.get('/locations', asyncHandler(getLocations));

export default router;
