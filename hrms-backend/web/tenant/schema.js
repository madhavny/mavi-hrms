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
