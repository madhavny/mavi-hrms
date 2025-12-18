import prisma from '@shared/config/database.js';

// ==================== HEADCOUNT REPORT ====================

export async function getHeadcountReport(req, res) {
  const tenantId = req.user.tenantId;
  const { groupBy = 'department', includeInactive = 'false' } = req.query;

  const whereClause = {
    tenantId,
    ...(includeInactive !== 'true' && { isActive: true }),
  };

  // Get all employees with related data
  const employees = await prisma.user.findMany({
    where: whereClause,
    include: {
      department: true,
      designation: true,
      location: true,
      role: true,
    },
  });

  // Calculate summary
  const summary = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.isActive).length,
    inactiveEmployees: employees.filter(e => !e.isActive).length,
    maleCount: employees.filter(e => e.gender === 'MALE').length,
    femaleCount: employees.filter(e => e.gender === 'FEMALE').length,
    otherGenderCount: employees.filter(e => e.gender && !['MALE', 'FEMALE'].includes(e.gender)).length,
  };

  // Group data based on groupBy parameter
  let groupedData = [];

  if (groupBy === 'department') {
    const departments = await prisma.department.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { users: true } } },
    });

    groupedData = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      count: employees.filter(e => e.departmentId === dept.id).length,
      activeCount: employees.filter(e => e.departmentId === dept.id && e.isActive).length,
    }));

    // Add employees without department
    const noDeptCount = employees.filter(e => !e.departmentId).length;
    if (noDeptCount > 0) {
      groupedData.push({ id: null, name: 'Unassigned', code: '-', count: noDeptCount, activeCount: noDeptCount });
    }
  } else if (groupBy === 'designation') {
    const designations = await prisma.designation.findMany({
      where: { tenantId, isActive: true },
      orderBy: { level: 'asc' },
    });

    groupedData = designations.map(desig => ({
      id: desig.id,
      name: desig.name,
      code: desig.code,
      level: desig.level,
      count: employees.filter(e => e.designationId === desig.id).length,
      activeCount: employees.filter(e => e.designationId === desig.id && e.isActive).length,
    }));

    const noDesigCount = employees.filter(e => !e.designationId).length;
    if (noDesigCount > 0) {
      groupedData.push({ id: null, name: 'Unassigned', code: '-', level: 999, count: noDesigCount, activeCount: noDesigCount });
    }
  } else if (groupBy === 'location') {
    const locations = await prisma.location.findMany({
      where: { tenantId, isActive: true },
    });

    groupedData = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      code: loc.code,
      city: loc.city,
      state: loc.state,
      count: employees.filter(e => e.locationId === loc.id).length,
      activeCount: employees.filter(e => e.locationId === loc.id && e.isActive).length,
    }));

    const noLocCount = employees.filter(e => !e.locationId).length;
    if (noLocCount > 0) {
      groupedData.push({ id: null, name: 'Unassigned', code: '-', city: '-', state: '-', count: noLocCount, activeCount: noLocCount });
    }
  } else if (groupBy === 'role') {
    const roles = await prisma.role.findMany({
      where: { tenantId },
    });

    groupedData = roles.map(role => ({
      id: role.id,
      name: role.name,
      code: role.code,
      count: employees.filter(e => e.roleId === role.id).length,
      activeCount: employees.filter(e => e.roleId === role.id && e.isActive).length,
    }));
  } else if (groupBy === 'gender') {
    groupedData = [
      { name: 'Male', count: summary.maleCount },
      { name: 'Female', count: summary.femaleCount },
      { name: 'Other', count: summary.otherGenderCount },
      { name: 'Not Specified', count: employees.filter(e => !e.gender).length },
    ];
  }

  // Sort by count descending
  groupedData.sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    data: {
      summary,
      groupBy,
      breakdown: groupedData,
    },
  });
}

// ==================== ATTENDANCE REPORT ====================

export async function getAttendanceReport(req, res) {
  const tenantId = req.user.tenantId;
  const {
    startDate,
    endDate,
    departmentId,
    locationId,
    userId,
    reportType = 'summary', // summary, daily, monthly
  } = req.query;

  // Default to current month if no dates provided
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Build employee filter
  const employeeWhere = {
    tenantId,
    isActive: true,
    ...(departmentId && { departmentId: parseInt(departmentId) }),
    ...(locationId && { locationId: parseInt(locationId) }),
    ...(userId && { id: parseInt(userId) }),
  };

  const employees = await prisma.user.findMany({
    where: employeeWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
    },
  });

  const employeeIds = employees.map(e => e.id);

  // Get attendance records
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      tenantId,
      userId: { in: employeeIds },
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Calculate working days (excluding weekends)
  const workingDays = getWorkingDays(start, end);

  // Summary report
  if (reportType === 'summary') {
    const employeeSummaries = employees.map(emp => {
      const empRecords = attendanceRecords.filter(a => a.userId === emp.id);
      const presentDays = empRecords.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
      const halfDays = empRecords.filter(a => a.status === 'HALF_DAY').length;
      const absentDays = empRecords.filter(a => a.status === 'ABSENT').length;
      const lateDays = empRecords.filter(a => a.isLateArrival).length;
      const earlyLeaveDays = empRecords.filter(a => a.isEarlyDeparture).length;

      // Calculate total hours worked
      const totalMinutes = empRecords.reduce((sum, a) => {
        if (a.checkIn && a.checkOut) {
          return sum + Math.floor((new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60));
        }
        return sum;
      }, 0);

      return {
        employee: {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
          employeeCode: emp.employeeCode,
          department: emp.department?.name || '-',
          designation: emp.designation?.name || '-',
        },
        workingDays,
        presentDays,
        halfDays,
        absentDays,
        lateDays,
        earlyLeaveDays,
        attendancePercentage: workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0,
        totalHoursWorked: Math.floor(totalMinutes / 60),
        totalMinutesWorked: totalMinutes % 60,
        avgHoursPerDay: presentDays > 0 ? (totalMinutes / presentDays / 60).toFixed(1) : 0,
      };
    });

    // Overall summary
    const overallSummary = {
      totalEmployees: employees.length,
      workingDays,
      avgAttendanceRate: employeeSummaries.length > 0
        ? Math.round(employeeSummaries.reduce((sum, e) => sum + e.attendancePercentage, 0) / employeeSummaries.length)
        : 0,
      totalPresentInstances: attendanceRecords.filter(a => a.status === 'PRESENT').length,
      totalAbsentInstances: attendanceRecords.filter(a => a.status === 'ABSENT').length,
      totalLateArrivals: attendanceRecords.filter(a => a.isLateArrival).length,
      totalEarlyDepartures: attendanceRecords.filter(a => a.isEarlyDeparture).length,
    };

    return res.json({
      success: true,
      data: {
        reportType: 'summary',
        dateRange: { start, end },
        summary: overallSummary,
        employees: employeeSummaries,
      },
    });
  }

  // Daily report
  if (reportType === 'daily') {
    const dailyData = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayRecords = attendanceRecords.filter(
        a => a.date.toISOString().split('T')[0] === dateStr
      );

      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

      dailyData.push({
        date: dateStr,
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        isWeekend,
        totalEmployees: employees.length,
        present: dayRecords.filter(a => a.status === 'PRESENT').length,
        halfDay: dayRecords.filter(a => a.status === 'HALF_DAY').length,
        absent: dayRecords.filter(a => a.status === 'ABSENT').length,
        onLeave: dayRecords.filter(a => a.status === 'ON_LEAVE').length,
        lateArrivals: dayRecords.filter(a => a.isLateArrival).length,
        attendanceRate: employees.length > 0
          ? Math.round((dayRecords.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length / employees.length) * 100)
          : 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return res.json({
      success: true,
      data: {
        reportType: 'daily',
        dateRange: { start, end },
        totalEmployees: employees.length,
        dailyData,
      },
    });
  }

  // Monthly report (aggregate by month)
  if (reportType === 'monthly') {
    const monthlyData = {};

    attendanceRecords.forEach(record => {
      const monthKey = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          monthName: new Date(record.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          present: 0,
          halfDay: 0,
          absent: 0,
          onLeave: 0,
          lateArrivals: 0,
          totalRecords: 0,
        };
      }

      monthlyData[monthKey].totalRecords++;
      if (record.status === 'PRESENT') monthlyData[monthKey].present++;
      if (record.status === 'HALF_DAY') monthlyData[monthKey].halfDay++;
      if (record.status === 'ABSENT') monthlyData[monthKey].absent++;
      if (record.status === 'ON_LEAVE') monthlyData[monthKey].onLeave++;
      if (record.isLateArrival) monthlyData[monthKey].lateArrivals++;
    });

    return res.json({
      success: true,
      data: {
        reportType: 'monthly',
        dateRange: { start, end },
        totalEmployees: employees.length,
        monthlyData: Object.values(monthlyData),
      },
    });
  }

  res.json({ success: true, data: {} });
}

// ==================== LEAVE REPORT ====================

export async function getLeaveReport(req, res) {
  const tenantId = req.user.tenantId;
  const {
    startDate,
    endDate,
    departmentId,
    leaveTypeId,
    userId,
    status,
    groupBy = 'employee', // employee, leaveType, department, month
  } = req.query;

  // Default to current year if no dates
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
  const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), 11, 31);

  // Build where clause for leave requests
  const whereClause = {
    tenantId,
    startDate: { gte: start },
    endDate: { lte: end },
    ...(departmentId && { user: { departmentId: parseInt(departmentId) } }),
    ...(leaveTypeId && { leaveTypeId: parseInt(leaveTypeId) }),
    ...(userId && { userId: parseInt(userId) }),
    ...(status && { status }),
  };

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { id: true, name: true } },
        },
      },
      leaveType: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  // Get leave types for summary
  const leaveTypes = await prisma.leaveType.findMany({
    where: { tenantId, isActive: true },
  });

  // Calculate summary
  const summary = {
    totalRequests: leaveRequests.length,
    totalDays: leaveRequests.reduce((sum, lr) => sum + lr.days, 0),
    approved: leaveRequests.filter(lr => lr.status === 'APPROVED').length,
    pending: leaveRequests.filter(lr => lr.status === 'PENDING').length,
    rejected: leaveRequests.filter(lr => lr.status === 'REJECTED').length,
    cancelled: leaveRequests.filter(lr => lr.status === 'CANCELLED').length,
    approvedDays: leaveRequests.filter(lr => lr.status === 'APPROVED').reduce((sum, lr) => sum + lr.days, 0),
  };

  let groupedData = [];

  if (groupBy === 'employee') {
    const employeeMap = {};
    leaveRequests.forEach(lr => {
      const empId = lr.userId;
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employee: {
            id: lr.user.id,
            name: `${lr.user.firstName} ${lr.user.lastName || ''}`.trim(),
            employeeCode: lr.user.employeeCode,
            department: lr.user.department?.name || '-',
          },
          totalRequests: 0,
          totalDays: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          byType: {},
        };
      }
      employeeMap[empId].totalRequests++;
      employeeMap[empId].totalDays += lr.days;
      if (lr.status === 'APPROVED') employeeMap[empId].approved++;
      if (lr.status === 'PENDING') employeeMap[empId].pending++;
      if (lr.status === 'REJECTED') employeeMap[empId].rejected++;

      // Track by leave type
      const typeName = lr.leaveType?.name || 'Unknown';
      if (!employeeMap[empId].byType[typeName]) {
        employeeMap[empId].byType[typeName] = 0;
      }
      employeeMap[empId].byType[typeName] += lr.days;
    });

    groupedData = Object.values(employeeMap);
  } else if (groupBy === 'leaveType') {
    const typeMap = {};
    leaveTypes.forEach(lt => {
      typeMap[lt.id] = {
        leaveType: { id: lt.id, name: lt.name, code: lt.code },
        totalRequests: 0,
        totalDays: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      };
    });

    leaveRequests.forEach(lr => {
      const typeId = lr.leaveTypeId;
      if (typeMap[typeId]) {
        typeMap[typeId].totalRequests++;
        typeMap[typeId].totalDays += lr.days;
        if (lr.status === 'APPROVED') typeMap[typeId].approved++;
        if (lr.status === 'PENDING') typeMap[typeId].pending++;
        if (lr.status === 'REJECTED') typeMap[typeId].rejected++;
      }
    });

    groupedData = Object.values(typeMap).filter(t => t.totalRequests > 0);
  } else if (groupBy === 'department') {
    const deptMap = {};
    leaveRequests.forEach(lr => {
      const deptId = lr.user.department?.id || 'unassigned';
      const deptName = lr.user.department?.name || 'Unassigned';

      if (!deptMap[deptId]) {
        deptMap[deptId] = {
          department: { id: deptId, name: deptName },
          totalRequests: 0,
          totalDays: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          employeeCount: new Set(),
        };
      }
      deptMap[deptId].totalRequests++;
      deptMap[deptId].totalDays += lr.days;
      deptMap[deptId].employeeCount.add(lr.userId);
      if (lr.status === 'APPROVED') deptMap[deptId].approved++;
      if (lr.status === 'PENDING') deptMap[deptId].pending++;
      if (lr.status === 'REJECTED') deptMap[deptId].rejected++;
    });

    groupedData = Object.values(deptMap).map(d => ({
      ...d,
      employeeCount: d.employeeCount.size,
    }));
  } else if (groupBy === 'month') {
    const monthMap = {};
    leaveRequests.forEach(lr => {
      const monthKey = `${lr.startDate.getFullYear()}-${String(lr.startDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          monthName: lr.startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          totalRequests: 0,
          totalDays: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        };
      }
      monthMap[monthKey].totalRequests++;
      monthMap[monthKey].totalDays += lr.days;
      if (lr.status === 'APPROVED') monthMap[monthKey].approved++;
      if (lr.status === 'PENDING') monthMap[monthKey].pending++;
      if (lr.status === 'REJECTED') monthMap[monthKey].rejected++;
    });

    groupedData = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }

  res.json({
    success: true,
    data: {
      dateRange: { start, end },
      groupBy,
      summary,
      leaveTypes: leaveTypes.map(lt => ({ id: lt.id, name: lt.name, code: lt.code })),
      breakdown: groupedData,
    },
  });
}

// ==================== PAYROLL REPORT ====================

export async function getPayrollReport(req, res) {
  const tenantId = req.user.tenantId;
  const {
    month,
    year,
    departmentId,
    reportType = 'summary', // summary, distribution, taxSummary
  } = req.query;

  const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  // Get payslips for the period
  const payslipWhere = {
    tenantId,
    month: targetMonth,
    year: targetYear,
    ...(departmentId && { user: { departmentId: parseInt(departmentId) } }),
  };

  const payslips = await prisma.payslip.findMany({
    where: payslipWhere,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { id: true, name: true } },
          designation: { select: { name: true } },
        },
      },
      components: true,
    },
  });

  // Get salary structures for employees without payslips
  const salaryStructures = await prisma.salaryStructure.findMany({
    where: {
      tenantId,
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: { select: { id: true, name: true } },
        },
      },
      components: {
        include: { component: true },
      },
    },
  });

  // Summary report
  const summary = {
    month: targetMonth,
    year: targetYear,
    monthName: new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    totalPayslips: payslips.length,
    processedCount: payslips.filter(p => p.status === 'PROCESSED').length,
    paidCount: payslips.filter(p => p.status === 'PAID').length,
    draftCount: payslips.filter(p => p.status === 'DRAFT').length,
    totalGrossSalary: payslips.reduce((sum, p) => sum + p.grossSalary, 0),
    totalDeductions: payslips.reduce((sum, p) => sum + p.totalDeductions, 0),
    totalNetSalary: payslips.reduce((sum, p) => sum + p.netSalary, 0),
    averageSalary: payslips.length > 0
      ? Math.round(payslips.reduce((sum, p) => sum + p.netSalary, 0) / payslips.length)
      : 0,
  };

  if (reportType === 'summary') {
    // Department-wise breakdown
    const deptBreakdown = {};
    payslips.forEach(p => {
      const deptId = p.user.department?.id || 'unassigned';
      const deptName = p.user.department?.name || 'Unassigned';

      if (!deptBreakdown[deptId]) {
        deptBreakdown[deptId] = {
          department: { id: deptId, name: deptName },
          employeeCount: 0,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
        };
      }
      deptBreakdown[deptId].employeeCount++;
      deptBreakdown[deptId].totalGross += p.grossSalary;
      deptBreakdown[deptId].totalDeductions += p.totalDeductions;
      deptBreakdown[deptId].totalNet += p.netSalary;
    });

    return res.json({
      success: true,
      data: {
        reportType: 'summary',
        summary,
        departmentBreakdown: Object.values(deptBreakdown),
        payslips: payslips.map(p => ({
          id: p.id,
          employee: {
            id: p.user.id,
            name: `${p.user.firstName} ${p.user.lastName || ''}`.trim(),
            employeeCode: p.user.employeeCode,
            department: p.user.department?.name || '-',
            designation: p.user.designation?.name || '-',
          },
          basicSalary: p.basicSalary,
          grossSalary: p.grossSalary,
          totalDeductions: p.totalDeductions,
          netSalary: p.netSalary,
          status: p.status,
        })),
      },
    });
  }

  if (reportType === 'distribution') {
    // Salary distribution analysis
    const salaryRanges = [
      { min: 0, max: 25000, label: '0 - 25K' },
      { min: 25000, max: 50000, label: '25K - 50K' },
      { min: 50000, max: 75000, label: '50K - 75K' },
      { min: 75000, max: 100000, label: '75K - 100K' },
      { min: 100000, max: 150000, label: '100K - 150K' },
      { min: 150000, max: 200000, label: '150K - 200K' },
      { min: 200000, max: Infinity, label: '200K+' },
    ];

    const distribution = salaryRanges.map(range => ({
      ...range,
      count: payslips.filter(p => p.netSalary >= range.min && p.netSalary < range.max).length,
      totalAmount: payslips
        .filter(p => p.netSalary >= range.min && p.netSalary < range.max)
        .reduce((sum, p) => sum + p.netSalary, 0),
    }));

    // Component-wise breakdown
    const componentBreakdown = {};
    payslips.forEach(p => {
      p.components.forEach(comp => {
        if (!componentBreakdown[comp.componentName]) {
          componentBreakdown[comp.componentName] = {
            name: comp.componentName,
            type: comp.componentType,
            totalAmount: 0,
            count: 0,
          };
        }
        componentBreakdown[comp.componentName].totalAmount += comp.amount;
        componentBreakdown[comp.componentName].count++;
      });
    });

    return res.json({
      success: true,
      data: {
        reportType: 'distribution',
        summary,
        salaryDistribution: distribution,
        componentBreakdown: Object.values(componentBreakdown),
      },
    });
  }

  if (reportType === 'taxSummary') {
    // Tax summary - aggregate deductions
    const taxComponents = ['PF', 'ESI', 'Professional Tax', 'TDS', 'Income Tax'];
    const taxBreakdown = {};

    payslips.forEach(p => {
      p.components.forEach(comp => {
        if (comp.componentType === 'DEDUCTION') {
          if (!taxBreakdown[comp.componentName]) {
            taxBreakdown[comp.componentName] = {
              name: comp.componentName,
              totalAmount: 0,
              employeeCount: 0,
            };
          }
          taxBreakdown[comp.componentName].totalAmount += comp.amount;
          taxBreakdown[comp.componentName].employeeCount++;
        }
      });
    });

    return res.json({
      success: true,
      data: {
        reportType: 'taxSummary',
        summary,
        taxBreakdown: Object.values(taxBreakdown),
        totalTaxDeductions: Object.values(taxBreakdown).reduce((sum, t) => sum + t.totalAmount, 0),
      },
    });
  }

  res.json({ success: true, data: { summary } });
}

// ==================== TURNOVER REPORT ====================

export async function getTurnoverReport(req, res) {
  const tenantId = req.user.tenantId;
  const {
    startDate,
    endDate,
    departmentId,
  } = req.query;

  // Default to last 12 months
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;

  // Get all employees for the tenant
  const allEmployees = await prisma.user.findMany({
    where: {
      tenantId,
      ...(departmentId && { departmentId: parseInt(departmentId) }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      joiningDate: true,
      exitDate: true,
      isActive: true,
      department: { select: { id: true, name: true } },
    },
  });

  // Calculate metrics
  const joinsDuringPeriod = allEmployees.filter(e =>
    e.joiningDate && e.joiningDate >= start && e.joiningDate <= end
  );

  const exitsDuringPeriod = allEmployees.filter(e =>
    e.exitDate && e.exitDate >= start && e.exitDate <= end
  );

  const currentHeadcount = allEmployees.filter(e => e.isActive).length;
  const startHeadcount = allEmployees.filter(e =>
    (!e.joiningDate || e.joiningDate <= start) && (!e.exitDate || e.exitDate > start)
  ).length;

  const avgHeadcount = (startHeadcount + currentHeadcount) / 2;

  // Turnover rate calculation
  const turnoverRate = avgHeadcount > 0
    ? Math.round((exitsDuringPeriod.length / avgHeadcount) * 100 * 10) / 10
    : 0;

  // Retention rate
  const retentionRate = 100 - turnoverRate;

  // Monthly breakdown
  const monthlyData = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const joins = allEmployees.filter(e =>
      e.joiningDate && e.joiningDate >= monthStart && e.joiningDate <= monthEnd
    ).length;

    const exits = allEmployees.filter(e =>
      e.exitDate && e.exitDate >= monthStart && e.exitDate <= monthEnd
    ).length;

    const headcountAtEnd = allEmployees.filter(e =>
      (!e.joiningDate || e.joiningDate <= monthEnd) && (!e.exitDate || e.exitDate > monthEnd)
    ).length;

    monthlyData.push({
      month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
      monthName: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      joins,
      exits,
      netChange: joins - exits,
      headcount: headcountAtEnd,
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Department-wise turnover
  const deptTurnover = {};
  allEmployees.forEach(emp => {
    const deptId = emp.department?.id || 'unassigned';
    const deptName = emp.department?.name || 'Unassigned';

    if (!deptTurnover[deptId]) {
      deptTurnover[deptId] = {
        department: { id: deptId, name: deptName },
        totalEmployees: 0,
        activeEmployees: 0,
        joins: 0,
        exits: 0,
      };
    }

    deptTurnover[deptId].totalEmployees++;
    if (emp.isActive) deptTurnover[deptId].activeEmployees++;

    if (emp.joiningDate && emp.joiningDate >= start && emp.joiningDate <= end) {
      deptTurnover[deptId].joins++;
    }
    if (emp.exitDate && emp.exitDate >= start && emp.exitDate <= end) {
      deptTurnover[deptId].exits++;
    }
  });

  // Calculate tenure distribution
  const tenureRanges = [
    { min: 0, max: 0.5, label: '< 6 months' },
    { min: 0.5, max: 1, label: '6-12 months' },
    { min: 1, max: 2, label: '1-2 years' },
    { min: 2, max: 5, label: '2-5 years' },
    { min: 5, max: Infinity, label: '5+ years' },
  ];

  const tenureDistribution = tenureRanges.map(range => {
    const count = allEmployees.filter(e => {
      if (!e.joiningDate || !e.isActive) return false;
      const tenure = (now - new Date(e.joiningDate)) / (1000 * 60 * 60 * 24 * 365);
      return tenure >= range.min && tenure < range.max;
    }).length;

    return { ...range, count };
  });

  // Average tenure
  const activeWithJoinDate = allEmployees.filter(e => e.isActive && e.joiningDate);
  const avgTenure = activeWithJoinDate.length > 0
    ? activeWithJoinDate.reduce((sum, e) => {
        return sum + (now - new Date(e.joiningDate)) / (1000 * 60 * 60 * 24 * 365);
      }, 0) / activeWithJoinDate.length
    : 0;

  res.json({
    success: true,
    data: {
      dateRange: { start, end },
      summary: {
        currentHeadcount,
        startHeadcount,
        totalJoins: joinsDuringPeriod.length,
        totalExits: exitsDuringPeriod.length,
        netChange: joinsDuringPeriod.length - exitsDuringPeriod.length,
        turnoverRate: `${turnoverRate}%`,
        retentionRate: `${retentionRate}%`,
        avgTenureYears: Math.round(avgTenure * 10) / 10,
      },
      monthlyTrend: monthlyData,
      departmentBreakdown: Object.values(deptTurnover),
      tenureDistribution,
      recentJoins: joinsDuringPeriod.slice(0, 10).map(e => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName || ''}`.trim(),
        department: e.department?.name || '-',
        joiningDate: e.joiningDate,
      })),
      recentExits: exitsDuringPeriod.slice(0, 10).map(e => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName || ''}`.trim(),
        department: e.department?.name || '-',
        exitDate: e.exitDate,
      })),
    },
  });
}

// ==================== HELPER FUNCTIONS ====================

function getWorkingDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// ==================== REPORT OVERVIEW ====================

export async function getReportOverview(req, res) {
  const tenantId = req.user.tenantId;

  // Get quick stats for report dashboard
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    totalEmployees,
    activeEmployees,
    thisMonthAttendance,
    thisMonthLeaves,
    thisMonthPayslips,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, isActive: true } }),
    prisma.attendance.count({
      where: {
        tenantId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.leaveRequest.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.payslip.count({
      where: {
        tenantId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      currentMonth: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      quickStats: {
        totalEmployees,
        activeEmployees,
        thisMonthAttendance,
        thisMonthLeaves,
        thisMonthPayslips,
      },
      availableReports: [
        {
          id: 'headcount',
          name: 'Headcount Report',
          description: 'Employee distribution by department, designation, location',
          icon: 'Users',
        },
        {
          id: 'attendance',
          name: 'Attendance Report',
          description: 'Daily, monthly attendance summary and trends',
          icon: 'Clock',
        },
        {
          id: 'leave',
          name: 'Leave Report',
          description: 'Leave utilization by type, department, employee',
          icon: 'Calendar',
        },
        {
          id: 'payroll',
          name: 'Payroll Report',
          description: 'Salary distribution, tax summary, deductions',
          icon: 'IndianRupee',
        },
        {
          id: 'turnover',
          name: 'Turnover Report',
          description: 'Joins, exits, retention rate, tenure analysis',
          icon: 'TrendingUp',
        },
      ],
    },
  });
}
