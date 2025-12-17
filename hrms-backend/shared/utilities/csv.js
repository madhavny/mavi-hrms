import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { stringify } from 'csv-stringify/sync';

/**
 * Parse CSV content from a buffer or string
 * @param {Buffer|string} content - CSV content
 * @returns {Promise<Array>} Parsed rows
 */
export async function parseCSV(content) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(content.toString());

    stream
      .pipe(csvParser({
        mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'),
        skipEmptyLines: true,
      }))
      .on('data', (row) => {
        // Trim all values
        const cleanRow = {};
        for (const [key, value] of Object.entries(row)) {
          cleanRow[key] = typeof value === 'string' ? value.trim() : value;
        }
        results.push(cleanRow);
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

/**
 * Generate CSV content from data array
 * @param {Array} data - Array of objects
 * @param {Array} columns - Column definitions [{key, header}]
 * @returns {string} CSV content
 */
export function generateCSV(data, columns) {
  const headers = columns.map(col => col.header);
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toISOString().split('T')[0];
      return String(value);
    })
  );

  return stringify([headers, ...rows]);
}

/**
 * Employee import template columns
 */
export const employeeImportColumns = [
  { key: 'email', header: 'Email', required: true },
  { key: 'password', header: 'Password', required: true },
  { key: 'first_name', header: 'First Name', required: true },
  { key: 'last_name', header: 'Last Name', required: false },
  { key: 'phone', header: 'Phone', required: false },
  { key: 'employee_code', header: 'Employee Code', required: false },
  { key: 'role_code', header: 'Role Code', required: true, description: 'ADMIN, HR, MANAGER, or EMPLOYEE' },
  { key: 'department_code', header: 'Department Code', required: false },
  { key: 'designation_code', header: 'Designation Code', required: false },
  { key: 'location_code', header: 'Location Code', required: false },
  { key: 'date_of_joining', header: 'Date of Joining', required: false, description: 'YYYY-MM-DD format' },
  { key: 'employment_type', header: 'Employment Type', required: false, description: 'FULL_TIME, PART_TIME, or CONTRACT' },
  { key: 'date_of_birth', header: 'Date of Birth', required: false, description: 'YYYY-MM-DD format' },
  { key: 'gender', header: 'Gender', required: false, description: 'MALE, FEMALE, or OTHER' },
];

/**
 * Employee export columns
 */
export const employeeExportColumns = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'email', header: 'Email' },
  { key: 'firstName', header: 'First Name' },
  { key: 'lastName', header: 'Last Name' },
  { key: 'phone', header: 'Phone' },
  { key: 'roleName', header: 'Role' },
  { key: 'departmentName', header: 'Department' },
  { key: 'designationName', header: 'Designation' },
  { key: 'locationName', header: 'Location' },
  { key: 'dateOfJoining', header: 'Date of Joining' },
  { key: 'employmentType', header: 'Employment Type' },
  { key: 'dateOfBirth', header: 'Date of Birth' },
  { key: 'gender', header: 'Gender' },
  { key: 'isActive', header: 'Status' },
  { key: 'createdAt', header: 'Created At' },
];

/**
 * Generate employee import template
 * @returns {string} CSV template content
 */
export function generateEmployeeTemplate() {
  const headers = employeeImportColumns.map(col => col.header);
  const exampleRow = [
    'john.doe@example.com',
    'SecurePass123!',
    'John',
    'Doe',
    '+1234567890',
    'EMP001',
    'EMPLOYEE',
    'TECH',
    'SE',
    'HQ',
    '2024-01-15',
    'FULL_TIME',
    '1990-05-20',
    'MALE',
  ];

  return stringify([headers, exampleRow]);
}

/**
 * Validate employee import row
 * @param {Object} row - Row data
 * @param {number} rowIndex - Row number (for error messages)
 * @param {Object} lookups - Lookup maps for roles, departments, etc.
 * @returns {Object} { valid: boolean, errors: string[], data: Object }
 */
export function validateEmployeeRow(row, rowIndex, lookups) {
  const errors = [];
  const data = {};

  // Email validation
  if (!row.email) {
    errors.push(`Row ${rowIndex}: Email is required`);
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`Row ${rowIndex}: Invalid email format`);
  } else {
    data.email = row.email.toLowerCase();
  }

  // Password validation
  if (!row.password) {
    errors.push(`Row ${rowIndex}: Password is required`);
  } else if (row.password.length < 8) {
    errors.push(`Row ${rowIndex}: Password must be at least 8 characters`);
  } else {
    data.password = row.password;
  }

  // First name validation
  if (!row.first_name) {
    errors.push(`Row ${rowIndex}: First Name is required`);
  } else {
    data.firstName = row.first_name;
  }

  // Optional fields
  data.lastName = row.last_name || null;
  data.phone = row.phone || null;
  data.employeeCode = row.employee_code || null;

  // Role validation
  if (!row.role_code) {
    errors.push(`Row ${rowIndex}: Role Code is required`);
  } else {
    const role = lookups.roles.find(r => r.code.toUpperCase() === row.role_code.toUpperCase());
    if (!role) {
      errors.push(`Row ${rowIndex}: Invalid Role Code '${row.role_code}'`);
    } else {
      data.roleId = role.id;
    }
  }

  // Department validation (optional)
  if (row.department_code) {
    const dept = lookups.departments.find(d => d.code.toUpperCase() === row.department_code.toUpperCase());
    if (!dept) {
      errors.push(`Row ${rowIndex}: Invalid Department Code '${row.department_code}'`);
    } else {
      data.departmentId = dept.id;
    }
  }

  // Designation validation (optional)
  if (row.designation_code) {
    const desig = lookups.designations.find(d => d.code.toUpperCase() === row.designation_code.toUpperCase());
    if (!desig) {
      errors.push(`Row ${rowIndex}: Invalid Designation Code '${row.designation_code}'`);
    } else {
      data.designationId = desig.id;
    }
  }

  // Location validation (optional)
  if (row.location_code) {
    const loc = lookups.locations.find(l => l.code.toUpperCase() === row.location_code.toUpperCase());
    if (!loc) {
      errors.push(`Row ${rowIndex}: Invalid Location Code '${row.location_code}'`);
    } else {
      data.locationId = loc.id;
    }
  }

  // Date of joining validation (optional)
  if (row.date_of_joining) {
    const date = new Date(row.date_of_joining);
    if (isNaN(date.getTime())) {
      errors.push(`Row ${rowIndex}: Invalid Date of Joining format (use YYYY-MM-DD)`);
    } else {
      data.dateOfJoining = date;
    }
  }

  // Employment type validation (optional)
  if (row.employment_type) {
    const validTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT'];
    if (!validTypes.includes(row.employment_type.toUpperCase())) {
      errors.push(`Row ${rowIndex}: Invalid Employment Type '${row.employment_type}'`);
    } else {
      data.employmentType = row.employment_type.toUpperCase();
    }
  }

  // Date of birth validation (optional)
  if (row.date_of_birth) {
    const date = new Date(row.date_of_birth);
    if (isNaN(date.getTime())) {
      errors.push(`Row ${rowIndex}: Invalid Date of Birth format (use YYYY-MM-DD)`);
    } else {
      data.dateOfBirth = date;
    }
  }

  // Gender validation (optional)
  if (row.gender) {
    const validGenders = ['MALE', 'FEMALE', 'OTHER'];
    if (!validGenders.includes(row.gender.toUpperCase())) {
      errors.push(`Row ${rowIndex}: Invalid Gender '${row.gender}'`);
    } else {
      data.gender = row.gender.toUpperCase();
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data,
  };
}

/**
 * Attendance bulk mark template columns
 */
export const attendanceBulkColumns = [
  { key: 'employee_code', header: 'Employee Code', required: true },
  { key: 'date', header: 'Date', required: true, description: 'YYYY-MM-DD format' },
  { key: 'status', header: 'Status', required: true, description: 'PRESENT, ABSENT, HALF_DAY, LATE, ON_LEAVE, HOLIDAY, WEEKEND' },
  { key: 'clock_in', header: 'Clock In', required: false, description: 'HH:MM format (24-hour)' },
  { key: 'clock_out', header: 'Clock Out', required: false, description: 'HH:MM format (24-hour)' },
  { key: 'remarks', header: 'Remarks', required: false },
];

/**
 * Validate attendance bulk mark row
 * @param {Object} row - Row data
 * @param {number} rowIndex - Row number
 * @param {Object} lookups - Lookup maps
 * @returns {Object} { valid: boolean, errors: string[], data: Object }
 */
export function validateAttendanceRow(row, rowIndex, lookups) {
  const errors = [];
  const data = {};

  // Employee code validation
  if (!row.employee_code) {
    errors.push(`Row ${rowIndex}: Employee Code is required`);
  } else {
    const employee = lookups.employees.find(e =>
      e.employeeCode?.toUpperCase() === row.employee_code.toUpperCase()
    );
    if (!employee) {
      errors.push(`Row ${rowIndex}: Invalid Employee Code '${row.employee_code}'`);
    } else {
      data.userId = employee.id;
    }
  }

  // Date validation
  if (!row.date) {
    errors.push(`Row ${rowIndex}: Date is required`);
  } else {
    const date = new Date(row.date);
    if (isNaN(date.getTime())) {
      errors.push(`Row ${rowIndex}: Invalid Date format (use YYYY-MM-DD)`);
    } else {
      data.date = date;
    }
  }

  // Status validation
  const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND'];
  if (!row.status) {
    errors.push(`Row ${rowIndex}: Status is required`);
  } else if (!validStatuses.includes(row.status.toUpperCase())) {
    errors.push(`Row ${rowIndex}: Invalid Status '${row.status}'`);
  } else {
    data.status = row.status.toUpperCase();
  }

  // Clock in validation (optional)
  if (row.clock_in) {
    const timeMatch = row.clock_in.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      errors.push(`Row ${rowIndex}: Invalid Clock In format (use HH:MM)`);
    } else {
      const [, hours, minutes] = timeMatch;
      if (parseInt(hours) > 23 || parseInt(minutes) > 59) {
        errors.push(`Row ${rowIndex}: Invalid Clock In time`);
      } else {
        data.clockIn = row.clock_in;
      }
    }
  }

  // Clock out validation (optional)
  if (row.clock_out) {
    const timeMatch = row.clock_out.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      errors.push(`Row ${rowIndex}: Invalid Clock Out format (use HH:MM)`);
    } else {
      const [, hours, minutes] = timeMatch;
      if (parseInt(hours) > 23 || parseInt(minutes) > 59) {
        errors.push(`Row ${rowIndex}: Invalid Clock Out time`);
      } else {
        data.clockOut = row.clock_out;
      }
    }
  }

  // Remarks (optional)
  data.remarks = row.remarks || null;

  return {
    valid: errors.length === 0,
    errors,
    data,
  };
}
