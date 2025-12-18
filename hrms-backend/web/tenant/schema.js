import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  tenant: Joi.string().required(), // tenant slug
});

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().max(50).required(),
  lastName: Joi.string().max(50).optional(),
  phone: Joi.string().max(20).optional(),
  employeeCode: Joi.string().max(20).optional(),
  roleId: Joi.number().required(),
  departmentId: Joi.number().optional(),
  designationId: Joi.number().optional(),
  locationId: Joi.number().optional(),
  reportingTo: Joi.number().optional(),
  dateOfJoining: Joi.date().optional(),
  employmentType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT').optional(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional(),
});

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  password: Joi.string().min(8).optional(),
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional(),
  phone: Joi.string().max(20).optional(),
  employeeCode: Joi.string().max(20).optional(),
  roleId: Joi.number().optional(),
  departmentId: Joi.number().optional(),
  designationId: Joi.number().optional(),
  locationId: Joi.number().optional(),
  reportingTo: Joi.number().optional(),
  dateOfJoining: Joi.date().optional(),
  employmentType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT').optional(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional(),
  isActive: Joi.boolean().optional(),
});

// Password Reset Schemas
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  tenant: Joi.string().required(),
});

export const verifyResetTokenSchema = Joi.object({
  token: Joi.string().required(),
  tenant: Joi.string().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required(),
  tenant: Joi.string().required(),
});

// Department Schemas
export const createDepartmentSchema = Joi.object({
  name: Joi.string().max(100).required(),
  code: Joi.string().max(20).uppercase().required(),
  parentId: Joi.number().optional().allow(null),
  headId: Joi.number().optional().allow(null),
});

export const updateDepartmentSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  code: Joi.string().max(20).uppercase().optional(),
  parentId: Joi.number().optional().allow(null),
  headId: Joi.number().optional().allow(null),
  isActive: Joi.boolean().optional(),
});

// Designation Schemas
export const createDesignationSchema = Joi.object({
  name: Joi.string().max(100).required(),
  code: Joi.string().max(20).uppercase().required(),
  level: Joi.number().min(1).max(100).optional(),
});

export const updateDesignationSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  code: Joi.string().max(20).uppercase().optional(),
  level: Joi.number().min(1).max(100).optional(),
  isActive: Joi.boolean().optional(),
});

// Location Schemas
export const createLocationSchema = Joi.object({
  name: Joi.string().max(100).required(),
  code: Joi.string().max(20).uppercase().required(),
  address: Joi.string().max(500).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  country: Joi.string().max(100).optional().default('India'),
  pincode: Joi.string().max(10).optional().allow('', null),
});

export const updateLocationSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  code: Joi.string().max(20).uppercase().optional(),
  address: Joi.string().max(500).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  country: Joi.string().max(100).optional(),
  pincode: Joi.string().max(10).optional().allow('', null),
  isActive: Joi.boolean().optional(),
});

// Role Schemas
export const createRoleSchema = Joi.object({
  name: Joi.string().max(50).required(),
  code: Joi.string().max(30).uppercase().required(),
  description: Joi.string().max(255).optional().allow('', null),
  permissionIds: Joi.array().items(Joi.number()).optional(),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().max(50).optional(),
  code: Joi.string().max(30).uppercase().optional(),
  description: Joi.string().max(255).optional().allow('', null),
  isActive: Joi.boolean().optional(),
});

export const updateRolePermissionsSchema = Joi.object({
  permissionIds: Joi.array().items(Joi.number()).required(),
});
