import prisma from '@shared/config/database.js';
import { hashPassword } from '@shared/utilities/password.js';
import { auditCreate } from '@shared/utilities/audit.js';
import {
  parseCSV,
  generateCSV,
  generateEmployeeTemplate,
  employeeExportColumns,
  validateEmployeeRow,
  validateAttendanceRow,
} from '@shared/utilities/csv.js';

/**
 * Download employee import template
 */
export const downloadEmployeeTemplate = async (req, res) => {
  const csv = generateEmployeeTemplate();

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.csv');
  return res.send(csv);
};

/**
 * Bulk import employees from CSV
 */
export const bulkImportEmployees = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    // Parse CSV
    const rows = await parseCSV(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }

    if (rows.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 500 employees can be imported at once',
      });
    }

    // Load lookup data
    const [roles, departments, designations, locations, existingUsers] = await Promise.all([
      prisma.role.findMany({ where: { tenantId, isActive: true } }),
      prisma.department.findMany({ where: { tenantId, isActive: true } }),
      prisma.designation.findMany({ where: { tenantId, isActive: true } }),
      prisma.location.findMany({ where: { tenantId, isActive: true } }),
      prisma.user.findMany({
        where: { tenantId },
        select: { email: true, employeeCode: true },
      }),
    ]);

    const lookups = { roles, departments, designations, locations };
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingCodes = new Set(existingUsers.filter(u => u.employeeCode).map(u => u.employeeCode.toUpperCase()));

    // Validate all rows
    const results = {
      total: rows.length,
      successful: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    const validRows = [];

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2; // +2 because row 1 is header, and we're 0-indexed
      const validation = validateEmployeeRow(rows[i], rowIndex, lookups);

      if (!validation.valid) {
        results.errors.push(...validation.errors);
        results.failed++;
        continue;
      }

      // Check for duplicate email
      if (existingEmails.has(validation.data.email.toLowerCase())) {
        results.errors.push(`Row ${rowIndex}: Email '${validation.data.email}' already exists`);
        results.failed++;
        continue;
      }

      // Check for duplicate employee code
      if (validation.data.employeeCode && existingCodes.has(validation.data.employeeCode.toUpperCase())) {
        results.errors.push(`Row ${rowIndex}: Employee Code '${validation.data.employeeCode}' already exists`);
        results.failed++;
        continue;
      }

      // Add to valid rows and track for duplicates within file
      existingEmails.add(validation.data.email.toLowerCase());
      if (validation.data.employeeCode) {
        existingCodes.add(validation.data.employeeCode.toUpperCase());
      }

      validRows.push({ rowIndex, data: validation.data });
    }

    // Create valid employees
    for (const { rowIndex, data } of validRows) {
      try {
        const hashedPassword = await hashPassword(data.password);

        const user = await prisma.user.create({
          data: {
            tenantId,
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            employeeCode: data.employeeCode,
            roleId: data.roleId,
            departmentId: data.departmentId,
            designationId: data.designationId,
            locationId: data.locationId,
            dateOfJoining: data.dateOfJoining,
            employmentType: data.employmentType,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            createdBy: req.user.id,
          },
          select: { id: true, email: true, firstName: true, lastName: true },
        });

        results.successful++;
        results.created.push({
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
        });

        // Log creation
        await auditCreate({
          tenantId,
          userId: req.user.id,
          userEmail: req.user.email,
          entity: 'User',
          entityId: user.id,
          data: { ...data, password: '[REDACTED]', source: 'bulk_import' },
          req,
        });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process import file',
      error: err.message,
    });
  }
};

/**
 * Export employees to CSV
 */
export const exportEmployees = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { search, roleId, departmentId, isActive } = req.query;

  try {
    // Build where clause
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

    // Fetch employees
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

    // Transform data for export
    const exportData = employees.map(emp => ({
      employeeCode: emp.employeeCode || '',
      email: emp.email,
      firstName: emp.firstName,
      lastName: emp.lastName || '',
      phone: emp.phone || '',
      roleName: emp.role?.name || '',
      departmentName: emp.department?.name || '',
      designationName: emp.designation?.name || '',
      locationName: emp.location?.name || '',
      dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.toISOString().split('T')[0] : '',
      employmentType: emp.employmentType || '',
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.toISOString().split('T')[0] : '',
      gender: emp.gender || '',
      isActive: emp.isActive ? 'Active' : 'Inactive',
      createdAt: emp.createdAt.toISOString().split('T')[0],
    }));

    const csv = generateCSV(exportData, employeeExportColumns);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=employees_export_${Date.now()}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to export employees',
      error: err.message,
    });
  }
};

/**
 * Bulk mark attendance
 */
export const bulkMarkAttendance = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'No attendance records provided' });
  }

  if (records.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 1000 attendance records can be marked at once',
    });
  }

  try {
    // Load employees for validation
    const employees = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, employeeCode: true },
    });

    const lookups = { employees };

    const results = {
      total: records.length,
      successful: 0,
      failed: 0,
      errors: [],
      created: [],
      updated: [],
    };

    for (let i = 0; i < records.length; i++) {
      const rowIndex = i + 1;
      const record = records[i];

      // Validate record
      const validation = validateAttendanceRow(record, rowIndex, lookups);

      if (!validation.valid) {
        results.errors.push(...validation.errors);
        results.failed++;
        continue;
      }

      const { userId, date, status, clockIn, clockOut, remarks } = validation.data;

      try {
        // Build clock in/out datetime if provided
        let clockInTime = null;
        let clockOutTime = null;

        if (clockIn) {
          const [hours, minutes] = clockIn.split(':').map(Number);
          clockInTime = new Date(date);
          clockInTime.setHours(hours, minutes, 0, 0);
        }

        if (clockOut) {
          const [hours, minutes] = clockOut.split(':').map(Number);
          clockOutTime = new Date(date);
          clockOutTime.setHours(hours, minutes, 0, 0);
        }

        // Calculate total hours if both clock in and out provided
        let totalHours = null;
        if (clockInTime && clockOutTime) {
          totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
          if (totalHours < 0) totalHours = 0;
        }

        // Upsert attendance record
        const attendance = await prisma.attendance.upsert({
          where: {
            tenantId_userId_date: {
              tenantId,
              userId,
              date: new Date(date.toISOString().split('T')[0]),
            },
          },
          create: {
            tenantId,
            userId,
            date: new Date(date.toISOString().split('T')[0]),
            status,
            clockIn: clockInTime,
            clockOut: clockOutTime,
            totalHours,
            remarks,
            approvedBy: req.user.id,
            approvedAt: new Date(),
          },
          update: {
            status,
            clockIn: clockInTime,
            clockOut: clockOutTime,
            totalHours,
            remarks,
            approvedBy: req.user.id,
            approvedAt: new Date(),
          },
        });

        results.successful++;

        if (attendance.createdAt.getTime() === attendance.updatedAt.getTime()) {
          results.created.push({ id: attendance.id, userId, date: date.toISOString().split('T')[0] });
        } else {
          results.updated.push({ id: attendance.id, userId, date: date.toISOString().split('T')[0] });
        }
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to mark attendance - ${err.message}`);
        results.failed++;
      }
    }

    return res.json({
      success: true,
      message: `Attendance marked: ${results.successful} successful, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Bulk attendance error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: err.message,
    });
  }
};

/**
 * Get employees for bulk attendance selection
 */
export const getEmployeesForAttendance = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { search, departmentId } = req.query;

  const where = { tenantId, isActive: true };
  if (departmentId) where.departmentId = parseInt(departmentId);
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
    ];
  }

  const employees = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      department: { select: { name: true } },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return res.json({
    success: true,
    data: employees.map(e => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName || ''}`.trim(),
      employeeCode: e.employeeCode,
      department: e.department?.name,
    })),
  });
};
