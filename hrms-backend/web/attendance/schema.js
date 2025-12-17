import Joi from 'joi';

export const markAttendanceSchema = Joi.object({
  userId: Joi.number().required(),
  date: Joi.date().required(),
  status: Joi.string().valid('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND').required(),
  clockIn: Joi.date().optional(),
  clockOut: Joi.date().optional(),
  remarks: Joi.string().max(500).optional(),
});

export const updateAttendanceSchema = Joi.object({
  status: Joi.string().valid('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND').optional(),
  clockIn: Joi.date().optional(),
  clockOut: Joi.date().optional(),
  remarks: Joi.string().max(500).optional(),
});
