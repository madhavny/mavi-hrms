import prisma from '@shared/config/database.js';
import { auditClockIn, auditClockOut, auditCreate, auditUpdate } from '@shared/utilities/audit.js';

// Clock In
export const clockIn = async (req, res) => {
  const userId = req.user.id;
  const tenantId = req.user.tenantId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already clocked in today
  const existing = await prisma.attendance.findUnique({
    where: {
      tenantId_userId_date: {
        tenantId,
        userId,
        date: today
      }
    }
  });

  if (existing && existing.clockIn) {
    return res.status(400).json({ success: false, message: 'Already clocked in today' });
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      tenantId_userId_date: {
        tenantId,
        userId,
        date: today
      }
    },
    update: {
      clockIn: new Date(),
      status: 'PRESENT'
    },
    create: {
      tenantId,
      userId,
      date: today,
      clockIn: new Date(),
      status: 'PRESENT'
    }
  });

  // Log clock in
  await auditClockIn({
    tenantId,
    userId,
    userEmail: req.user.email,
    attendanceId: attendance.id,
    data: { date: today, clockIn: attendance.clockIn },
    req
  });

  return res.json({ success: true, data: attendance, message: 'Clocked in successfully' });
};

// Clock Out
export const clockOut = async (req, res) => {
  const userId = req.user.id;
  const tenantId = req.user.tenantId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.findUnique({
    where: {
      tenantId_userId_date: {
        tenantId,
        userId,
        date: today
      }
    }
  });

  if (!attendance || !attendance.clockIn) {
    return res.status(400).json({ success: false, message: 'No clock-in record found for today' });
  }

  if (attendance.clockOut) {
    return res.status(400).json({ success: false, message: 'Already clocked out today' });
  }

  const clockOutTime = new Date();
  const totalHours = (clockOutTime - attendance.clockIn) / (1000 * 60 * 60); // Convert ms to hours

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      clockOut: clockOutTime,
      totalHours: parseFloat(totalHours.toFixed(2))
    }
  });

  // Log clock out
  await auditClockOut({
    tenantId,
    userId,
    userEmail: req.user.email,
    attendanceId: attendance.id,
    oldData: { clockIn: attendance.clockIn, clockOut: null },
    newData: { clockIn: attendance.clockIn, clockOut: clockOutTime, totalHours: parseFloat(totalHours.toFixed(2)) },
    req
  });

  return res.json({ success: true, data: updated, message: 'Clocked out successfully' });
};

// Get My Attendance (for current user)
export const getMyAttendance = async (req, res) => {
  const { month, year } = req.query;
  const userId = req.user.id;
  const tenantId = req.user.tenantId;

  const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 1);
  const endDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()) + 1, 0);

  const attendance = await prisma.attendance.findMany({
    where: {
      tenantId,
      userId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { date: 'desc' }
  });

  return res.json({ success: true, data: attendance });
};

// Get Attendance Records (for Admin/HR/Manager)
export const getAttendance = async (req, res) => {
  const { userId, date, month, year, status, page = 1, limit = 20 } = req.query;
  const tenantId = req.user.tenantId;
  const skip = (page - 1) * limit;

  const where = { tenantId };

  if (userId) where.userId = parseInt(userId);
  if (status) where.status = status;

  // Date filtering
  if (date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    where.date = targetDate;
  } else if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    where.date = { gte: startDate, lte: endDate };
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            department: { select: { name: true } }
          }
        }
      }
    }),
    prisma.attendance.count({ where })
  ]);

  return res.json({
    success: true,
    data: { records, total, page: parseInt(page), limit: parseInt(limit) }
  });
};

// Mark Attendance (Admin/HR/Manager can mark for others)
export const markAttendance = async (req, res) => {
  const { userId, date, status, clockIn, clockOut, remarks } = req.body;
  const tenantId = req.user.tenantId;

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Calculate total hours if both times provided
  let totalHours = null;
  if (clockIn && clockOut) {
    const inTime = new Date(clockIn);
    const outTime = new Date(clockOut);
    totalHours = (outTime - inTime) / (1000 * 60 * 60);
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      tenantId_userId_date: {
        tenantId,
        userId: parseInt(userId),
        date: targetDate
      }
    },
    update: {
      status,
      clockIn: clockIn ? new Date(clockIn) : undefined,
      clockOut: clockOut ? new Date(clockOut) : undefined,
      totalHours,
      remarks,
      approvedBy: req.user.id,
      approvedAt: new Date()
    },
    create: {
      tenantId,
      userId: parseInt(userId),
      date: targetDate,
      status,
      clockIn: clockIn ? new Date(clockIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      totalHours,
      remarks,
      approvedBy: req.user.id,
      approvedAt: new Date()
    },
    include: {
      user: {
        select: { firstName: true, lastName: true, employeeCode: true }
      }
    }
  });

  // Log attendance marking
  await auditCreate({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'Attendance',
    entityId: attendance.id,
    data: { userId: parseInt(userId), date: targetDate, status, clockIn, clockOut, remarks },
    req
  });

  return res.json({ success: true, data: attendance, message: 'Attendance marked successfully' });
};

// Update Attendance (Admin/HR/Manager)
export const updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, clockIn, clockOut, remarks } = req.body;
  const tenantId = req.user.tenantId;

  const existing = await prisma.attendance.findFirst({
    where: { id: parseInt(id), tenantId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }

  const updateData = { status, remarks };

  if (clockIn) updateData.clockIn = new Date(clockIn);
  if (clockOut) updateData.clockOut = new Date(clockOut);

  // Recalculate total hours if both times exist
  if (updateData.clockIn && updateData.clockOut) {
    const totalHours = (updateData.clockOut - updateData.clockIn) / (1000 * 60 * 60);
    updateData.totalHours = parseFloat(totalHours.toFixed(2));
  }

  const attendance = await prisma.attendance.update({
    where: { id: parseInt(id) },
    data: updateData
  });

  // Log attendance update
  await auditUpdate({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'Attendance',
    entityId: attendance.id,
    oldData: existing,
    newData: updateData,
    req
  });

  return res.json({ success: true, data: attendance, message: 'Attendance updated successfully' });
};

// Get Attendance Summary (for reports)
export const getAttendanceSummary = async (req, res) => {
  const { userId, month, year } = req.query;
  const tenantId = req.user.tenantId;

  const targetUserId = userId ? parseInt(userId) : req.user.id;
  const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0);

  const records = await prisma.attendance.findMany({
    where: {
      tenantId,
      userId: targetUserId,
      date: { gte: startDate, lte: endDate }
    }
  });

  const summary = {
    totalDays: records.length,
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    halfDay: records.filter(r => r.status === 'HALF_DAY').length,
    late: records.filter(r => r.status === 'LATE').length,
    onLeave: records.filter(r => r.status === 'ON_LEAVE').length,
    totalHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0).toFixed(2)
  };

  return res.json({ success: true, data: summary });
};
