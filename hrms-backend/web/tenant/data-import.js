import prisma from '@shared/config/database.js';
import { hashPassword } from '@shared/utilities/password.js';
import { auditCreate, createAuditLog } from '@shared/utilities/audit.js';
import { parseCSV, generateCSV } from '@shared/utilities/csv.js';

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

const TEMPLATES = {
  departments: {
    columns: [
      { key: 'code', header: 'code', required: true },
      { key: 'name', header: 'name', required: true },
      { key: 'parent_code', header: 'parent_code', required: false },
      { key: 'is_active', header: 'is_active', required: false },
    ],
    sample: [
      { code: 'TECH', name: 'Technology', parent_code: '', is_active: 'true' },
      { code: 'ENG', name: 'Engineering', parent_code: 'TECH', is_active: 'true' },
      { code: 'FE', name: 'Frontend', parent_code: 'ENG', is_active: 'true' },
      { code: 'BE', name: 'Backend', parent_code: 'ENG', is_active: 'true' },
      { code: 'HR', name: 'Human Resources', parent_code: '', is_active: 'true' },
    ],
  },

  designations: {
    columns: [
      { key: 'code', header: 'code', required: true },
      { key: 'name', header: 'name', required: true },
      { key: 'level', header: 'level', required: false },
      { key: 'is_active', header: 'is_active', required: false },
    ],
    sample: [
      { code: 'CEO', name: 'Chief Executive Officer', level: '1', is_active: 'true' },
      { code: 'CTO', name: 'Chief Technology Officer', level: '5', is_active: 'true' },
      { code: 'MGR', name: 'Manager', level: '20', is_active: 'true' },
      { code: 'SR', name: 'Senior Engineer', level: '30', is_active: 'true' },
      { code: 'JR', name: 'Junior Engineer', level: '50', is_active: 'true' },
    ],
  },

  locations: {
    columns: [
      { key: 'code', header: 'code', required: true },
      { key: 'name', header: 'name', required: true },
      { key: 'address', header: 'address', required: false },
      { key: 'city', header: 'city', required: false },
      { key: 'state', header: 'state', required: false },
      { key: 'country', header: 'country', required: false },
      { key: 'pincode', header: 'pincode', required: false },
      { key: 'is_active', header: 'is_active', required: false },
    ],
    sample: [
      { code: 'HQ', name: 'Head Office', address: '123 Business Park', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', is_active: 'true' },
      { code: 'BLR', name: 'Bangalore Office', address: '456 Tech Street', city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001', is_active: 'true' },
      { code: 'DEL', name: 'Delhi Office', address: '789 Corporate Tower', city: 'New Delhi', state: 'Delhi', country: 'India', pincode: '110001', is_active: 'true' },
    ],
  },

  roles: {
    columns: [
      { key: 'code', header: 'code', required: true },
      { key: 'name', header: 'name', required: true },
      { key: 'description', header: 'description', required: false },
    ],
    sample: [
      { code: 'HR_EXECUTIVE', name: 'HR Executive', description: 'HR team member' },
      { code: 'TEAM_LEAD', name: 'Team Lead', description: 'Team leadership role' },
      { code: 'INTERN', name: 'Intern', description: 'Internship role' },
    ],
  },

  'leave-types': {
    columns: [
      { key: 'code', header: 'code', required: true },
      { key: 'name', header: 'name', required: true },
      { key: 'max_days_per_year', header: 'max_days_per_year', required: false },
      { key: 'is_paid', header: 'is_paid', required: false },
      { key: 'carry_forward', header: 'carry_forward', required: false },
      { key: 'requires_document', header: 'requires_document', required: false },
      { key: 'is_active', header: 'is_active', required: false },
    ],
    sample: [
      { code: 'CL', name: 'Casual Leave', max_days_per_year: '12', is_paid: 'true', carry_forward: 'true', requires_document: 'false', is_active: 'true' },
      { code: 'SL', name: 'Sick Leave', max_days_per_year: '10', is_paid: 'true', carry_forward: 'false', requires_document: 'true', is_active: 'true' },
      { code: 'PL', name: 'Privilege Leave', max_days_per_year: '15', is_paid: 'true', carry_forward: 'true', requires_document: 'false', is_active: 'true' },
      { code: 'ML', name: 'Maternity Leave', max_days_per_year: '180', is_paid: 'true', carry_forward: 'false', requires_document: 'true', is_active: 'true' },
    ],
  },

  'salary-components': {
    columns: [
      { key: 'code', header: 'code', required: true },
      { key: 'name', header: 'name', required: true },
      { key: 'type', header: 'type', required: true },
      { key: 'calculation_type', header: 'calculation_type', required: false },
      { key: 'is_taxable', header: 'is_taxable', required: false },
      { key: 'order', header: 'order', required: false },
      { key: 'is_active', header: 'is_active', required: false },
    ],
    sample: [
      { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', calculation_type: 'FIXED', is_taxable: 'true', order: '1', is_active: 'true' },
      { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', calculation_type: 'PERCENTAGE', is_taxable: 'false', order: '2', is_active: 'true' },
      { code: 'DA', name: 'Dearness Allowance', type: 'EARNING', calculation_type: 'PERCENTAGE', is_taxable: 'true', order: '3', is_active: 'true' },
      { code: 'PF', name: 'Provident Fund', type: 'DEDUCTION', calculation_type: 'PERCENTAGE', is_taxable: 'false', order: '10', is_active: 'true' },
      { code: 'PT', name: 'Professional Tax', type: 'DEDUCTION', calculation_type: 'FIXED', is_taxable: 'false', order: '11', is_active: 'true' },
    ],
  },

  'expense-categories': {
    columns: [
      { key: 'name', header: 'name', required: true },
      { key: 'max_limit', header: 'max_limit', required: false },
      { key: 'requires_receipt', header: 'requires_receipt', required: false },
      { key: 'is_active', header: 'is_active', required: false },
    ],
    sample: [
      { name: 'Travel', max_limit: '50000', requires_receipt: 'true', is_active: 'true' },
      { name: 'Food & Meals', max_limit: '5000', requires_receipt: 'true', is_active: 'true' },
      { name: 'Accommodation', max_limit: '20000', requires_receipt: 'true', is_active: 'true' },
      { name: 'Office Supplies', max_limit: '10000', requires_receipt: 'true', is_active: 'true' },
    ],
  },

  skills: {
    columns: [
      { key: 'name', header: 'name', required: true },
      { key: 'category', header: 'category', required: true },
      { key: 'description', header: 'description', required: false },
      { key: 'is_active', header: 'is_active', required: false },
    ],
    sample: [
      { name: 'JavaScript', category: 'TECHNICAL', description: 'JavaScript programming', is_active: 'true' },
      { name: 'React', category: 'TECHNICAL', description: 'React.js framework', is_active: 'true' },
      { name: 'Leadership', category: 'SOFT', description: 'Team leadership skills', is_active: 'true' },
      { name: 'English', category: 'LANGUAGE', description: 'English language proficiency', is_active: 'true' },
    ],
  },

  projects: {
    columns: [
      { key: 'code', header: 'code', required: true },
      { key: 'name', header: 'name', required: true },
      { key: 'client_name', header: 'client_name', required: false },
      { key: 'start_date', header: 'start_date', required: true },
      { key: 'end_date', header: 'end_date', required: false },
      { key: 'status', header: 'status', required: false },
      { key: 'budget_hours', header: 'budget_hours', required: false },
    ],
    sample: [
      { code: 'PROJ001', name: 'HRMS Development', client_name: 'Internal', start_date: '2024-01-01', end_date: '', status: 'ACTIVE', budget_hours: '2000' },
      { code: 'PROJ002', name: 'Client Portal', client_name: 'ABC Corp', start_date: '2024-03-01', end_date: '2024-12-31', status: 'ACTIVE', budget_hours: '1500' },
    ],
  },

  employees: {
    columns: [
      { key: 'email', header: 'email', required: true },
      { key: 'password', header: 'password', required: true },
      { key: 'first_name', header: 'first_name', required: true },
      { key: 'last_name', header: 'last_name', required: false },
      { key: 'phone', header: 'phone', required: false },
      { key: 'employee_code', header: 'employee_code', required: false },
      { key: 'role_code', header: 'role_code', required: true },
      { key: 'department_code', header: 'department_code', required: false },
      { key: 'designation_code', header: 'designation_code', required: false },
      { key: 'location_code', header: 'location_code', required: false },
      { key: 'date_of_joining', header: 'date_of_joining', required: false },
      { key: 'employment_type', header: 'employment_type', required: false },
      { key: 'date_of_birth', header: 'date_of_birth', required: false },
      { key: 'gender', header: 'gender', required: false },
      { key: 'reporting_to_code', header: 'reporting_to_code', required: false },
    ],
    sample: [
      { email: 'john.doe@company.com', password: 'SecurePass123!', first_name: 'John', last_name: 'Doe', phone: '+919876543210', employee_code: 'EMP001', role_code: 'EMPLOYEE', department_code: 'ENG', designation_code: 'SR', location_code: 'HQ', date_of_joining: '2024-01-15', employment_type: 'FULL_TIME', date_of_birth: '1990-05-20', gender: 'MALE', reporting_to_code: '' },
      { email: 'jane.smith@company.com', password: 'SecurePass123!', first_name: 'Jane', last_name: 'Smith', phone: '+919876543211', employee_code: 'EMP002', role_code: 'MANAGER', department_code: 'ENG', designation_code: 'MGR', location_code: 'HQ', date_of_joining: '2023-06-01', employment_type: 'FULL_TIME', date_of_birth: '1988-03-15', gender: 'FEMALE', reporting_to_code: '' },
    ],
  },

  'employee-skills': {
    columns: [
      { key: 'employee_code', header: 'employee_code', required: true },
      { key: 'skill_name', header: 'skill_name', required: true },
      { key: 'level', header: 'level', required: true },
      { key: 'years_of_exp', header: 'years_of_exp', required: false },
      { key: 'is_certified', header: 'is_certified', required: false },
    ],
    sample: [
      { employee_code: 'EMP001', skill_name: 'JavaScript', level: '4', years_of_exp: '5', is_certified: 'false' },
      { employee_code: 'EMP001', skill_name: 'React', level: '4', years_of_exp: '3', is_certified: 'true' },
      { employee_code: 'EMP002', skill_name: 'Leadership', level: '5', years_of_exp: '8', is_certified: 'false' },
    ],
  },

  'salary-structures': {
    columns: [
      { key: 'employee_code', header: 'employee_code', required: true },
      { key: 'ctc', header: 'ctc', required: true },
      { key: 'basic_salary', header: 'basic_salary', required: true },
      { key: 'gross_salary', header: 'gross_salary', required: false },
      { key: 'net_salary', header: 'net_salary', required: false },
      { key: 'effective_from', header: 'effective_from', required: true },
      { key: 'effective_to', header: 'effective_to', required: false },
    ],
    sample: [
      { employee_code: 'EMP001', ctc: '1200000', basic_salary: '500000', gross_salary: '100000', net_salary: '85000', effective_from: '2024-01-01', effective_to: '' },
      { employee_code: 'EMP002', ctc: '1800000', basic_salary: '750000', gross_salary: '150000', net_salary: '125000', effective_from: '2023-06-01', effective_to: '' },
    ],
  },

  'leave-balances': {
    columns: [
      { key: 'employee_code', header: 'employee_code', required: true },
      { key: 'leave_type_code', header: 'leave_type_code', required: true },
      { key: 'year', header: 'year', required: true },
      { key: 'total_days', header: 'total_days', required: true },
      { key: 'used_days', header: 'used_days', required: false },
      { key: 'pending_days', header: 'pending_days', required: false },
    ],
    sample: [
      { employee_code: 'EMP001', leave_type_code: 'CL', year: '2025', total_days: '12', used_days: '3', pending_days: '1' },
      { employee_code: 'EMP001', leave_type_code: 'SL', year: '2025', total_days: '10', used_days: '2', pending_days: '0' },
      { employee_code: 'EMP002', leave_type_code: 'CL', year: '2025', total_days: '12', used_days: '1', pending_days: '0' },
    ],
  },

  attendance: {
    columns: [
      { key: 'employee_code', header: 'employee_code', required: true },
      { key: 'date', header: 'date', required: true },
      { key: 'status', header: 'status', required: true },
      { key: 'clock_in', header: 'clock_in', required: false },
      { key: 'clock_out', header: 'clock_out', required: false },
      { key: 'remarks', header: 'remarks', required: false },
    ],
    sample: [
      { employee_code: 'EMP001', date: '2025-01-02', status: 'PRESENT', clock_in: '09:00', clock_out: '18:00', remarks: '' },
      { employee_code: 'EMP001', date: '2025-01-03', status: 'PRESENT', clock_in: '09:15', clock_out: '18:30', remarks: 'Late by 15 mins' },
      { employee_code: 'EMP001', date: '2025-01-04', status: 'HALF_DAY', clock_in: '09:00', clock_out: '13:00', remarks: 'Left early' },
      { employee_code: 'EMP002', date: '2025-01-02', status: 'ON_LEAVE', clock_in: '', clock_out: '', remarks: 'Casual Leave' },
    ],
  },

  'leave-requests': {
    columns: [
      { key: 'employee_code', header: 'employee_code', required: true },
      { key: 'leave_type_code', header: 'leave_type_code', required: true },
      { key: 'from_date', header: 'from_date', required: true },
      { key: 'to_date', header: 'to_date', required: true },
      { key: 'total_days', header: 'total_days', required: true },
      { key: 'reason', header: 'reason', required: true },
      { key: 'status', header: 'status', required: false },
    ],
    sample: [
      { employee_code: 'EMP001', leave_type_code: 'CL', from_date: '2025-01-15', to_date: '2025-01-16', total_days: '2', reason: 'Personal work', status: 'APPROVED' },
      { employee_code: 'EMP002', leave_type_code: 'SL', from_date: '2025-01-20', to_date: '2025-01-20', total_days: '1', reason: 'Medical appointment', status: 'APPROVED' },
    ],
  },

  assets: {
    columns: [
      { key: 'asset_code', header: 'asset_code', required: true },
      { key: 'name', header: 'name', required: true },
      { key: 'category', header: 'category', required: true },
      { key: 'brand', header: 'brand', required: false },
      { key: 'model', header: 'model', required: false },
      { key: 'serial_number', header: 'serial_number', required: false },
      { key: 'purchase_date', header: 'purchase_date', required: false },
      { key: 'purchase_price', header: 'purchase_price', required: false },
      { key: 'warranty_end', header: 'warranty_end', required: false },
      { key: 'status', header: 'status', required: false },
      { key: 'condition', header: 'condition', required: false },
    ],
    sample: [
      { asset_code: 'LAPTOP001', name: 'MacBook Pro 14', category: 'LAPTOP', brand: 'Apple', model: 'MacBook Pro M3', serial_number: 'SN123456', purchase_date: '2024-01-15', purchase_price: '150000', warranty_end: '2027-01-15', status: 'AVAILABLE', condition: 'NEW' },
      { asset_code: 'LAPTOP002', name: 'Dell XPS 15', category: 'LAPTOP', brand: 'Dell', model: 'XPS 15 9530', serial_number: 'SN789012', purchase_date: '2024-02-20', purchase_price: '120000', warranty_end: '2027-02-20', status: 'ASSIGNED', condition: 'GOOD' },
      { asset_code: 'MON001', name: 'LG UltraWide', category: 'MONITOR', brand: 'LG', model: '34WN80C', serial_number: 'SN345678', purchase_date: '2024-03-01', purchase_price: '45000', warranty_end: '2027-03-01', status: 'AVAILABLE', condition: 'NEW' },
    ],
  },

  'asset-allocations': {
    columns: [
      { key: 'asset_code', header: 'asset_code', required: true },
      { key: 'employee_code', header: 'employee_code', required: true },
      { key: 'allocated_date', header: 'allocated_date', required: true },
      { key: 'expected_return', header: 'expected_return', required: false },
      { key: 'condition_out', header: 'condition_out', required: false },
      { key: 'notes', header: 'notes', required: false },
    ],
    sample: [
      { asset_code: 'LAPTOP002', employee_code: 'EMP001', allocated_date: '2024-02-25', expected_return: '', condition_out: 'NEW', notes: 'Issued for work from home' },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse date from multiple formats
 */
function parseDate(value) {
  if (!value) return null;
  const str = value.toString().trim();
  if (!str) return null;

  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str);
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const match = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (match) {
    return new Date(`${match[3]}-${match[2]}-${match[1]}`);
  }
  return null;
}

/**
 * Parse boolean from various formats
 */
function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const str = value.toString().toLowerCase().trim();
  return ['true', 'yes', '1', 'y'].includes(str);
}

/**
 * Parse integer with default
 */
function parseInt2(value, defaultValue = null) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Parse float with default
 */
function parseFloat2(value, defaultValue = null) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Clean string value
 */
function cleanString(value) {
  if (value === undefined || value === null) return null;
  const str = value.toString().trim();
  return str || null;
}

/**
 * Validate enum value
 */
function validateEnum(value, validValues, fieldName, rowIndex) {
  if (!value) return { valid: true, value: null };
  const upper = value.toString().toUpperCase().trim();
  if (!validValues.includes(upper)) {
    return {
      valid: false,
      error: `Row ${rowIndex}: Invalid ${fieldName} '${value}'. Valid values: ${validValues.join(', ')}`,
    };
  }
  return { valid: true, value: upper };
}

// ============================================================================
// TEMPLATE DOWNLOAD
// ============================================================================

export const downloadTemplate = async (req, res) => {
  const { module } = req.params;

  const template = TEMPLATES[module];
  if (!template) {
    return res.status(400).json({
      success: false,
      message: `Invalid module: ${module}. Valid modules: ${Object.keys(TEMPLATES).join(', ')}`,
    });
  }

  const csv = generateCSV(template.sample, template.columns);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${module}_template.csv`);
  return res.send(csv);
};

// ============================================================================
// PHASE 1: MASTER DATA IMPORTERS
// ============================================================================

/**
 * Import Departments
 */
export const importDepartments = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 records at once' });
    }

    // Load existing departments
    const existing = await prisma.department.findMany({
      where: { tenantId },
      select: { id: true, code: true },
    });
    const existingCodes = new Set(existing.map(d => d.code.toUpperCase()));
    const codeToId = new Map(existing.map(d => [d.code.toUpperCase(), d.id]));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const newCodes = new Map(); // code -> row data for parent resolution

    // First pass: validate all rows
    const validRows = [];
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const code = cleanString(row.code);
      const name = cleanString(row.name);

      if (!code) {
        results.errors.push(`Row ${rowIndex}: code is required`);
        results.failed++;
        continue;
      }
      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }

      const codeUpper = code.toUpperCase();
      if (existingCodes.has(codeUpper) || newCodes.has(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: code '${code}' already exists`);
        results.failed++;
        continue;
      }

      newCodes.set(codeUpper, {
        rowIndex,
        code,
        name,
        parentCode: cleanString(row.parent_code),
        isActive: parseBoolean(row.is_active, true),
      });
      validRows.push(codeUpper);
    }

    // Second pass: create departments (respecting parent-child order)
    const created = new Map();
    const createDept = async (codeUpper) => {
      if (created.has(codeUpper)) return created.get(codeUpper);

      const data = newCodes.get(codeUpper);
      if (!data) return null;

      let parentId = null;
      if (data.parentCode) {
        const parentUpper = data.parentCode.toUpperCase();
        // Check if parent exists in database
        if (codeToId.has(parentUpper)) {
          parentId = codeToId.get(parentUpper);
        } else if (newCodes.has(parentUpper)) {
          // Parent is also being imported, create it first
          parentId = await createDept(parentUpper);
        } else {
          results.errors.push(`Row ${data.rowIndex}: parent_code '${data.parentCode}' not found`);
          results.failed++;
          return null;
        }
      }

      try {
        const dept = await prisma.department.create({
          data: {
            tenantId,
            code: data.code,
            name: data.name,
            parentId,
            isActive: data.isActive,
          },
        });
        created.set(codeUpper, dept.id);
        codeToId.set(codeUpper, dept.id);
        results.successful++;
        results.created.push({ id: dept.id, code: dept.code, name: dept.name });
        return dept.id;
      } catch (err) {
        results.errors.push(`Row ${data.rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
        return null;
      }
    };

    for (const codeUpper of validRows) {
      if (!created.has(codeUpper)) {
        await createDept(codeUpper);
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'Department', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Designations
 */
export const importDesignations = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 records at once' });
    }

    const existing = await prisma.designation.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map(d => d.code.toUpperCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenCodes = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const code = cleanString(row.code);
      const name = cleanString(row.name);

      if (!code) {
        results.errors.push(`Row ${rowIndex}: code is required`);
        results.failed++;
        continue;
      }
      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }

      const codeUpper = code.toUpperCase();
      if (existingCodes.has(codeUpper) || seenCodes.has(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: code '${code}' already exists`);
        results.failed++;
        continue;
      }

      seenCodes.add(codeUpper);

      try {
        const desig = await prisma.designation.create({
          data: {
            tenantId,
            code,
            name,
            level: parseInt2(row.level, 50),
            isActive: parseBoolean(row.is_active, true),
          },
        });
        results.successful++;
        results.created.push({ id: desig.id, code: desig.code, name: desig.name });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'Designation', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Locations
 */
export const importLocations = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 records at once' });
    }

    const existing = await prisma.location.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map(l => l.code.toUpperCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenCodes = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const code = cleanString(row.code);
      const name = cleanString(row.name);

      if (!code) {
        results.errors.push(`Row ${rowIndex}: code is required`);
        results.failed++;
        continue;
      }
      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }

      const codeUpper = code.toUpperCase();
      if (existingCodes.has(codeUpper) || seenCodes.has(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: code '${code}' already exists`);
        results.failed++;
        continue;
      }

      seenCodes.add(codeUpper);

      try {
        const loc = await prisma.location.create({
          data: {
            tenantId,
            code,
            name,
            address: cleanString(row.address),
            city: cleanString(row.city),
            state: cleanString(row.state),
            country: cleanString(row.country) || 'India',
            pincode: cleanString(row.pincode),
            isActive: parseBoolean(row.is_active, true),
          },
        });
        results.successful++;
        results.created.push({ id: loc.id, code: loc.code, name: loc.name });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'Location', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Roles (non-system only)
 */
export const importRoles = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 100) {
      return res.status(400).json({ success: false, message: 'Maximum 100 roles at once' });
    }

    const existing = await prisma.role.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map(r => r.code.toUpperCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenCodes = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const code = cleanString(row.code);
      const name = cleanString(row.name);

      if (!code) {
        results.errors.push(`Row ${rowIndex}: code is required`);
        results.failed++;
        continue;
      }
      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }

      const codeUpper = code.toUpperCase();
      // Skip system roles
      if (['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].includes(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: Cannot import system role '${code}'`);
        results.failed++;
        continue;
      }

      if (existingCodes.has(codeUpper) || seenCodes.has(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: code '${code}' already exists`);
        results.failed++;
        continue;
      }

      seenCodes.add(codeUpper);

      try {
        const role = await prisma.role.create({
          data: {
            tenantId,
            code,
            name,
            description: cleanString(row.description),
            isSystem: false,
            isActive: true,
          },
        });
        results.successful++;
        results.created.push({ id: role.id, code: role.code, name: role.name });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'Role', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Leave Types
 */
export const importLeaveTypes = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 50) {
      return res.status(400).json({ success: false, message: 'Maximum 50 leave types at once' });
    }

    const existing = await prisma.leaveType.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map(l => l.code.toUpperCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenCodes = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const code = cleanString(row.code);
      const name = cleanString(row.name);

      if (!code) {
        results.errors.push(`Row ${rowIndex}: code is required`);
        results.failed++;
        continue;
      }
      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }

      const codeUpper = code.toUpperCase();
      if (existingCodes.has(codeUpper) || seenCodes.has(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: code '${code}' already exists`);
        results.failed++;
        continue;
      }

      seenCodes.add(codeUpper);

      try {
        const leaveType = await prisma.leaveType.create({
          data: {
            tenantId,
            code,
            name,
            maxDaysPerYear: parseInt2(row.max_days_per_year, 12),
            isPaid: parseBoolean(row.is_paid, true),
            carryForward: parseBoolean(row.carry_forward, false),
            requiresDocument: parseBoolean(row.requires_document, false),
            isActive: parseBoolean(row.is_active, true),
          },
        });
        results.successful++;
        results.created.push({ id: leaveType.id, code: leaveType.code, name: leaveType.name });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'LeaveType', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Salary Components
 */
export const importSalaryComponents = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;
  const VALID_TYPES = ['EARNING', 'DEDUCTION', 'REIMBURSEMENT'];
  const VALID_CALC_TYPES = ['FIXED', 'PERCENTAGE'];

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 100) {
      return res.status(400).json({ success: false, message: 'Maximum 100 components at once' });
    }

    const existing = await prisma.salaryComponent.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map(s => s.code.toUpperCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenCodes = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const code = cleanString(row.code);
      const name = cleanString(row.name);
      const type = cleanString(row.type);

      if (!code) {
        results.errors.push(`Row ${rowIndex}: code is required`);
        results.failed++;
        continue;
      }
      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }
      if (!type) {
        results.errors.push(`Row ${rowIndex}: type is required`);
        results.failed++;
        continue;
      }

      const typeValidation = validateEnum(type, VALID_TYPES, 'type', rowIndex);
      if (!typeValidation.valid) {
        results.errors.push(typeValidation.error);
        results.failed++;
        continue;
      }

      const calcType = cleanString(row.calculation_type);
      let calcTypeValue = 'FIXED';
      if (calcType) {
        const calcValidation = validateEnum(calcType, VALID_CALC_TYPES, 'calculation_type', rowIndex);
        if (!calcValidation.valid) {
          results.errors.push(calcValidation.error);
          results.failed++;
          continue;
        }
        calcTypeValue = calcValidation.value;
      }

      const codeUpper = code.toUpperCase();
      if (existingCodes.has(codeUpper) || seenCodes.has(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: code '${code}' already exists`);
        results.failed++;
        continue;
      }

      seenCodes.add(codeUpper);

      try {
        const comp = await prisma.salaryComponent.create({
          data: {
            tenantId,
            code,
            name,
            type: typeValidation.value,
            calculationType: calcTypeValue,
            isTaxable: parseBoolean(row.is_taxable, true),
            order: parseInt2(row.order, 0),
            isActive: parseBoolean(row.is_active, true),
          },
        });
        results.successful++;
        results.created.push({ id: comp.id, code: comp.code, name: comp.name });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'SalaryComponent', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Expense Categories
 */
export const importExpenseCategories = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 50) {
      return res.status(400).json({ success: false, message: 'Maximum 50 categories at once' });
    }

    const existing = await prisma.expenseCategory.findMany({
      where: { tenantId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map(e => e.name.toLowerCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenNames = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const name = cleanString(row.name);

      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }

      const nameLower = name.toLowerCase();
      if (existingNames.has(nameLower) || seenNames.has(nameLower)) {
        results.errors.push(`Row ${rowIndex}: name '${name}' already exists`);
        results.failed++;
        continue;
      }

      seenNames.add(nameLower);

      try {
        const cat = await prisma.expenseCategory.create({
          data: {
            tenantId,
            name,
            maxLimit: parseFloat2(row.max_limit),
            requiresReceipt: parseBoolean(row.requires_receipt, true),
            isActive: parseBoolean(row.is_active, true),
          },
        });
        results.successful++;
        results.created.push({ id: cat.id, name: cat.name });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'ExpenseCategory', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Skills
 */
export const importSkills = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;
  const VALID_CATEGORIES = ['TECHNICAL', 'SOFT', 'DOMAIN', 'LANGUAGE', 'TOOL', 'CERTIFICATION'];

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 skills at once' });
    }

    const existing = await prisma.skill.findMany({
      where: { tenantId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map(s => s.name.toLowerCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenNames = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const name = cleanString(row.name);
      const category = cleanString(row.category);

      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }
      if (!category) {
        results.errors.push(`Row ${rowIndex}: category is required`);
        results.failed++;
        continue;
      }

      const catValidation = validateEnum(category, VALID_CATEGORIES, 'category', rowIndex);
      if (!catValidation.valid) {
        results.errors.push(catValidation.error);
        results.failed++;
        continue;
      }

      const nameLower = name.toLowerCase();
      if (existingNames.has(nameLower) || seenNames.has(nameLower)) {
        results.errors.push(`Row ${rowIndex}: name '${name}' already exists`);
        results.failed++;
        continue;
      }

      seenNames.add(nameLower);

      try {
        const skill = await prisma.skill.create({
          data: {
            tenantId,
            name,
            category: catValidation.value,
            description: cleanString(row.description),
            isActive: parseBoolean(row.is_active, true),
          },
        });
        results.successful++;
        results.created.push({ id: skill.id, name: skill.name, category: skill.category });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'Skill', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Projects
 */
export const importProjects = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;
  const VALID_STATUSES = ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 200) {
      return res.status(400).json({ success: false, message: 'Maximum 200 projects at once' });
    }

    const existing = await prisma.project.findMany({
      where: { tenantId },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map(p => p.code.toUpperCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenCodes = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const code = cleanString(row.code);
      const name = cleanString(row.name);
      const startDate = parseDate(row.start_date);

      if (!code) {
        results.errors.push(`Row ${rowIndex}: code is required`);
        results.failed++;
        continue;
      }
      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }
      if (!startDate) {
        results.errors.push(`Row ${rowIndex}: start_date is required (YYYY-MM-DD)`);
        results.failed++;
        continue;
      }

      const status = cleanString(row.status);
      let statusValue = 'ACTIVE';
      if (status) {
        const statusValidation = validateEnum(status, VALID_STATUSES, 'status', rowIndex);
        if (!statusValidation.valid) {
          results.errors.push(statusValidation.error);
          results.failed++;
          continue;
        }
        statusValue = statusValidation.value;
      }

      const codeUpper = code.toUpperCase();
      if (existingCodes.has(codeUpper) || seenCodes.has(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: code '${code}' already exists`);
        results.failed++;
        continue;
      }

      seenCodes.add(codeUpper);

      try {
        const project = await prisma.project.create({
          data: {
            tenantId,
            code,
            name,
            clientName: cleanString(row.client_name),
            startDate,
            endDate: parseDate(row.end_date),
            status: statusValue,
            budgetHours: parseFloat2(row.budget_hours),
          },
        });
        results.successful++;
        results.created.push({ id: project.id, code: project.code, name: project.name });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'Project', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

// ============================================================================
// PHASE 2: EMPLOYEE DATA IMPORTERS
// ============================================================================

/**
 * Import Employees (enhanced version with reporting_to support)
 */
export const importEmployees = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;
  const VALID_EMP_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];
  const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 employees at once' });
    }

    // Load lookup data
    const [roles, departments, designations, locations, existingUsers] = await Promise.all([
      prisma.role.findMany({ where: { tenantId, isActive: true } }),
      prisma.department.findMany({ where: { tenantId, isActive: true } }),
      prisma.designation.findMany({ where: { tenantId, isActive: true } }),
      prisma.location.findMany({ where: { tenantId, isActive: true } }),
      prisma.user.findMany({
        where: { tenantId },
        select: { id: true, email: true, employeeCode: true },
      }),
    ]);

    const roleMap = new Map(roles.map(r => [r.code.toUpperCase(), r.id]));
    const deptMap = new Map(departments.map(d => [d.code.toUpperCase(), d.id]));
    const desigMap = new Map(designations.map(d => [d.code.toUpperCase(), d.id]));
    const locMap = new Map(locations.map(l => [l.code.toUpperCase(), l.id]));
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingCodes = new Set(existingUsers.filter(u => u.employeeCode).map(u => u.employeeCode.toUpperCase()));
    const codeToUserId = new Map(existingUsers.filter(u => u.employeeCode).map(u => [u.employeeCode.toUpperCase(), u.id]));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const validRows = [];
    const newCodes = new Map();

    // First pass: validate
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const email = cleanString(row.email);
      const password = cleanString(row.password);
      const firstName = cleanString(row.first_name);
      const roleCode = cleanString(row.role_code);

      if (!email) {
        results.errors.push(`Row ${rowIndex}: email is required`);
        results.failed++;
        continue;
      }
      if (!password || password.length < 8) {
        results.errors.push(`Row ${rowIndex}: password is required (min 8 chars)`);
        results.failed++;
        continue;
      }
      if (!firstName) {
        results.errors.push(`Row ${rowIndex}: first_name is required`);
        results.failed++;
        continue;
      }
      if (!roleCode) {
        results.errors.push(`Row ${rowIndex}: role_code is required`);
        results.failed++;
        continue;
      }

      const emailLower = email.toLowerCase();
      if (existingEmails.has(emailLower)) {
        results.errors.push(`Row ${rowIndex}: email '${email}' already exists`);
        results.failed++;
        continue;
      }

      const roleId = roleMap.get(roleCode.toUpperCase());
      if (!roleId) {
        results.errors.push(`Row ${rowIndex}: role_code '${roleCode}' not found`);
        results.failed++;
        continue;
      }

      const empCode = cleanString(row.employee_code);
      if (empCode) {
        const empCodeUpper = empCode.toUpperCase();
        if (existingCodes.has(empCodeUpper) || newCodes.has(empCodeUpper)) {
          results.errors.push(`Row ${rowIndex}: employee_code '${empCode}' already exists`);
          results.failed++;
          continue;
        }
        newCodes.set(empCodeUpper, rowIndex);
      }

      // Validate optional lookups
      const deptCode = cleanString(row.department_code);
      const desigCode = cleanString(row.designation_code);
      const locCode = cleanString(row.location_code);

      let deptId = null, desigId = null, locId = null;

      if (deptCode) {
        deptId = deptMap.get(deptCode.toUpperCase());
        if (!deptId) {
          results.errors.push(`Row ${rowIndex}: department_code '${deptCode}' not found`);
          results.failed++;
          continue;
        }
      }
      if (desigCode) {
        desigId = desigMap.get(desigCode.toUpperCase());
        if (!desigId) {
          results.errors.push(`Row ${rowIndex}: designation_code '${desigCode}' not found`);
          results.failed++;
          continue;
        }
      }
      if (locCode) {
        locId = locMap.get(locCode.toUpperCase());
        if (!locId) {
          results.errors.push(`Row ${rowIndex}: location_code '${locCode}' not found`);
          results.failed++;
          continue;
        }
      }

      // Validate enums
      const empType = cleanString(row.employment_type);
      let empTypeValue = null;
      if (empType) {
        const empTypeValidation = validateEnum(empType, VALID_EMP_TYPES, 'employment_type', rowIndex);
        if (!empTypeValidation.valid) {
          results.errors.push(empTypeValidation.error);
          results.failed++;
          continue;
        }
        empTypeValue = empTypeValidation.value;
      }

      const gender = cleanString(row.gender);
      let genderValue = null;
      if (gender) {
        const genderValidation = validateEnum(gender, VALID_GENDERS, 'gender', rowIndex);
        if (!genderValidation.valid) {
          results.errors.push(genderValidation.error);
          results.failed++;
          continue;
        }
        genderValue = genderValidation.value;
      }

      existingEmails.add(emailLower);
      if (empCode) existingCodes.add(empCode.toUpperCase());

      validRows.push({
        rowIndex,
        email,
        password,
        firstName,
        lastName: cleanString(row.last_name),
        phone: cleanString(row.phone),
        employeeCode: empCode,
        roleId,
        departmentId: deptId,
        designationId: desigId,
        locationId: locId,
        dateOfJoining: parseDate(row.date_of_joining),
        employmentType: empTypeValue,
        dateOfBirth: parseDate(row.date_of_birth),
        gender: genderValue,
        reportingToCode: cleanString(row.reporting_to_code),
      });
    }

    // Second pass: create employees
    for (const data of validRows) {
      try {
        // Resolve reporting_to
        let reportingTo = null;
        if (data.reportingToCode) {
          reportingTo = codeToUserId.get(data.reportingToCode.toUpperCase());
          // Could be created in this batch
          if (!reportingTo) {
            const created = results.created.find(c => c.employeeCode && c.employeeCode.toUpperCase() === data.reportingToCode.toUpperCase());
            if (created) reportingTo = created.id;
          }
        }

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
            reportingTo,
            createdBy: req.user.id,
          },
        });

        // Track for reporting_to resolution
        if (data.employeeCode) {
          codeToUserId.set(data.employeeCode.toUpperCase(), user.id);
        }

        results.successful++;
        results.created.push({
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
          employeeCode: user.employeeCode,
        });

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
        results.errors.push(`Row ${data.rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Employee Skills
 */
export const importEmployeeSkills = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ success: false, message: 'Maximum 1000 records at once' });
    }

    // Load lookup data
    const [employees, skills, existingSkills] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, employeeCode: true },
      }),
      prisma.skill.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.employeeSkill.findMany({
        where: { tenantId },
        select: { userId: true, skillId: true },
      }),
    ]);

    const empMap = new Map(employees.filter(e => e.employeeCode).map(e => [e.employeeCode.toUpperCase(), e.id]));
    const skillMap = new Map(skills.map(s => [s.name.toLowerCase(), s.id]));
    const existingPairs = new Set(existingSkills.map(es => `${es.userId}-${es.skillId}`));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const empCode = cleanString(row.employee_code);
      const skillName = cleanString(row.skill_name);
      const level = parseInt2(row.level);

      if (!empCode) {
        results.errors.push(`Row ${rowIndex}: employee_code is required`);
        results.failed++;
        continue;
      }
      if (!skillName) {
        results.errors.push(`Row ${rowIndex}: skill_name is required`);
        results.failed++;
        continue;
      }
      if (!level || level < 1 || level > 5) {
        results.errors.push(`Row ${rowIndex}: level is required (1-5)`);
        results.failed++;
        continue;
      }

      const userId = empMap.get(empCode.toUpperCase());
      if (!userId) {
        results.errors.push(`Row ${rowIndex}: employee_code '${empCode}' not found`);
        results.failed++;
        continue;
      }

      const skillId = skillMap.get(skillName.toLowerCase());
      if (!skillId) {
        results.errors.push(`Row ${rowIndex}: skill_name '${skillName}' not found`);
        results.failed++;
        continue;
      }

      const pairKey = `${userId}-${skillId}`;
      if (existingPairs.has(pairKey)) {
        results.errors.push(`Row ${rowIndex}: skill '${skillName}' already assigned to employee '${empCode}'`);
        results.failed++;
        continue;
      }

      existingPairs.add(pairKey);

      try {
        const empSkill = await prisma.employeeSkill.create({
          data: {
            tenantId,
            userId,
            skillId,
            level,
            yearsOfExp: parseFloat2(row.years_of_exp),
            isCertified: parseBoolean(row.is_certified, false),
          },
        });
        results.successful++;
        results.created.push({ id: empSkill.id, employeeCode: empCode, skillName });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'EmployeeSkill', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Salary Structures
 */
export const importSalaryStructures = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 records at once' });
    }

    const employees = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, employeeCode: true },
    });
    const empMap = new Map(employees.filter(e => e.employeeCode).map(e => [e.employeeCode.toUpperCase(), e.id]));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const empCode = cleanString(row.employee_code);
      const ctc = parseFloat2(row.ctc);
      const basicSalary = parseFloat2(row.basic_salary);
      const effectiveFrom = parseDate(row.effective_from);

      if (!empCode) {
        results.errors.push(`Row ${rowIndex}: employee_code is required`);
        results.failed++;
        continue;
      }
      if (!ctc || ctc <= 0) {
        results.errors.push(`Row ${rowIndex}: ctc is required (positive number)`);
        results.failed++;
        continue;
      }
      if (!basicSalary || basicSalary <= 0) {
        results.errors.push(`Row ${rowIndex}: basic_salary is required (positive number)`);
        results.failed++;
        continue;
      }
      if (!effectiveFrom) {
        results.errors.push(`Row ${rowIndex}: effective_from is required (YYYY-MM-DD)`);
        results.failed++;
        continue;
      }

      const userId = empMap.get(empCode.toUpperCase());
      if (!userId) {
        results.errors.push(`Row ${rowIndex}: employee_code '${empCode}' not found`);
        results.failed++;
        continue;
      }

      const grossSalary = parseFloat2(row.gross_salary) || Math.round(ctc / 12);
      const netSalary = parseFloat2(row.net_salary) || Math.round(grossSalary * 0.85);

      try {
        const structure = await prisma.salaryStructure.create({
          data: {
            tenantId,
            userId,
            ctc,
            basicSalary,
            grossSalary,
            netSalary,
            effectiveFrom,
            effectiveTo: parseDate(row.effective_to),
          },
        });
        results.successful++;
        results.created.push({ id: structure.id, employeeCode: empCode, ctc });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'SalaryStructure', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

// ============================================================================
// PHASE 3: TRANSACTIONAL DATA IMPORTERS
// ============================================================================

/**
 * Import Leave Balances
 */
export const importLeaveBalances = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 2000) {
      return res.status(400).json({ success: false, message: 'Maximum 2000 records at once' });
    }

    const [employees, leaveTypes] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, employeeCode: true },
      }),
      prisma.leaveType.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, code: true },
      }),
    ]);

    const empMap = new Map(employees.filter(e => e.employeeCode).map(e => [e.employeeCode.toUpperCase(), e.id]));
    const ltMap = new Map(leaveTypes.map(lt => [lt.code.toUpperCase(), lt.id]));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [], updated: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const empCode = cleanString(row.employee_code);
      const ltCode = cleanString(row.leave_type_code);
      const year = parseInt2(row.year);
      const totalDays = parseFloat2(row.total_days);

      if (!empCode) {
        results.errors.push(`Row ${rowIndex}: employee_code is required`);
        results.failed++;
        continue;
      }
      if (!ltCode) {
        results.errors.push(`Row ${rowIndex}: leave_type_code is required`);
        results.failed++;
        continue;
      }
      if (!year || year < 2020 || year > 2100) {
        results.errors.push(`Row ${rowIndex}: year is required (2020-2100)`);
        results.failed++;
        continue;
      }
      if (totalDays === null || totalDays < 0) {
        results.errors.push(`Row ${rowIndex}: total_days is required (>= 0)`);
        results.failed++;
        continue;
      }

      const userId = empMap.get(empCode.toUpperCase());
      if (!userId) {
        results.errors.push(`Row ${rowIndex}: employee_code '${empCode}' not found`);
        results.failed++;
        continue;
      }

      const leaveTypeId = ltMap.get(ltCode.toUpperCase());
      if (!leaveTypeId) {
        results.errors.push(`Row ${rowIndex}: leave_type_code '${ltCode}' not found`);
        results.failed++;
        continue;
      }

      const usedDays = parseFloat2(row.used_days) || 0;
      const pendingDays = parseFloat2(row.pending_days) || 0;
      const availableDays = totalDays - usedDays - pendingDays;

      try {
        const balance = await prisma.leaveBalance.upsert({
          where: {
            tenantId_userId_leaveTypeId_year: { tenantId, userId, leaveTypeId, year },
          },
          create: {
            tenantId,
            userId,
            leaveTypeId,
            year,
            totalDays,
            usedDays,
            pendingDays,
            availableDays,
          },
          update: {
            totalDays,
            usedDays,
            pendingDays,
            availableDays,
          },
        });

        results.successful++;
        if (balance.createdAt.getTime() === balance.updatedAt.getTime()) {
          results.created.push({ id: balance.id, employeeCode: empCode, leaveTypeCode: ltCode });
        } else {
          results.updated.push({ id: balance.id, employeeCode: empCode, leaveTypeCode: ltCode });
        }
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to process - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'LeaveBalance', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} processed, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Attendance (upsert)
 */
export const importAttendance = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;
  const VALID_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND'];

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 5000) {
      return res.status(400).json({ success: false, message: 'Maximum 5000 records at once' });
    }

    const employees = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, employeeCode: true },
    });
    const empMap = new Map(employees.filter(e => e.employeeCode).map(e => [e.employeeCode.toUpperCase(), e.id]));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [], updated: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const empCode = cleanString(row.employee_code);
      const date = parseDate(row.date);
      const status = cleanString(row.status);

      if (!empCode) {
        results.errors.push(`Row ${rowIndex}: employee_code is required`);
        results.failed++;
        continue;
      }
      if (!date) {
        results.errors.push(`Row ${rowIndex}: date is required (YYYY-MM-DD)`);
        results.failed++;
        continue;
      }
      if (!status) {
        results.errors.push(`Row ${rowIndex}: status is required`);
        results.failed++;
        continue;
      }

      const statusValidation = validateEnum(status, VALID_STATUSES, 'status', rowIndex);
      if (!statusValidation.valid) {
        results.errors.push(statusValidation.error);
        results.failed++;
        continue;
      }

      const userId = empMap.get(empCode.toUpperCase());
      if (!userId) {
        results.errors.push(`Row ${rowIndex}: employee_code '${empCode}' not found`);
        results.failed++;
        continue;
      }

      // Parse clock times
      let clockIn = null, clockOut = null, totalHours = null;
      const clockInStr = cleanString(row.clock_in);
      const clockOutStr = cleanString(row.clock_out);

      if (clockInStr && /^\d{2}:\d{2}$/.test(clockInStr)) {
        const [h, m] = clockInStr.split(':').map(Number);
        clockIn = new Date(date);
        clockIn.setHours(h, m, 0, 0);
      }
      if (clockOutStr && /^\d{2}:\d{2}$/.test(clockOutStr)) {
        const [h, m] = clockOutStr.split(':').map(Number);
        clockOut = new Date(date);
        clockOut.setHours(h, m, 0, 0);
      }
      if (clockIn && clockOut) {
        totalHours = (clockOut - clockIn) / (1000 * 60 * 60);
        if (totalHours < 0) totalHours = 0;
      }

      try {
        const attendance = await prisma.attendance.upsert({
          where: {
            tenantId_userId_date: { tenantId, userId, date: new Date(date.toISOString().split('T')[0]) },
          },
          create: {
            tenantId,
            userId,
            date: new Date(date.toISOString().split('T')[0]),
            status: statusValidation.value,
            clockIn,
            clockOut,
            totalHours,
            remarks: cleanString(row.remarks),
            approvedBy: req.user.id,
            approvedAt: new Date(),
          },
          update: {
            status: statusValidation.value,
            clockIn,
            clockOut,
            totalHours,
            remarks: cleanString(row.remarks),
            approvedBy: req.user.id,
            approvedAt: new Date(),
          },
        });

        results.successful++;
        if (attendance.createdAt.getTime() === attendance.updatedAt.getTime()) {
          results.created.push({ id: attendance.id, employeeCode: empCode, date: date.toISOString().split('T')[0] });
        } else {
          results.updated.push({ id: attendance.id, employeeCode: empCode, date: date.toISOString().split('T')[0] });
        }
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to process - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'Attendance', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} processed, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Leave Requests
 */
export const importLeaveRequests = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;
  const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 2000) {
      return res.status(400).json({ success: false, message: 'Maximum 2000 records at once' });
    }

    const [employees, leaveTypes] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, employeeCode: true },
      }),
      prisma.leaveType.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, code: true },
      }),
    ]);

    const empMap = new Map(employees.filter(e => e.employeeCode).map(e => [e.employeeCode.toUpperCase(), e.id]));
    const ltMap = new Map(leaveTypes.map(lt => [lt.code.toUpperCase(), lt.id]));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const empCode = cleanString(row.employee_code);
      const ltCode = cleanString(row.leave_type_code);
      const fromDate = parseDate(row.from_date);
      const toDate = parseDate(row.to_date);
      const totalDays = parseFloat2(row.total_days);
      const reason = cleanString(row.reason);

      if (!empCode) {
        results.errors.push(`Row ${rowIndex}: employee_code is required`);
        results.failed++;
        continue;
      }
      if (!ltCode) {
        results.errors.push(`Row ${rowIndex}: leave_type_code is required`);
        results.failed++;
        continue;
      }
      if (!fromDate) {
        results.errors.push(`Row ${rowIndex}: from_date is required (YYYY-MM-DD)`);
        results.failed++;
        continue;
      }
      if (!toDate) {
        results.errors.push(`Row ${rowIndex}: to_date is required (YYYY-MM-DD)`);
        results.failed++;
        continue;
      }
      if (!totalDays || totalDays <= 0) {
        results.errors.push(`Row ${rowIndex}: total_days is required (> 0)`);
        results.failed++;
        continue;
      }
      if (!reason) {
        results.errors.push(`Row ${rowIndex}: reason is required`);
        results.failed++;
        continue;
      }

      const userId = empMap.get(empCode.toUpperCase());
      if (!userId) {
        results.errors.push(`Row ${rowIndex}: employee_code '${empCode}' not found`);
        results.failed++;
        continue;
      }

      const leaveTypeId = ltMap.get(ltCode.toUpperCase());
      if (!leaveTypeId) {
        results.errors.push(`Row ${rowIndex}: leave_type_code '${ltCode}' not found`);
        results.failed++;
        continue;
      }

      const status = cleanString(row.status);
      let statusValue = 'APPROVED'; // Default for historical imports
      if (status) {
        const statusValidation = validateEnum(status, VALID_STATUSES, 'status', rowIndex);
        if (!statusValidation.valid) {
          results.errors.push(statusValidation.error);
          results.failed++;
          continue;
        }
        statusValue = statusValidation.value;
      }

      try {
        const request = await prisma.leaveRequest.create({
          data: {
            tenantId,
            userId,
            leaveTypeId,
            fromDate,
            toDate,
            totalDays,
            reason,
            status: statusValue,
            reviewedBy: statusValue !== 'PENDING' ? req.user.id : null,
            reviewedAt: statusValue !== 'PENDING' ? new Date() : null,
          },
        });
        results.successful++;
        results.created.push({ id: request.id, employeeCode: empCode, fromDate: fromDate.toISOString().split('T')[0] });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'LeaveRequest', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Assets
 */
export const importAssets = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;
  const VALID_CATEGORIES = ['LAPTOP', 'DESKTOP', 'MONITOR', 'PHONE', 'TABLET', 'KEYBOARD', 'MOUSE', 'HEADSET', 'FURNITURE', 'VEHICLE', 'SOFTWARE', 'OTHER'];
  const VALID_STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'REPAIR', 'RETIRED', 'LOST'];
  const VALID_CONDITIONS = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ success: false, message: 'Maximum 1000 assets at once' });
    }

    const existing = await prisma.asset.findMany({
      where: { tenantId },
      select: { assetCode: true },
    });
    const existingCodes = new Set(existing.map(a => a.assetCode.toUpperCase()));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };
    const seenCodes = new Set();

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const assetCode = cleanString(row.asset_code);
      const name = cleanString(row.name);
      const category = cleanString(row.category);

      if (!assetCode) {
        results.errors.push(`Row ${rowIndex}: asset_code is required`);
        results.failed++;
        continue;
      }
      if (!name) {
        results.errors.push(`Row ${rowIndex}: name is required`);
        results.failed++;
        continue;
      }
      if (!category) {
        results.errors.push(`Row ${rowIndex}: category is required`);
        results.failed++;
        continue;
      }

      const catValidation = validateEnum(category, VALID_CATEGORIES, 'category', rowIndex);
      if (!catValidation.valid) {
        results.errors.push(catValidation.error);
        results.failed++;
        continue;
      }

      const codeUpper = assetCode.toUpperCase();
      if (existingCodes.has(codeUpper) || seenCodes.has(codeUpper)) {
        results.errors.push(`Row ${rowIndex}: asset_code '${assetCode}' already exists`);
        results.failed++;
        continue;
      }

      const status = cleanString(row.status);
      let statusValue = 'AVAILABLE';
      if (status) {
        const statusValidation = validateEnum(status, VALID_STATUSES, 'status', rowIndex);
        if (!statusValidation.valid) {
          results.errors.push(statusValidation.error);
          results.failed++;
          continue;
        }
        statusValue = statusValidation.value;
      }

      const condition = cleanString(row.condition);
      let conditionValue = 'NEW';
      if (condition) {
        const condValidation = validateEnum(condition, VALID_CONDITIONS, 'condition', rowIndex);
        if (!condValidation.valid) {
          results.errors.push(condValidation.error);
          results.failed++;
          continue;
        }
        conditionValue = condValidation.value;
      }

      seenCodes.add(codeUpper);

      try {
        const asset = await prisma.asset.create({
          data: {
            tenantId,
            assetCode,
            name,
            category: catValidation.value,
            brand: cleanString(row.brand),
            model: cleanString(row.model),
            serialNumber: cleanString(row.serial_number),
            purchaseDate: parseDate(row.purchase_date),
            purchasePrice: parseFloat2(row.purchase_price),
            warrantyEnd: parseDate(row.warranty_end),
            status: statusValue,
            condition: conditionValue,
          },
        });
        results.successful++;
        results.created.push({ id: asset.id, assetCode: asset.assetCode, name: asset.name });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'Asset', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};

/**
 * Import Asset Allocations
 */
export const importAssetAllocations = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const tenantId = req.user.tenantId;
  const VALID_CONDITIONS = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

  try {
    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 allocations at once' });
    }

    const [assets, employees] = await Promise.all([
      prisma.asset.findMany({
        where: { tenantId },
        select: { id: true, assetCode: true, status: true },
      }),
      prisma.user.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, employeeCode: true },
      }),
    ]);

    const assetMap = new Map(assets.map(a => [a.assetCode.toUpperCase(), { id: a.id, status: a.status }]));
    const empMap = new Map(employees.filter(e => e.employeeCode).map(e => [e.employeeCode.toUpperCase(), e.id]));

    const results = { total: rows.length, successful: 0, failed: 0, errors: [], created: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const row = rows[i];

      const assetCode = cleanString(row.asset_code);
      const empCode = cleanString(row.employee_code);
      const allocatedDate = parseDate(row.allocated_date);

      if (!assetCode) {
        results.errors.push(`Row ${rowIndex}: asset_code is required`);
        results.failed++;
        continue;
      }
      if (!empCode) {
        results.errors.push(`Row ${rowIndex}: employee_code is required`);
        results.failed++;
        continue;
      }
      if (!allocatedDate) {
        results.errors.push(`Row ${rowIndex}: allocated_date is required (YYYY-MM-DD)`);
        results.failed++;
        continue;
      }

      const asset = assetMap.get(assetCode.toUpperCase());
      if (!asset) {
        results.errors.push(`Row ${rowIndex}: asset_code '${assetCode}' not found`);
        results.failed++;
        continue;
      }

      const userId = empMap.get(empCode.toUpperCase());
      if (!userId) {
        results.errors.push(`Row ${rowIndex}: employee_code '${empCode}' not found`);
        results.failed++;
        continue;
      }

      const conditionOut = cleanString(row.condition_out);
      let conditionValue = 'GOOD';
      if (conditionOut) {
        const condValidation = validateEnum(conditionOut, VALID_CONDITIONS, 'condition_out', rowIndex);
        if (!condValidation.valid) {
          results.errors.push(condValidation.error);
          results.failed++;
          continue;
        }
        conditionValue = condValidation.value;
      }

      try {
        const allocation = await prisma.assetAllocation.create({
          data: {
            tenantId,
            assetId: asset.id,
            userId,
            allocatedAt: allocatedDate,
            allocatedBy: req.user.id,
            expectedReturn: parseDate(row.expected_return),
            conditionOut: conditionValue,
            notes: cleanString(row.notes),
          },
        });

        // Update asset status
        await prisma.asset.update({
          where: { id: asset.id },
          data: { status: 'ASSIGNED', currentUserId: userId },
        });

        results.successful++;
        results.created.push({ id: allocation.id, assetCode, employeeCode: empCode });
      } catch (err) {
        results.errors.push(`Row ${rowIndex}: Failed to create - ${err.message}`);
        results.failed++;
      }
    }

    await createAuditLog(tenantId, req.user.id, 'BULK_IMPORT', 'AssetAllocation', null, null, { imported: results.successful }, req);

    return res.json({
      success: true,
      message: `Import completed: ${results.successful} created, ${results.failed} failed`,
      data: results,
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process import', error: err.message });
  }
};
