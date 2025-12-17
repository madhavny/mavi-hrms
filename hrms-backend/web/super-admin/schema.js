import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const createTenantSchema = Joi.object({
  name: Joi.string().max(150).required(),
  slug: Joi.string().max(50).lowercase().pattern(/^[a-z0-9-]+$/).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20).optional(),
  address: Joi.string().optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  country: Joi.string().max(100).default('India'),
  pincode: Joi.string().max(10).optional(),
  subscriptionPlan: Joi.string().max(50).optional(),
  enabledModules: Joi.array().items(Joi.string()).default([]),
  // Admin user to be created with tenant
  adminEmail: Joi.string().email().required(),
  adminPassword: Joi.string().min(8).required(),
  adminFirstName: Joi.string().max(50).required(),
  adminLastName: Joi.string().max(50).optional(),
});

export const updateTenantSchema = Joi.object({
  name: Joi.string().max(150).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
  address: Joi.string().optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  country: Joi.string().max(100).optional(),
  pincode: Joi.string().max(10).optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TRIAL').optional(),
  subscriptionPlan: Joi.string().max(50).optional(),
  subscriptionStart: Joi.date().optional(),
  subscriptionEnd: Joi.date().optional(),
  enabledModules: Joi.array().items(Joi.string()).optional(),
});
