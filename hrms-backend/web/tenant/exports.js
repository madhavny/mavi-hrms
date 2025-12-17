import prisma from '@shared/config/database.js';
import { generateExcel, employeeExcelColumns, attendanceExcelColumns, leaveExcelColumns } from '@shared/utilities/excel.js';
import { generatePDF, employeePDFColumns, attendancePDFColumns, leavePDFColumns } from '@shared/utilities/pdf.js';

/**
 * Export employees to Excel
 */
export const exportEmployeesExcel = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { search, roleId, departmentId, isActive } = req.query;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const where = { tenantId };
    if (roleId) where.roleId = parseInt(roleId);
    if (departmentId) where.departmentId = parseInt(departmentId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.user.findMany({
      where,
      include: {
        role: { select: { name: true } },
        department: { select: { name: true } },
        designation: { select: { name: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const data = employees.map(emp => ({
      employeeCode: emp.employeeCode || '-',
      firstName: emp.firstName,
      lastName: emp.lastName || '',
      email: emp.email,
      phone: emp.phone || '-',
      roleName: emp.role?.name || '-',
      departmentName: emp.department?.name || '-',
      designationName: emp.designation?.name || '-',
      locationName: emp.location?.name || '-',
      dateOfJoining: emp.dateOfJoining,
      employmentType: emp.employmentType || '-',
      status: emp.isActive ? 'Active' : 'Inactive',
    }));

    const filters = {};
    if (search) filters['Search'] = search;
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: parseInt(roleId) } });
      filters['Role'] = role?.name || roleId;
    }
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: parseInt(departmentId) } });
      filters['Department'] = dept?.name || departmentId;
    }
    if (isActive !== undefined) filters['Status'] = isActive === 'true' ? 'Active' : 'Inactive';

    const buffer = await generateExcel({
      title: 'Employee List',
      sheetName: 'Employees',
      columns: employeeExcelColumns,
      data,
      filters,
      tenantName: tenant?.name || '',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${Date.now()}.xlsx`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export employees Excel error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export employees', error: err.message });
  }
};

/**
 * Export employees to PDF
 */
export const exportEmployeesPDF = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { search, roleId, departmentId, isActive } = req.query;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const where = { tenantId };
    if (roleId) where.roleId = parseInt(roleId);
    if (departmentId) where.departmentId = parseInt(departmentId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.user.findMany({
      where,
      include: {
        role: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const data = employees.map(emp => ({
      employeeCode: emp.employeeCode || '-',
      fullName: `${emp.firstName} ${emp.lastName || ''}`.trim(),
      email: emp.email,
      roleName: emp.role?.name || '-',
      departmentName: emp.department?.name || '-',
      dateOfJoining: emp.dateOfJoining,
      status: emp.isActive ? 'Active' : 'Inactive',
    }));

    const filters = {};
    if (search) filters['Search'] = search;
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: parseInt(roleId) } });
      filters['Role'] = role?.name || roleId;
    }
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: parseInt(departmentId) } });
      filters['Department'] = dept?.name || departmentId;
    }

    const buffer = await generatePDF({
      title: 'Employee List',
      columns: employeePDFColumns,
      data,
      filters,
      tenantName: tenant?.name || '',
      orientation: 'landscape',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${Date.now()}.pdf`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export employees PDF error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export employees', error: err.message });
  }
};

/**
 * Export attendance to Excel
 */
export const exportAttendanceExcel = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { startDate, endDate, userId, departmentId, status } = req.query;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const where = { tenantId };
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.date = { gte: new Date(startDate) };
    } else if (endDate) {
      where.date = { lte: new Date(endDate) };
    }
    if (userId) where.userId = parseInt(userId);
    if (status) where.status = status;
    if (departmentId) {
      where.user = { departmentId: parseInt(departmentId) };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { userId: 'asc' }],
    });

    const data = attendance.map(att => ({
      date: att.date,
      employeeCode: att.user?.employeeCode || '-',
      employeeName: `${att.user?.firstName || ''} ${att.user?.lastName || ''}`.trim(),
      department: att.user?.department?.name || '-',
      clockIn: att.clockIn ? new Date(att.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
      clockOut: att.clockOut ? new Date(att.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
      totalHours: att.totalHours ? `${att.totalHours.toFixed(2)}h` : '-',
      status: att.status.replace('_', ' '),
      remarks: att.remarks || '-',
    }));

    const filters = {};
    if (startDate) filters['From'] = new Date(startDate).toLocaleDateString();
    if (endDate) filters['To'] = new Date(endDate).toLocaleDateString();
    if (status) filters['Status'] = status.replace('_', ' ');
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: parseInt(departmentId) } });
      filters['Department'] = dept?.name || departmentId;
    }

    const buffer = await generateExcel({
      title: 'Attendance Report',
      sheetName: 'Attendance',
      columns: attendanceExcelColumns,
      data,
      filters,
      tenantName: tenant?.name || '',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${Date.now()}.xlsx`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export attendance Excel error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export attendance', error: err.message });
  }
};

/**
 * Export attendance to PDF
 */
export const exportAttendancePDF = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { startDate, endDate, userId, departmentId, status } = req.query;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const where = { tenantId };
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.date = { gte: new Date(startDate) };
    } else if (endDate) {
      where.date = { lte: new Date(endDate) };
    }
    if (userId) where.userId = parseInt(userId);
    if (status) where.status = status;
    if (departmentId) {
      where.user = { departmentId: parseInt(departmentId) };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { userId: 'asc' }],
    });

    const data = attendance.map(att => ({
      date: att.date,
      employeeCode: att.user?.employeeCode || '-',
      employeeName: `${att.user?.firstName || ''} ${att.user?.lastName || ''}`.trim(),
      department: att.user?.department?.name || '-',
      clockIn: att.clockIn,
      clockOut: att.clockOut,
      totalHours: att.totalHours ? `${att.totalHours.toFixed(1)}h` : '-',
      status: att.status.replace('_', ' '),
      remarks: att.remarks || '-',
    }));

    const filters = {};
    if (startDate) filters['From'] = new Date(startDate).toLocaleDateString();
    if (endDate) filters['To'] = new Date(endDate).toLocaleDateString();
    if (status) filters['Status'] = status.replace('_', ' ');

    const buffer = await generatePDF({
      title: 'Attendance Report',
      columns: attendancePDFColumns,
      data,
      filters,
      tenantName: tenant?.name || '',
      orientation: 'landscape',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${Date.now()}.pdf`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export attendance PDF error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export attendance', error: err.message });
  }
};

/**
 * Export leave requests to Excel
 */
export const exportLeaveExcel = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { startDate, endDate, userId, departmentId, status, leaveTypeId } = req.query;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const where = { tenantId };
    if (startDate && endDate) {
      where.OR = [
        { fromDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { toDate: { gte: new Date(startDate), lte: new Date(endDate) } },
      ];
    }
    if (userId) where.userId = parseInt(userId);
    if (status) where.status = status;
    if (leaveTypeId) where.leaveTypeId = parseInt(leaveTypeId);
    if (departmentId) {
      where.user = { departmentId: parseInt(departmentId) };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = leaves.map(leave => ({
      employeeCode: leave.user?.employeeCode || '-',
      employeeName: `${leave.user?.firstName || ''} ${leave.user?.lastName || ''}`.trim(),
      department: leave.user?.department?.name || '-',
      leaveType: leave.leaveType?.name || '-',
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      totalDays: leave.totalDays,
      reason: leave.reason || '-',
      status: leave.status,
      createdAt: leave.createdAt,
    }));

    const filters = {};
    if (startDate) filters['From'] = new Date(startDate).toLocaleDateString();
    if (endDate) filters['To'] = new Date(endDate).toLocaleDateString();
    if (status) filters['Status'] = status;
    if (leaveTypeId) {
      const leaveType = await prisma.leaveType.findUnique({ where: { id: parseInt(leaveTypeId) } });
      filters['Leave Type'] = leaveType?.name || leaveTypeId;
    }

    const buffer = await generateExcel({
      title: 'Leave Report',
      sheetName: 'Leave Requests',
      columns: leaveExcelColumns,
      data,
      filters,
      tenantName: tenant?.name || '',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leave_report_${Date.now()}.xlsx`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export leave Excel error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export leave report', error: err.message });
  }
};

/**
 * Export leave requests to PDF
 */
export const exportLeavePDF = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { startDate, endDate, userId, departmentId, status, leaveTypeId } = req.query;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const where = { tenantId };
    if (startDate && endDate) {
      where.OR = [
        { fromDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { toDate: { gte: new Date(startDate), lte: new Date(endDate) } },
      ];
    }
    if (userId) where.userId = parseInt(userId);
    if (status) where.status = status;
    if (leaveTypeId) where.leaveTypeId = parseInt(leaveTypeId);
    if (departmentId) {
      where.user = { departmentId: parseInt(departmentId) };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = leaves.map(leave => ({
      employeeCode: leave.user?.employeeCode || '-',
      employeeName: `${leave.user?.firstName || ''} ${leave.user?.lastName || ''}`.trim(),
      department: leave.user?.department?.name || '-',
      leaveType: leave.leaveType?.name || '-',
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      totalDays: leave.totalDays,
      status: leave.status,
      reason: leave.reason || '-',
    }));

    const filters = {};
    if (startDate) filters['From'] = new Date(startDate).toLocaleDateString();
    if (endDate) filters['To'] = new Date(endDate).toLocaleDateString();
    if (status) filters['Status'] = status;

    const buffer = await generatePDF({
      title: 'Leave Report',
      columns: leavePDFColumns,
      data,
      filters,
      tenantName: tenant?.name || '',
      orientation: 'landscape',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=leave_report_${Date.now()}.pdf`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export leave PDF error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export leave report', error: err.message });
  }
};
