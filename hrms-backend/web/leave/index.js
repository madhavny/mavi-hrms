import prisma from '@shared/config/database.js';
import { auditLeaveApply, auditLeaveApprove, auditLeaveReject, auditLeaveCancel, auditCreate, auditUpdate, auditDelete } from '@shared/utilities/audit.js';

// ==================== LEAVE TYPES ====================

// Get Leave Types
export const getLeaveTypes = async (req, res) => {
  const leaveTypes = await prisma.leaveType.findMany({
    where: {
      tenantId: req.user.tenantId,
      isActive: true
    },
    orderBy: { name: 'asc' }
  });

  return res.json({ success: true, data: leaveTypes });
};

// Create Leave Type (Admin/HR only)
export const createLeaveType = async (req, res) => {
  const { name, code, ...data } = req.body;
  const tenantId = req.user.tenantId;

  // Check if code already exists
  const existing = await prisma.leaveType.findUnique({
    where: { tenantId_code: { tenantId, code } }
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'Leave type code already exists' });
  }

  const leaveType = await prisma.leaveType.create({
    data: {
      tenantId,
      name,
      code,
      ...data
    }
  });

  return res.status(201).json({ success: true, data: leaveType });
};

// Update Leave Type (Admin/HR only)
export const updateLeaveType = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const leaveType = await prisma.leaveType.updateMany({
    where: { id: parseInt(id), tenantId },
    data: req.body
  });

  if (leaveType.count === 0) {
    return res.status(404).json({ success: false, message: 'Leave type not found' });
  }

  const updated = await prisma.leaveType.findUnique({ where: { id: parseInt(id) } });
  return res.json({ success: true, data: updated });
};

// Delete Leave Type (Admin/HR only)
export const deleteLeaveType = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  await prisma.leaveType.updateMany({
    where: { id: parseInt(id), tenantId },
    data: { isActive: false }
  });

  return res.json({ success: true, message: 'Leave type deactivated' });
};

// ==================== LEAVE BALANCES ====================

// Get My Leave Balance
export const getMyLeaveBalance = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const userId = req.user.id;
  const tenantId = req.user.tenantId;

  const balances = await prisma.leaveBalance.findMany({
    where: {
      tenantId,
      userId,
      year: parseInt(year)
    },
    include: {
      leaveType: {
        select: { id: true, name: true, code: true, isPaid: true }
      }
    }
  });

  return res.json({ success: true, data: balances });
};

// Get Leave Balances (Admin/HR/Manager)
export const getLeaveBalances = async (req, res) => {
  const { userId, year = new Date().getFullYear(), page = 1, limit = 50 } = req.query;
  const tenantId = req.user.tenantId;
  const skip = (page - 1) * limit;

  const where = { tenantId, year: parseInt(year) };
  if (userId) where.userId = parseInt(userId);

  const [balances, total] = await Promise.all([
    prisma.leaveBalance.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } }
          }
        },
        leaveType: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { userId: 'asc' }
    }),
    prisma.leaveBalance.count({ where })
  ]);

  return res.json({
    success: true,
    data: { balances, total, page: parseInt(page), limit: parseInt(limit) }
  });
};

// Allocate Leave Balance (Admin/HR only)
export const allocateLeaveBalance = async (req, res) => {
  const { userId, leaveTypeId, year, totalDays } = req.body;
  const tenantId = req.user.tenantId;

  const balance = await prisma.leaveBalance.upsert({
    where: {
      tenantId_userId_leaveTypeId_year: {
        tenantId,
        userId: parseInt(userId),
        leaveTypeId: parseInt(leaveTypeId),
        year: parseInt(year)
      }
    },
    update: {
      totalDays: parseFloat(totalDays),
      availableDays: parseFloat(totalDays) // Reset available = total (assuming used/pending remain same)
    },
    create: {
      tenantId,
      userId: parseInt(userId),
      leaveTypeId: parseInt(leaveTypeId),
      year: parseInt(year),
      totalDays: parseFloat(totalDays),
      availableDays: parseFloat(totalDays)
    },
    include: {
      user: { select: { firstName: true, lastName: true, employeeCode: true } },
      leaveType: { select: { name: true, code: true } }
    }
  });

  return res.json({ success: true, data: balance, message: 'Leave balance allocated' });
};

// ==================== LEAVE REQUESTS ====================

// Apply for Leave (All employees)
export const applyLeave = async (req, res) => {
  const { leaveTypeId, fromDate, toDate, totalDays, reason, documentUrl, appliedTo } = req.body;
  const userId = req.user.id;
  const tenantId = req.user.tenantId;
  const year = new Date(fromDate).getFullYear();

  // Check leave balance
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      tenantId_userId_leaveTypeId_year: {
        tenantId,
        userId,
        leaveTypeId: parseInt(leaveTypeId),
        year
      }
    }
  });

  if (!balance || balance.availableDays < parseFloat(totalDays)) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient leave balance'
    });
  }

  // Create leave request
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      tenantId,
      userId,
      leaveTypeId: parseInt(leaveTypeId),
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      totalDays: parseFloat(totalDays),
      reason,
      documentUrl,
      appliedTo: appliedTo ? parseInt(appliedTo) : null,
      status: 'PENDING'
    },
    include: {
      leaveType: { select: { name: true, code: true } },
      appliedToUser: { select: { firstName: true, lastName: true, email: true } }
    }
  });

  // Update pending days in balance
  await prisma.leaveBalance.update({
    where: { id: balance.id },
    data: {
      pendingDays: balance.pendingDays + parseFloat(totalDays),
      availableDays: balance.availableDays - parseFloat(totalDays)
    }
  });

  // Log leave application
  await auditLeaveApply({
    tenantId,
    userId,
    userEmail: req.user.email,
    leaveRequestId: leaveRequest.id,
    data: { leaveTypeId, fromDate, toDate, totalDays, reason },
    req
  });

  return res.status(201).json({
    success: true,
    data: leaveRequest,
    message: 'Leave request submitted successfully'
  });
};

// Get My Leave Requests
export const getMyLeaveRequests = async (req, res) => {
  const { status, year, page = 1, limit = 20 } = req.query;
  const userId = req.user.id;
  const tenantId = req.user.tenantId;
  const skip = (page - 1) * limit;

  const where = { tenantId, userId };
  if (status) where.status = status;
  if (year) {
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);
    where.fromDate = { gte: startDate, lte: endDate };
  }

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        leaveType: { select: { name: true, code: true, isPaid: true } },
        appliedToUser: { select: { firstName: true, lastName: true } },
        reviewer: { select: { firstName: true, lastName: true } }
      }
    }),
    prisma.leaveRequest.count({ where })
  ]);

  return res.json({
    success: true,
    data: { requests, total, page: parseInt(page), limit: parseInt(limit) }
  });
};

// Get Leave Requests (Admin/HR/Manager)
export const getLeaveRequests = async (req, res) => {
  const { userId, status, year, page = 1, limit = 20 } = req.query;
  const tenantId = req.user.tenantId;
  const skip = (page - 1) * limit;

  const where = { tenantId };
  if (userId) where.userId = parseInt(userId);
  if (status) where.status = status;
  if (year) {
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);
    where.fromDate = { gte: startDate, lte: endDate };
  }

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } }
          }
        },
        leaveType: { select: { name: true, code: true, isPaid: true } },
        reviewer: { select: { firstName: true, lastName: true } }
      }
    }),
    prisma.leaveRequest.count({ where })
  ]);

  return res.json({
    success: true,
    data: { requests, total, page: parseInt(page), limit: parseInt(limit) }
  });
};

// Get Single Leave Request
export const getLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const request = await prisma.leaveRequest.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          email: true,
          department: { select: { name: true } }
        }
      },
      leaveType: { select: { name: true, code: true, isPaid: true } },
      appliedToUser: { select: { firstName: true, lastName: true, email: true } },
      reviewer: { select: { firstName: true, lastName: true, email: true } }
    }
  });

  if (!request) {
    return res.status(404).json({ success: false, message: 'Leave request not found' });
  }

  return res.json({ success: true, data: request });
};

// Approve/Reject Leave (Manager/HR/Admin)
export const reviewLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const { status, reviewComments } = req.body;
  const tenantId = req.user.tenantId;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const request = await prisma.leaveRequest.findFirst({
    where: { id: parseInt(id), tenantId, status: 'PENDING' }
  });

  if (!request) {
    return res.status(404).json({ success: false, message: 'Leave request not found or already processed' });
  }

  // Start transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update leave request
    const updated = await tx.leaveRequest.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reviewComments
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        leaveType: { select: { name: true } }
      }
    });

    // Get leave balance
    const balance = await tx.leaveBalance.findUnique({
      where: {
        tenantId_userId_leaveTypeId_year: {
          tenantId,
          userId: request.userId,
          leaveTypeId: request.leaveTypeId,
          year: request.fromDate.getFullYear()
        }
      }
    });

    if (balance) {
      if (status === 'APPROVED') {
        // Move from pending to used
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: balance.pendingDays - request.totalDays,
            usedDays: balance.usedDays + request.totalDays
          }
        });

        // Mark attendance as ON_LEAVE for the leave period
        const dates = [];
        let currentDate = new Date(request.fromDate);
        const endDate = new Date(request.toDate);

        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Create/update attendance records
        for (const date of dates) {
          await tx.attendance.upsert({
            where: {
              tenantId_userId_date: {
                tenantId,
                userId: request.userId,
                date
              }
            },
            update: { status: 'ON_LEAVE' },
            create: {
              tenantId,
              userId: request.userId,
              date,
              status: 'ON_LEAVE'
            }
          });
        }
      } else if (status === 'REJECTED') {
        // Return pending days back to available
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: balance.pendingDays - request.totalDays,
            availableDays: balance.availableDays + request.totalDays
          }
        });
      }
    }

    return updated;
  });

  // Log leave approval or rejection
  if (status === 'APPROVED') {
    await auditLeaveApprove({
      tenantId,
      userId: req.user.id,
      userEmail: req.user.email,
      leaveRequestId: parseInt(id),
      oldData: { status: 'PENDING' },
      newData: { status, reviewComments },
      req
    });
  } else {
    await auditLeaveReject({
      tenantId,
      userId: req.user.id,
      userEmail: req.user.email,
      leaveRequestId: parseInt(id),
      oldData: { status: 'PENDING' },
      newData: { status, reviewComments },
      req
    });
  }

  return res.json({
    success: true,
    data: result,
    message: `Leave request ${status.toLowerCase()} successfully`
  });
};

// Cancel Leave Request (Employee can cancel their own pending requests)
export const cancelLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const tenantId = req.user.tenantId;

  const request = await prisma.leaveRequest.findFirst({
    where: { id: parseInt(id), tenantId, userId, status: 'PENDING' }
  });

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Leave request not found or cannot be cancelled'
    });
  }

  // Update request and balance in transaction
  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' }
    });

    const balance = await tx.leaveBalance.findUnique({
      where: {
        tenantId_userId_leaveTypeId_year: {
          tenantId,
          userId,
          leaveTypeId: request.leaveTypeId,
          year: request.fromDate.getFullYear()
        }
      }
    });

    if (balance) {
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pendingDays: balance.pendingDays - request.totalDays,
          availableDays: balance.availableDays + request.totalDays
        }
      });
    }
  });

  // Log leave cancellation
  await auditLeaveCancel({
    tenantId,
    userId,
    userEmail: req.user.email,
    leaveRequestId: parseInt(id),
    oldData: { status: 'PENDING' },
    newData: { status: 'CANCELLED' },
    req
  });

  return res.json({ success: true, message: 'Leave request cancelled' });
};
