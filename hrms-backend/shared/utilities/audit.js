import prisma from '../config/database.js';
import logger from './logger.js';

/**
 * Audit Service - Logs all important actions for compliance and tracking
 */

// Fields to exclude from audit logs (sensitive data)
const SENSITIVE_FIELDS = ['password', 'plainPassword', 'token', 'refreshToken', 'secret'];

/**
 * Sanitize object by removing sensitive fields
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  SENSITIVE_FIELDS.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  return sanitized;
}

/**
 * Calculate changes between old and new values
 */
function calculateChanges(oldValue, newValue) {
  if (!oldValue || !newValue) return null;

  const changes = {};
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

  allKeys.forEach(key => {
    if (SENSITIVE_FIELDS.includes(key)) return;

    const oldVal = oldValue[key];
    const newVal = newValue[key];

    // Skip if both are undefined or equal
    if (oldVal === newVal) return;
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return;

    changes[key] = {
      from: oldVal,
      to: newVal
    };
  });

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Extract request context from Express request object
 */
function getRequestContext(req) {
  if (!req) return {};

  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null
  };
}

/**
 * Get entity name for better readability in logs
 */
function getEntityName(entity, data) {
  if (!data) return null;

  switch (entity) {
    case 'User':
      return data.firstName && data.lastName
        ? `${data.firstName} ${data.lastName}`
        : data.email || null;
    case 'Tenant':
      return data.name || null;
    case 'Department':
    case 'Designation':
    case 'Location':
    case 'LeaveType':
      return data.name || null;
    case 'LeaveRequest':
      return data.reason ? data.reason.substring(0, 50) : null;
    case 'Attendance':
      return data.date ? new Date(data.date).toISOString().split('T')[0] : null;
    default:
      return data.name || data.title || null;
  }
}

/**
 * Main audit logging function
 */
async function createAuditLog({
  tenantId = null,
  userId = null,
  userEmail = null,
  userType = 'TENANT_USER',
  action,
  entity,
  entityId = null,
  oldValue = null,
  newValue = null,
  req = null
}) {
  try {
    const sanitizedOldValue = sanitizeData(oldValue);
    const sanitizedNewValue = sanitizeData(newValue);
    const changes = calculateChanges(sanitizedOldValue, sanitizedNewValue);
    const entityName = getEntityName(entity, newValue || oldValue);
    const requestContext = getRequestContext(req);

    const auditLog = await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        userEmail,
        userType,
        action,
        entity,
        entityId,
        entityName,
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        changes,
        ...requestContext
      }
    });

    logger.debug({ auditLogId: auditLog.id }, `Audit log created: ${action} on ${entity}`);
    return auditLog;
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    logger.error({ error, action, entity }, 'Failed to create audit log');
    return null;
  }
}

/**
 * Convenience methods for common actions
 */

// CREATE action
export async function auditCreate({ tenantId, userId, userEmail, userType = 'TENANT_USER', entity, entityId, data, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType,
    action: 'CREATE',
    entity,
    entityId,
    newValue: data,
    req
  });
}

// UPDATE action
export async function auditUpdate({ tenantId, userId, userEmail, userType = 'TENANT_USER', entity, entityId, oldData, newData, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType,
    action: 'UPDATE',
    entity,
    entityId,
    oldValue: oldData,
    newValue: newData,
    req
  });
}

// DELETE action
export async function auditDelete({ tenantId, userId, userEmail, userType = 'TENANT_USER', entity, entityId, data, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType,
    action: 'DELETE',
    entity,
    entityId,
    oldValue: data,
    req
  });
}

// LOGIN action
export async function auditLogin({ tenantId, userId, userEmail, userType = 'TENANT_USER', req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType,
    action: 'LOGIN',
    entity: userType === 'SUPER_ADMIN' ? 'SuperAdmin' : 'User',
    entityId: userId,
    req
  });
}

// LOGIN_FAILED action
export async function auditLoginFailed({ tenantId, userEmail, userType = 'TENANT_USER', reason, req }) {
  return createAuditLog({
    tenantId,
    userEmail,
    userType,
    action: 'LOGIN_FAILED',
    entity: userType === 'SUPER_ADMIN' ? 'SuperAdmin' : 'User',
    newValue: { reason },
    req
  });
}

// LOGOUT action
export async function auditLogout({ tenantId, userId, userEmail, userType = 'TENANT_USER', req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType,
    action: 'LOGOUT',
    entity: userType === 'SUPER_ADMIN' ? 'SuperAdmin' : 'User',
    entityId: userId,
    req
  });
}

// PASSWORD_CHANGE action
export async function auditPasswordChange({ tenantId, userId, userEmail, userType = 'TENANT_USER', req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType,
    action: 'PASSWORD_CHANGE',
    entity: 'User',
    entityId: userId,
    req
  });
}

// CLOCK_IN action
export async function auditClockIn({ tenantId, userId, userEmail, attendanceId, data, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType: 'TENANT_USER',
    action: 'CLOCK_IN',
    entity: 'Attendance',
    entityId: attendanceId,
    newValue: data,
    req
  });
}

// CLOCK_OUT action
export async function auditClockOut({ tenantId, userId, userEmail, attendanceId, oldData, newData, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType: 'TENANT_USER',
    action: 'CLOCK_OUT',
    entity: 'Attendance',
    entityId: attendanceId,
    oldValue: oldData,
    newValue: newData,
    req
  });
}

// LEAVE_APPLY action
export async function auditLeaveApply({ tenantId, userId, userEmail, leaveRequestId, data, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType: 'TENANT_USER',
    action: 'LEAVE_APPLY',
    entity: 'LeaveRequest',
    entityId: leaveRequestId,
    newValue: data,
    req
  });
}

// LEAVE_APPROVE action
export async function auditLeaveApprove({ tenantId, userId, userEmail, leaveRequestId, oldData, newData, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType: 'TENANT_USER',
    action: 'LEAVE_APPROVE',
    entity: 'LeaveRequest',
    entityId: leaveRequestId,
    oldValue: oldData,
    newValue: newData,
    req
  });
}

// LEAVE_REJECT action
export async function auditLeaveReject({ tenantId, userId, userEmail, leaveRequestId, oldData, newData, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType: 'TENANT_USER',
    action: 'LEAVE_REJECT',
    entity: 'LeaveRequest',
    entityId: leaveRequestId,
    oldValue: oldData,
    newValue: newData,
    req
  });
}

// LEAVE_CANCEL action
export async function auditLeaveCancel({ tenantId, userId, userEmail, leaveRequestId, oldData, newData, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType: 'TENANT_USER',
    action: 'LEAVE_CANCEL',
    entity: 'LeaveRequest',
    entityId: leaveRequestId,
    oldValue: oldData,
    newValue: newData,
    req
  });
}

// STATUS_CHANGE action (for tenant status, user activation, etc.)
export async function auditStatusChange({ tenantId, userId, userEmail, userType = 'TENANT_USER', entity, entityId, oldStatus, newStatus, req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType,
    action: 'STATUS_CHANGE',
    entity,
    entityId,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    req
  });
}

// PASSWORD_RESET action
export async function auditPasswordReset({ tenantId, userId, userEmail, userType = 'TENANT_USER', req }) {
  return createAuditLog({
    tenantId,
    userId,
    userEmail,
    userType,
    action: 'PASSWORD_RESET',
    entity: 'User',
    entityId: userId,
    newValue: { resetAt: new Date().toISOString() },
    req
  });
}

// Generic audit log creation (for flexibility)
export { createAuditLog };

export default {
  createAuditLog,
  auditCreate,
  auditUpdate,
  auditDelete,
  auditLogin,
  auditLoginFailed,
  auditLogout,
  auditPasswordChange,
  auditPasswordReset,
  auditClockIn,
  auditClockOut,
  auditLeaveApply,
  auditLeaveApprove,
  auditLeaveReject,
  auditLeaveCancel,
  auditStatusChange
};
