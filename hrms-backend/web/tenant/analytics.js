import prisma from '@shared/config/database.js';

// ==================== DASHBOARD ANALYTICS ====================

/**
 * Get comprehensive analytics for the dashboard
 */
export async function getDashboardAnalytics(req, res) {
  const tenantId = req.user.tenantId;
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Date calculations
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfLastMonth = new Date(currentYear, currentMonth, 0);
  const startOfYear = new Date(currentYear, 0, 1);
  const startOfLastYear = new Date(currentYear - 1, 0, 1);
  const endOfLastYear = new Date(currentYear - 1, 11, 31);

  // ========== EMPLOYEE METRICS ==========
  const employees = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      isActive: true,
      gender: true,
      joiningDate: true,
      exitDate: true,
      departmentId: true,
      department: { select: { name: true, code: true } },
    },
  });

  const activeEmployees = employees.filter(e => e.isActive);
  const totalEmployees = activeEmployees.length;

  // Gender distribution
  const genderDistribution = {
    male: activeEmployees.filter(e => e.gender === 'MALE').length,
    female: activeEmployees.filter(e => e.gender === 'FEMALE').length,
    other: activeEmployees.filter(e => e.gender && !['MALE', 'FEMALE'].includes(e.gender)).length,
    notSpecified: activeEmployees.filter(e => !e.gender).length,
  };

  // Department distribution
  const departmentMap = new Map();
  activeEmployees.forEach(e => {
    const deptName = e.department?.name || 'Unassigned';
    departmentMap.set(deptName, (departmentMap.get(deptName) || 0) + 1);
  });
  const departmentDistribution = Array.from(departmentMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Average tenure calculation
  const tenures = activeEmployees
    .filter(e => e.joiningDate)
    .map(e => {
      const joinDate = new Date(e.joiningDate);
      const years = (today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return Math.max(0, years);
    });
  const averageTenure = tenures.length > 0
    ? tenures.reduce((sum, t) => sum + t, 0) / tenures.length
    : 0;

  // Tenure distribution
  const tenureDistribution = {
    lessThan1Year: tenures.filter(t => t < 1).length,
    oneToThreeYears: tenures.filter(t => t >= 1 && t < 3).length,
    threeToFiveYears: tenures.filter(t => t >= 3 && t < 5).length,
    fiveToTenYears: tenures.filter(t => t >= 5 && t < 10).length,
    moreThanTenYears: tenures.filter(t => t >= 10).length,
  };

  // ========== EMPLOYEE TREND (Last 12 months) ==========
  const employeeTrend = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(currentYear, currentMonth - i, 1);
    const monthEnd = new Date(currentYear, currentMonth - i + 1, 0);

    // Count employees who joined before or during this month and didn't exit before month end
    const count = employees.filter(e => {
      const joined = e.joiningDate ? new Date(e.joiningDate) <= monthEnd : true;
      const notExited = !e.exitDate || new Date(e.exitDate) > monthEnd;
      return joined && notExited;
    }).length;

    employeeTrend.push({
      month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count,
    });
  }

  // ========== ATTENDANCE METRICS ==========
  const [currentMonthAttendance, lastMonthAttendance] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        tenantId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.attendance.findMany({
      where: {
        tenantId,
        date: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
  ]);

  // Calculate working days (excluding weekends)
  const getWorkingDays = (start, end) => {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const workingDaysThisMonth = getWorkingDays(startOfMonth, Math.min(today, endOfMonth));
  const workingDaysLastMonth = getWorkingDays(startOfLastMonth, endOfLastMonth);
  const expectedAttendanceThisMonth = totalEmployees * workingDaysThisMonth;
  const expectedAttendanceLastMonth = totalEmployees * workingDaysLastMonth;

  const presentThisMonth = currentMonthAttendance.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
  const presentLastMonth = lastMonthAttendance.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;

  const attendanceRateThisMonth = expectedAttendanceThisMonth > 0
    ? (presentThisMonth / expectedAttendanceThisMonth) * 100
    : 0;
  const attendanceRateLastMonth = expectedAttendanceLastMonth > 0
    ? (presentLastMonth / expectedAttendanceLastMonth) * 100
    : 0;

  // Attendance trend (last 12 months)
  const attendanceTrend = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(currentYear, currentMonth - i, 1);
    const monthEnd = new Date(currentYear, currentMonth - i + 1, 0);

    const monthAttendance = await prisma.attendance.count({
      where: {
        tenantId,
        date: { gte: monthStart, lte: monthEnd },
        status: { in: ['PRESENT', 'HALF_DAY'] },
      },
    });

    const workDays = getWorkingDays(monthStart, monthEnd);
    const expectedDays = totalEmployees * workDays;
    const rate = expectedDays > 0 ? (monthAttendance / expectedDays) * 100 : 0;

    attendanceTrend.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      rate: Math.round(rate * 10) / 10,
      present: monthAttendance,
      expected: expectedDays,
    });
  }

  // ========== LEAVE METRICS ==========
  const [leaveRequests, leaveBalances, leaveTypes] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        tenantId,
        fromDate: { gte: startOfYear },
        status: { in: ['APPROVED', 'PENDING'] },
      },
      include: { leaveType: true },
    }),
    prisma.leaveBalance.findMany({
      where: {
        tenantId,
        year: currentYear,
      },
      include: { leaveType: true },
    }),
    prisma.leaveType.findMany({
      where: { tenantId, isActive: true },
    }),
  ]);

  // Leave utilization by type
  const leaveUtilization = leaveTypes.map(lt => {
    const balances = leaveBalances.filter(lb => lb.leaveTypeId === lt.id);
    const totalAllocated = balances.reduce((sum, b) => sum + b.totalDays, 0);
    const totalUsed = balances.reduce((sum, b) => sum + b.usedDays, 0);
    const totalPending = balances.reduce((sum, b) => sum + b.pendingDays, 0);

    return {
      name: lt.name,
      code: lt.code,
      allocated: totalAllocated,
      used: totalUsed,
      pending: totalPending,
      available: totalAllocated - totalUsed - totalPending,
      utilizationRate: totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0,
    };
  });

  // Leave trend by month
  const leaveTrend = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(currentYear, currentMonth - i, 1);
    const monthEnd = new Date(currentYear, currentMonth - i + 1, 0);

    const monthLeaves = leaveRequests.filter(lr => {
      const from = new Date(lr.fromDate);
      return from >= monthStart && from <= monthEnd;
    });

    const totalDays = monthLeaves.reduce((sum, lr) => sum + lr.totalDays, 0);

    leaveTrend.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      days: totalDays,
      requests: monthLeaves.length,
    });
  }

  // ========== TURNOVER METRICS ==========
  const joinsThisYear = employees.filter(e =>
    e.joiningDate && new Date(e.joiningDate) >= startOfYear
  ).length;

  const exitsThisYear = employees.filter(e =>
    e.exitDate && new Date(e.exitDate) >= startOfYear
  ).length;

  const joinsLastYear = employees.filter(e => {
    const joinDate = e.joiningDate ? new Date(e.joiningDate) : null;
    return joinDate && joinDate >= startOfLastYear && joinDate <= endOfLastYear;
  }).length;

  const exitsLastYear = employees.filter(e => {
    const exitDate = e.exitDate ? new Date(e.exitDate) : null;
    return exitDate && exitDate >= startOfLastYear && exitDate <= endOfLastYear;
  }).length;

  // Calculate turnover rate
  const avgEmployeesThisYear = (totalEmployees + (totalEmployees - joinsThisYear + exitsThisYear)) / 2;
  const turnoverRate = avgEmployeesThisYear > 0 ? (exitsThisYear / avgEmployeesThisYear) * 100 : 0;

  // Monthly joins/exits trend
  const turnoverTrend = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(currentYear, currentMonth - i, 1);
    const monthEnd = new Date(currentYear, currentMonth - i + 1, 0);

    const monthJoins = employees.filter(e => {
      const joinDate = e.joiningDate ? new Date(e.joiningDate) : null;
      return joinDate && joinDate >= monthStart && joinDate <= monthEnd;
    }).length;

    const monthExits = employees.filter(e => {
      const exitDate = e.exitDate ? new Date(e.exitDate) : null;
      return exitDate && exitDate >= monthStart && exitDate <= monthEnd;
    }).length;

    turnoverTrend.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      joins: monthJoins,
      exits: monthExits,
      netChange: monthJoins - monthExits,
    });
  }

  // ========== COMPARISON METRICS ==========
  const comparison = {
    employees: {
      current: totalEmployees,
      lastMonth: employees.filter(e => {
        const joined = !e.joiningDate || new Date(e.joiningDate) <= endOfLastMonth;
        const notExited = !e.exitDate || new Date(e.exitDate) > endOfLastMonth;
        return joined && notExited;
      }).length,
      change: 0,
      changePercent: 0,
    },
    attendance: {
      current: Math.round(attendanceRateThisMonth * 10) / 10,
      lastMonth: Math.round(attendanceRateLastMonth * 10) / 10,
      change: 0,
      changePercent: 0,
    },
    turnover: {
      currentYear: Math.round(turnoverRate * 10) / 10,
      lastYear: avgEmployeesThisYear > 0
        ? Math.round((exitsLastYear / avgEmployeesThisYear) * 1000) / 10
        : 0,
      change: 0,
      changePercent: 0,
    },
  };

  // Calculate changes
  comparison.employees.change = comparison.employees.current - comparison.employees.lastMonth;
  comparison.employees.changePercent = comparison.employees.lastMonth > 0
    ? ((comparison.employees.change / comparison.employees.lastMonth) * 100)
    : 0;

  comparison.attendance.change = comparison.attendance.current - comparison.attendance.lastMonth;
  comparison.attendance.changePercent = comparison.attendance.lastMonth > 0
    ? ((comparison.attendance.change / comparison.attendance.lastMonth) * 100)
    : 0;

  comparison.turnover.change = comparison.turnover.currentYear - comparison.turnover.lastYear;

  // ========== QUICK STATS ==========
  const pendingLeaveRequests = await prisma.leaveRequest.count({
    where: { tenantId, status: 'PENDING' },
  });

  const todayAttendance = await prisma.attendance.count({
    where: {
      tenantId,
      date: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
      status: { in: ['PRESENT', 'HALF_DAY'] },
    },
  });

  const quickStats = {
    totalEmployees,
    todayPresent: todayAttendance,
    pendingLeaveRequests,
    averageTenureYears: Math.round(averageTenure * 10) / 10,
    attendanceRate: Math.round(attendanceRateThisMonth * 10) / 10,
    turnoverRate: Math.round(turnoverRate * 10) / 10,
  };

  res.json({
    success: true,
    data: {
      quickStats,
      genderDistribution,
      departmentDistribution,
      tenureDistribution,
      employeeTrend,
      attendanceTrend,
      leaveUtilization,
      leaveTrend,
      turnoverTrend,
      comparison,
    },
  });
}

/**
 * Get employee growth analytics with YoY comparison
 */
export async function getEmployeeGrowthAnalytics(req, res) {
  const tenantId = req.user.tenantId;
  const { year = new Date().getFullYear() } = req.query;
  const targetYear = parseInt(year);
  const previousYear = targetYear - 1;

  const employees = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      joiningDate: true,
      exitDate: true,
    },
  });

  const monthlyData = [];

  for (let month = 0; month < 12; month++) {
    const currentYearMonthEnd = new Date(targetYear, month + 1, 0);
    const previousYearMonthEnd = new Date(previousYear, month + 1, 0);

    const currentYearCount = employees.filter(e => {
      const joined = !e.joiningDate || new Date(e.joiningDate) <= currentYearMonthEnd;
      const notExited = !e.exitDate || new Date(e.exitDate) > currentYearMonthEnd;
      return joined && notExited;
    }).length;

    const previousYearCount = employees.filter(e => {
      const joined = !e.joiningDate || new Date(e.joiningDate) <= previousYearMonthEnd;
      const notExited = !e.exitDate || new Date(e.exitDate) > previousYearMonthEnd;
      return joined && notExited;
    }).length;

    monthlyData.push({
      month: new Date(targetYear, month).toLocaleDateString('en-US', { month: 'short' }),
      currentYear: currentYearCount,
      previousYear: previousYearCount,
      growth: previousYearCount > 0
        ? Math.round(((currentYearCount - previousYearCount) / previousYearCount) * 1000) / 10
        : 0,
    });
  }

  res.json({
    success: true,
    data: {
      targetYear,
      previousYear,
      monthlyData,
    },
  });
}

/**
 * Get attendance analytics with detailed breakdown
 */
export async function getAttendanceAnalytics(req, res) {
  const tenantId = req.user.tenantId;
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const attendance = await prisma.attendance.findMany({
    where: {
      tenantId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  // Status breakdown
  const statusBreakdown = {
    present: attendance.filter(a => a.status === 'PRESENT').length,
    halfDay: attendance.filter(a => a.status === 'HALF_DAY').length,
    absent: attendance.filter(a => a.status === 'ABSENT').length,
    onLeave: attendance.filter(a => a.status === 'ON_LEAVE').length,
    holiday: attendance.filter(a => a.status === 'HOLIDAY').length,
    weekOff: attendance.filter(a => a.status === 'WEEK_OFF').length,
  };

  // Department-wise attendance
  const deptAttendance = new Map();
  attendance.forEach(a => {
    const dept = a.user?.department?.name || 'Unassigned';
    if (!deptAttendance.has(dept)) {
      deptAttendance.set(dept, { present: 0, absent: 0, total: 0 });
    }
    const data = deptAttendance.get(dept);
    data.total++;
    if (a.status === 'PRESENT' || a.status === 'HALF_DAY') {
      data.present++;
    } else if (a.status === 'ABSENT') {
      data.absent++;
    }
  });

  const departmentAttendance = Array.from(deptAttendance.entries())
    .map(([name, data]) => ({
      name,
      present: data.present,
      absent: data.absent,
      total: data.total,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  // Daily trend for current month
  const dailyTrend = [];
  for (let day = 1; day <= Math.min(today.getDate(), endOfMonth.getDate()); day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dayOfWeek = dayDate.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
      const dayAttendance = attendance.filter(a =>
        new Date(a.date).getDate() === day
      );

      const present = dayAttendance.filter(a =>
        a.status === 'PRESENT' || a.status === 'HALF_DAY'
      ).length;

      dailyTrend.push({
        date: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present,
        absent: dayAttendance.filter(a => a.status === 'ABSENT').length,
        total: dayAttendance.length,
      });
    }
  }

  res.json({
    success: true,
    data: {
      statusBreakdown,
      departmentAttendance,
      dailyTrend,
      month: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    },
  });
}
