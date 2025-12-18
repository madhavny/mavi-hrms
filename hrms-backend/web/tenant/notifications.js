import prisma from '@shared/config/database.js';
import { emailLeaveRequested, emailLeaveApproved, emailLeaveRejected, emailPayslipGenerated, emailAnnouncement } from '@shared/services/email.js';
import { getUsersForEmail } from './emailPreferences.js';

// ==================== NOTIFICATION SERVICE ====================

/**
 * Create a notification for a user
 */
export async function createNotification({
  tenantId,
  userId,
  type,
  title,
  message,
  link = null,
  metadata = null,
}) {
  return prisma.notification.create({
    data: {
      tenantId,
      userId,
      type,
      title,
      message,
      link,
      metadata,
    },
  });
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(notifications) {
  return prisma.notification.createMany({
    data: notifications,
  });
}

/**
 * Notify all users with specific roles in a tenant
 */
export async function notifyUsersByRole({
  tenantId,
  roleCodes,
  type,
  title,
  message,
  link = null,
  metadata = null,
  excludeUserId = null,
}) {
  // Find users with the specified roles
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: {
        code: { in: roleCodes },
      },
      ...(excludeUserId && { id: { not: excludeUserId } }),
    },
    select: { id: true },
  });

  if (users.length === 0) return [];

  const notifications = users.map((user) => ({
    tenantId,
    userId: user.id,
    type,
    title,
    message,
    link,
    metadata,
  }));

  await prisma.notification.createMany({ data: notifications });
  return notifications;
}

/**
 * Notify a user's manager/reporting hierarchy
 */
export async function notifyManager({
  tenantId,
  userId,
  type,
  title,
  message,
  link = null,
  metadata = null,
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reportingTo: true },
  });

  if (!user?.reportingTo) return null;

  return createNotification({
    tenantId,
    userId: user.reportingTo,
    type,
    title,
    message,
    link,
    metadata,
  });
}

// ==================== API ENDPOINTS ====================

/**
 * List notifications for current user
 */
export async function listNotifications(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const {
    page = '1',
    limit = '20',
    isRead,
    type,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const whereClause = {
    tenantId,
    userId,
    ...(isRead !== undefined && { isRead: isRead === 'true' }),
    ...(type && { type }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.notification.count({ where: whereClause }),
    prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const unreadCount = await prisma.notification.count({
    where: { tenantId, userId, isRead: false },
  });

  res.json({
    success: true,
    data: { unreadCount },
  });
}

/**
 * Mark a notification as read
 */
export async function markAsRead(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      userId,
    },
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  res.json({
    success: true,
    data: updated,
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const result = await prisma.notification.updateMany({
    where: {
      tenantId,
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  res.json({
    success: true,
    data: {
      updatedCount: result.count,
    },
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      userId,
    },
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  await prisma.notification.delete({
    where: { id: notification.id },
  });

  res.json({
    success: true,
    message: 'Notification deleted',
  });
}

/**
 * Delete all read notifications (cleanup)
 */
export async function deleteReadNotifications(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const result = await prisma.notification.deleteMany({
    where: {
      tenantId,
      userId,
      isRead: true,
    },
  });

  res.json({
    success: true,
    data: {
      deletedCount: result.count,
    },
  });
}

// ==================== NOTIFICATION TRIGGERS ====================
// These functions are called from other parts of the application

/**
 * Notify when a leave request is submitted
 */
export async function notifyLeaveRequested({
  tenantId,
  employeeId,
  employeeName,
  leaveType,
  startDate,
  endDate,
  days,
  leaveRequestId,
  reason,
  tenantSlug,
}) {
  // Send in-app notifications to managers and HR
  await notifyUsersByRole({
    tenantId,
    roleCodes: ['ADMIN', 'HR', 'MANAGER'],
    type: 'LEAVE_REQUESTED',
    title: 'New Leave Request',
    message: `${employeeName} has requested ${days} day(s) of ${leaveType} from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
    link: `/leave-approvals`,
    metadata: { leaveRequestId, employeeId },
    excludeUserId: employeeId,
  });

  // Send email notifications (respecting user preferences)
  try {
    const usersToEmail = await getUsersForEmail(tenantId, 'leaveRequested');
    const filteredUsers = usersToEmail.filter(u =>
      u.id !== employeeId &&
      ['ADMIN', 'HR', 'MANAGER'].some(code => u.role?.code === code)
    );

    for (const user of filteredUsers) {
      await emailLeaveRequested({
        recipientEmail: user.email,
        recipientName: user.firstName || user.email,
        employeeName,
        leaveType,
        startDate,
        endDate,
        days,
        reason,
        tenantSlug: tenantSlug || 'default',
      }).catch(err => console.error('Failed to send leave request email:', err.message));
    }
  } catch (err) {
    console.error('Failed to process leave request emails:', err.message);
  }
}

/**
 * Notify when a leave request is approved
 */
export async function notifyLeaveApproved({
  tenantId,
  employeeId,
  employeeEmail,
  employeeName,
  leaveType,
  startDate,
  endDate,
  days,
  approverName,
  tenantSlug,
}) {
  // Send in-app notification
  await createNotification({
    tenantId,
    userId: employeeId,
    type: 'LEAVE_APPROVED',
    title: 'Leave Approved',
    message: `Your ${days} day(s) ${leaveType} request from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()} has been approved by ${approverName}`,
    link: `/leave`,
  });

  // Send email notification (respecting user preferences)
  try {
    const usersToEmail = await getUsersForEmail(tenantId, 'leaveApproved', [employeeId]);
    if (usersToEmail.length > 0 && employeeEmail) {
      await emailLeaveApproved({
        recipientEmail: employeeEmail,
        employeeName: employeeName || 'Employee',
        leaveType,
        startDate,
        endDate,
        days,
        approverName,
        tenantSlug: tenantSlug || 'default',
      }).catch(err => console.error('Failed to send leave approved email:', err.message));
    }
  } catch (err) {
    console.error('Failed to process leave approved email:', err.message);
  }
}

/**
 * Notify when a leave request is rejected
 */
export async function notifyLeaveRejected({
  tenantId,
  employeeId,
  employeeEmail,
  employeeName,
  leaveType,
  startDate,
  endDate,
  days,
  approverName,
  reason,
  tenantSlug,
}) {
  // Send in-app notification
  await createNotification({
    tenantId,
    userId: employeeId,
    type: 'LEAVE_REJECTED',
    title: 'Leave Rejected',
    message: `Your ${days} day(s) ${leaveType} request from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()} has been rejected by ${approverName}${reason ? `. Reason: ${reason}` : ''}`,
    link: `/leave`,
  });

  // Send email notification (respecting user preferences)
  try {
    const usersToEmail = await getUsersForEmail(tenantId, 'leaveRejected', [employeeId]);
    if (usersToEmail.length > 0 && employeeEmail) {
      await emailLeaveRejected({
        recipientEmail: employeeEmail,
        employeeName: employeeName || 'Employee',
        leaveType,
        startDate,
        endDate,
        days,
        rejectorName: approverName,
        rejectionReason: reason,
        tenantSlug: tenantSlug || 'default',
      }).catch(err => console.error('Failed to send leave rejected email:', err.message));
    }
  } catch (err) {
    console.error('Failed to process leave rejected email:', err.message);
  }
}

/**
 * Notify when a payslip is generated
 */
export async function notifyPayslipGenerated({
  tenantId,
  userId,
  userEmail,
  userName,
  month,
  year,
  netSalary,
  tenantSlug,
}) {
  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Send in-app notification
  await createNotification({
    tenantId,
    userId,
    type: 'PAYSLIP_GENERATED',
    title: 'Payslip Generated',
    message: `Your payslip for ${monthName} is now available. Net salary: ₹${netSalary.toLocaleString('en-IN')}`,
    link: `/payroll/payslips`,
  });

  // Send email notification (respecting user preferences)
  try {
    const usersToEmail = await getUsersForEmail(tenantId, 'payslipGenerated', [userId]);
    if (usersToEmail.length > 0 && userEmail) {
      const monthLabel = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
      await emailPayslipGenerated({
        recipientEmail: userEmail,
        employeeName: userName || 'Employee',
        month: monthLabel,
        year,
        netPay: netSalary,
        tenantSlug: tenantSlug || 'default',
      }).catch(err => console.error('Failed to send payslip email:', err.message));
    }
  } catch (err) {
    console.error('Failed to process payslip email:', err.message);
  }
}

/**
 * Notify when salary structure is updated
 */
export async function notifySalaryRevised({
  tenantId,
  userId,
  effectiveFrom,
  newCTC,
}) {
  await createNotification({
    tenantId,
    userId,
    type: 'SALARY_REVISED',
    title: 'Salary Revised',
    message: `Your salary has been revised to ₹${newCTC.toLocaleString('en-IN')} per annum, effective from ${new Date(effectiveFrom).toLocaleDateString()}`,
    link: `/payroll/salary-structures`,
  });
}

/**
 * Notify when a new employee joins
 */
export async function notifyEmployeeJoined({
  tenantId,
  employeeId,
  employeeName,
  departmentName,
  designationName,
}) {
  await notifyUsersByRole({
    tenantId,
    roleCodes: ['ADMIN', 'HR'],
    type: 'EMPLOYEE_JOINED',
    title: 'New Employee Joined',
    message: `${employeeName} has joined as ${designationName}${departmentName ? ` in ${departmentName}` : ''}`,
    link: `/employees/${employeeId}`,
    excludeUserId: employeeId,
  });
}

/**
 * Notify when password is changed
 */
export async function notifyPasswordChanged({
  tenantId,
  userId,
}) {
  await createNotification({
    tenantId,
    userId,
    type: 'PASSWORD_CHANGED',
    title: 'Password Changed',
    message: 'Your password has been changed successfully. If you did not make this change, please contact your administrator immediately.',
  });
}

/**
 * Send a system announcement to all users
 */
export async function sendAnnouncement({
  tenantId,
  title,
  message,
  link = null,
  targetRoles = null, // If null, send to all users
}) {
  const whereClause = {
    tenantId,
    isActive: true,
    ...(targetRoles && { role: { code: { in: targetRoles } } }),
  };

  const users = await prisma.user.findMany({
    where: whereClause,
    select: { id: true },
  });

  const notifications = users.map((user) => ({
    tenantId,
    userId: user.id,
    type: 'ANNOUNCEMENT',
    title,
    message,
    link,
  }));

  await prisma.notification.createMany({ data: notifications });

  return { sentTo: users.length };
}

/**
 * Admin: Create announcement
 */
export async function createAnnouncement(req, res) {
  const tenantId = req.user.tenantId;
  const { title, message, link, targetRoles } = req.body;

  if (!title || !message) {
    return res.status(400).json({
      success: false,
      message: 'Title and message are required',
    });
  }

  const result = await sendAnnouncement({
    tenantId,
    title,
    message,
    link,
    targetRoles,
  });

  res.json({
    success: true,
    data: result,
    message: `Announcement sent to ${result.sentTo} users`,
  });
}
