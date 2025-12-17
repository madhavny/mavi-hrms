import { Router } from 'express';
import { login, createTenant, listTenants, getTenant, updateTenant, deleteTenant, changeTenantStatus, permanentlyDeleteTenant, getDashboardStats } from './index.js';
import { loginSchema, createTenantSchema, updateTenantSchema } from './schema.js';
import validate from '@shared/middlewares/validate.middleware.js';
import { verifySuperAdmin } from '@shared/middlewares/superAdmin.middleware.js';
import asyncHandler from '@shared/helpers/asyncHandler.js';

const router = Router();

// Public
router.post('/login', validate(loginSchema), asyncHandler(login));

// Protected - Super Admin only
router.use(verifySuperAdmin);

router.get('/dashboard', asyncHandler(getDashboardStats));
router.post('/tenants', validate(createTenantSchema), asyncHandler(createTenant));
router.get('/tenants', asyncHandler(listTenants));
router.get('/tenants/:id', asyncHandler(getTenant));
router.patch('/tenants/:id', validate(updateTenantSchema), asyncHandler(updateTenant));
router.patch('/tenants/:id/status', asyncHandler(changeTenantStatus));
router.delete('/tenants/:id', asyncHandler(deleteTenant));
router.delete('/tenants/:id/permanent', asyncHandler(permanentlyDeleteTenant));

export default router;
