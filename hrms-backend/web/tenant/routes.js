import { Router } from 'express';
import { login, getProfile, listUsers, createUser, getUser, updateUser, deleteUser, getRoles, getDepartments, getDesignations, getLocations, getDashboardStats } from './index.js';
import { loginSchema, createUserSchema, updateUserSchema } from './schema.js';
import validate from '@shared/middlewares/validate.middleware.js';
import { verifyTenantUser } from '@shared/middlewares/tenant.middleware.js';
import asyncHandler from '@shared/helpers/asyncHandler.js';

const router = Router();

// Public
router.post('/login', validate(loginSchema), asyncHandler(login));

// Protected - Tenant users
router.use(verifyTenantUser);

router.get('/profile', asyncHandler(getProfile));
router.get('/dashboard', asyncHandler(getDashboardStats));

// User Management
router.get('/users', asyncHandler(listUsers));
router.post('/users', validate(createUserSchema), asyncHandler(createUser));
router.get('/users/:id', asyncHandler(getUser));
router.patch('/users/:id', validate(updateUserSchema), asyncHandler(updateUser));
router.delete('/users/:id', asyncHandler(deleteUser));

// Master Data
router.get('/roles', asyncHandler(getRoles));
router.get('/departments', asyncHandler(getDepartments));
router.get('/designations', asyncHandler(getDesignations));
router.get('/locations', asyncHandler(getLocations));

export default router;
