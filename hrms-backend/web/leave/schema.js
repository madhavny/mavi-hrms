import Joi from 'joi';

export const createLeaveTypeSchema = Joi.object({
  name: Joi.string().max(50).required(),
  code: Joi.string().max(20).required(),
  isPaid: Joi.boolean().default(true),
  maxDaysPerYear: Joi.number().min(0).optional(),
  carryForward: Joi.boolean().default(false),
  requiresDocument: Joi.boolean().default(false),
});

export const updateLeaveTypeSchema = Joi.object({
  name: Joi.string().max(50).optional(),
  isPaid: Joi.boolean().optional(),
  maxDaysPerYear: Joi.number().min(0).optional(),
  carryForward: Joi.boolean().optional(),
  requiresDocument: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

export const allocateLeaveBalanceSchema = Joi.object({
  userId: Joi.number().required(),
  leaveTypeId: Joi.number().required(),
  year: Joi.number().min(2020).max(2100).required(),
  totalDays: Joi.number().min(0).required(),
});

export const applyLeaveSchema = Joi.object({
  leaveTypeId: Joi.number().required(),
  fromDate: Joi.date().required(),
  toDate: Joi.date().min(Joi.ref('fromDate')).required(),
  totalDays: Joi.number().min(0.5).required(),
  reason: Joi.string().min(10).required(),
  documentUrl: Joi.string().uri().optional(),
  appliedTo: Joi.number().optional(),
});

export const reviewLeaveSchema = Joi.object({
  status: Joi.string().valid('APPROVED', 'REJECTED').required(),
  reviewComments: Joi.string().max(500).optional(),
});
