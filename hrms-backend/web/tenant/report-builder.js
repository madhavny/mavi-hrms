import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== AVAILABLE FIELDS BY DATA SOURCE ====================

const AVAILABLE_FIELDS = {
  EMPLOYEES: [
    { id: 'id', name: 'Employee ID', type: 'NUMBER', category: 'Basic' },
    { id: 'employeeCode', name: 'Employee Code', type: 'TEXT', category: 'Basic' },
    { id: 'firstName', name: 'First Name', type: 'TEXT', category: 'Basic' },
    { id: 'lastName', name: 'Last Name', type: 'TEXT', category: 'Basic' },
    { id: 'email', name: 'Email', type: 'TEXT', category: 'Basic' },
    { id: 'phone', name: 'Phone', type: 'TEXT', category: 'Basic' },
    { id: 'gender', name: 'Gender', type: 'ENUM', category: 'Basic', options: ['MALE', 'FEMALE', 'OTHER'] },
    { id: 'dateOfBirth', name: 'Date of Birth', type: 'DATE', category: 'Basic' },
    { id: 'joiningDate', name: 'Joining Date', type: 'DATE', category: 'Employment' },
    { id: 'exitDate', name: 'Exit Date', type: 'DATE', category: 'Employment' },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Employment', options: ['ACTIVE', 'INACTIVE', 'ON_NOTICE', 'TERMINATED'] },
    { id: 'employmentType', name: 'Employment Type', type: 'ENUM', category: 'Employment', options: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'] },
    { id: 'department.name', name: 'Department', type: 'TEXT', category: 'Organization' },
    { id: 'designation.name', name: 'Designation', type: 'TEXT', category: 'Organization' },
    { id: 'location.name', name: 'Location', type: 'TEXT', category: 'Organization' },
    { id: 'reportingManager.firstName', name: 'Manager First Name', type: 'TEXT', category: 'Organization' },
    { id: 'reportingManager.lastName', name: 'Manager Last Name', type: 'TEXT', category: 'Organization' },
    { id: 'permanentAddress', name: 'Permanent Address', type: 'TEXT', category: 'Address' },
    { id: 'currentAddress', name: 'Current Address', type: 'TEXT', category: 'Address' },
    { id: 'bankName', name: 'Bank Name', type: 'TEXT', category: 'Bank' },
    { id: 'bankAccountNumber', name: 'Account Number', type: 'TEXT', category: 'Bank' },
    { id: 'ifscCode', name: 'IFSC Code', type: 'TEXT', category: 'Bank' },
    { id: 'panNumber', name: 'PAN Number', type: 'TEXT', category: 'Tax' },
    { id: 'aadhaarNumber', name: 'Aadhaar Number', type: 'TEXT', category: 'Tax' },
    { id: 'uanNumber', name: 'UAN Number', type: 'TEXT', category: 'Tax' },
    { id: 'pfNumber', name: 'PF Number', type: 'TEXT', category: 'Tax' },
    { id: 'esiNumber', name: 'ESI Number', type: 'TEXT', category: 'Tax' },
    { id: 'createdAt', name: 'Created At', type: 'DATE', category: 'System' },
    { id: 'updatedAt', name: 'Updated At', type: 'DATE', category: 'System' },
  ],
  ATTENDANCE: [
    { id: 'id', name: 'Record ID', type: 'NUMBER', category: 'Basic' },
    { id: 'user.firstName', name: 'First Name', type: 'TEXT', category: 'Employee' },
    { id: 'user.lastName', name: 'Last Name', type: 'TEXT', category: 'Employee' },
    { id: 'user.employeeCode', name: 'Employee Code', type: 'TEXT', category: 'Employee' },
    { id: 'user.department.name', name: 'Department', type: 'TEXT', category: 'Employee' },
    { id: 'date', name: 'Date', type: 'DATE', category: 'Attendance' },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Attendance', options: ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND', 'WORK_FROM_HOME'] },
    { id: 'checkIn', name: 'Check In Time', type: 'DATE', category: 'Timing' },
    { id: 'checkOut', name: 'Check Out Time', type: 'DATE', category: 'Timing' },
    { id: 'totalHours', name: 'Total Hours', type: 'NUMBER', category: 'Timing' },
    { id: 'overtimeHours', name: 'Overtime Hours', type: 'NUMBER', category: 'Timing' },
    { id: 'isLate', name: 'Is Late', type: 'BOOLEAN', category: 'Timing' },
    { id: 'isEarlyLeave', name: 'Early Leave', type: 'BOOLEAN', category: 'Timing' },
    { id: 'notes', name: 'Notes', type: 'TEXT', category: 'Basic' },
  ],
  LEAVE: [
    { id: 'id', name: 'Request ID', type: 'NUMBER', category: 'Basic' },
    { id: 'user.firstName', name: 'First Name', type: 'TEXT', category: 'Employee' },
    { id: 'user.lastName', name: 'Last Name', type: 'TEXT', category: 'Employee' },
    { id: 'user.employeeCode', name: 'Employee Code', type: 'TEXT', category: 'Employee' },
    { id: 'user.department.name', name: 'Department', type: 'TEXT', category: 'Employee' },
    { id: 'leaveType.name', name: 'Leave Type', type: 'TEXT', category: 'Leave' },
    { id: 'fromDate', name: 'From Date', type: 'DATE', category: 'Leave' },
    { id: 'toDate', name: 'To Date', type: 'DATE', category: 'Leave' },
    { id: 'totalDays', name: 'Total Days', type: 'NUMBER', category: 'Leave' },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Leave', options: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
    { id: 'reason', name: 'Reason', type: 'TEXT', category: 'Leave' },
    { id: 'approver.firstName', name: 'Approver First Name', type: 'TEXT', category: 'Approval' },
    { id: 'approver.lastName', name: 'Approver Last Name', type: 'TEXT', category: 'Approval' },
    { id: 'approvedAt', name: 'Approved At', type: 'DATE', category: 'Approval' },
    { id: 'rejectionReason', name: 'Rejection Reason', type: 'TEXT', category: 'Approval' },
    { id: 'createdAt', name: 'Applied At', type: 'DATE', category: 'System' },
  ],
  PAYROLL: [
    { id: 'id', name: 'Payslip ID', type: 'NUMBER', category: 'Basic' },
    { id: 'user.firstName', name: 'First Name', type: 'TEXT', category: 'Employee' },
    { id: 'user.lastName', name: 'Last Name', type: 'TEXT', category: 'Employee' },
    { id: 'user.employeeCode', name: 'Employee Code', type: 'TEXT', category: 'Employee' },
    { id: 'user.department.name', name: 'Department', type: 'TEXT', category: 'Employee' },
    { id: 'month', name: 'Month', type: 'NUMBER', category: 'Period' },
    { id: 'year', name: 'Year', type: 'NUMBER', category: 'Period' },
    { id: 'basicSalary', name: 'Basic Salary', type: 'CURRENCY', category: 'Earnings' },
    { id: 'grossSalary', name: 'Gross Salary', type: 'CURRENCY', category: 'Earnings' },
    { id: 'totalEarnings', name: 'Total Earnings', type: 'CURRENCY', category: 'Earnings' },
    { id: 'totalDeductions', name: 'Total Deductions', type: 'CURRENCY', category: 'Deductions' },
    { id: 'netSalary', name: 'Net Salary', type: 'CURRENCY', category: 'Summary' },
    { id: 'paidDays', name: 'Paid Days', type: 'NUMBER', category: 'Days' },
    { id: 'lopDays', name: 'LOP Days', type: 'NUMBER', category: 'Days' },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Basic', options: ['DRAFT', 'PROCESSING', 'GENERATED', 'FINALIZED', 'PAID'] },
    { id: 'paymentDate', name: 'Payment Date', type: 'DATE', category: 'Payment' },
    { id: 'paymentMode', name: 'Payment Mode', type: 'TEXT', category: 'Payment' },
    { id: 'transactionRef', name: 'Transaction Ref', type: 'TEXT', category: 'Payment' },
  ],
  GOALS: [
    { id: 'id', name: 'Goal ID', type: 'NUMBER', category: 'Basic' },
    { id: 'title', name: 'Title', type: 'TEXT', category: 'Basic' },
    { id: 'description', name: 'Description', type: 'TEXT', category: 'Basic' },
    { id: 'owner.firstName', name: 'Owner First Name', type: 'TEXT', category: 'Owner' },
    { id: 'owner.lastName', name: 'Owner Last Name', type: 'TEXT', category: 'Owner' },
    { id: 'owner.department.name', name: 'Department', type: 'TEXT', category: 'Owner' },
    { id: 'type', name: 'Type', type: 'ENUM', category: 'Basic', options: ['COMPANY', 'TEAM', 'INDIVIDUAL'] },
    { id: 'category', name: 'Category', type: 'ENUM', category: 'Basic', options: ['BUSINESS', 'PERSONAL', 'DEVELOPMENT', 'PROJECT'] },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Progress', options: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] },
    { id: 'priority', name: 'Priority', type: 'ENUM', category: 'Basic', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    { id: 'progress', name: 'Progress %', type: 'PERCENTAGE', category: 'Progress' },
    { id: 'startDate', name: 'Start Date', type: 'DATE', category: 'Timeline' },
    { id: 'endDate', name: 'End Date', type: 'DATE', category: 'Timeline' },
    { id: 'targetValue', name: 'Target Value', type: 'NUMBER', category: 'Metrics' },
    { id: 'currentValue', name: 'Current Value', type: 'NUMBER', category: 'Metrics' },
    { id: 'unit', name: 'Unit', type: 'TEXT', category: 'Metrics' },
  ],
  REVIEWS: [
    { id: 'id', name: 'Review ID', type: 'NUMBER', category: 'Basic' },
    { id: 'employee.firstName', name: 'Employee First Name', type: 'TEXT', category: 'Employee' },
    { id: 'employee.lastName', name: 'Employee Last Name', type: 'TEXT', category: 'Employee' },
    { id: 'employee.employeeCode', name: 'Employee Code', type: 'TEXT', category: 'Employee' },
    { id: 'employee.department.name', name: 'Department', type: 'TEXT', category: 'Employee' },
    { id: 'reviewCycle.name', name: 'Review Cycle', type: 'TEXT', category: 'Cycle' },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Review', options: ['PENDING', 'SELF_REVIEW', 'MANAGER_REVIEW', 'CALIBRATION', 'COMPLETED', 'CANCELLED'] },
    { id: 'selfRating', name: 'Self Rating', type: 'NUMBER', category: 'Rating' },
    { id: 'managerRating', name: 'Manager Rating', type: 'NUMBER', category: 'Rating' },
    { id: 'finalRating', name: 'Final Rating', type: 'NUMBER', category: 'Rating' },
    { id: 'selfSubmittedAt', name: 'Self Submitted At', type: 'DATE', category: 'Timeline' },
    { id: 'managerSubmittedAt', name: 'Manager Submitted At', type: 'DATE', category: 'Timeline' },
    { id: 'completedAt', name: 'Completed At', type: 'DATE', category: 'Timeline' },
  ],
  TRAINING: [
    { id: 'id', name: 'Program ID', type: 'NUMBER', category: 'Basic' },
    { id: 'name', name: 'Program Name', type: 'TEXT', category: 'Basic' },
    { id: 'description', name: 'Description', type: 'TEXT', category: 'Basic' },
    { id: 'type', name: 'Type', type: 'ENUM', category: 'Basic', options: ['ONLINE', 'CLASSROOM', 'WORKSHOP', 'CONFERENCE', 'CERTIFICATION'] },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Basic', options: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
    { id: 'startDate', name: 'Start Date', type: 'DATE', category: 'Schedule' },
    { id: 'endDate', name: 'End Date', type: 'DATE', category: 'Schedule' },
    { id: 'trainer', name: 'Trainer', type: 'TEXT', category: 'Details' },
    { id: 'venue', name: 'Venue', type: 'TEXT', category: 'Details' },
    { id: 'capacity', name: 'Capacity', type: 'NUMBER', category: 'Details' },
    { id: 'cost', name: 'Cost', type: 'CURRENCY', category: 'Details' },
    { id: 'enrollmentCount', name: 'Enrollment Count', type: 'NUMBER', category: 'Stats' },
  ],
  EXPENSES: [
    { id: 'id', name: 'Expense ID', type: 'NUMBER', category: 'Basic' },
    { id: 'user.firstName', name: 'First Name', type: 'TEXT', category: 'Employee' },
    { id: 'user.lastName', name: 'Last Name', type: 'TEXT', category: 'Employee' },
    { id: 'user.employeeCode', name: 'Employee Code', type: 'TEXT', category: 'Employee' },
    { id: 'user.department.name', name: 'Department', type: 'TEXT', category: 'Employee' },
    { id: 'category.name', name: 'Category', type: 'TEXT', category: 'Expense' },
    { id: 'title', name: 'Title', type: 'TEXT', category: 'Expense' },
    { id: 'description', name: 'Description', type: 'TEXT', category: 'Expense' },
    { id: 'amount', name: 'Amount', type: 'CURRENCY', category: 'Expense' },
    { id: 'expenseDate', name: 'Expense Date', type: 'DATE', category: 'Expense' },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Workflow', options: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'] },
    { id: 'approvedAmount', name: 'Approved Amount', type: 'CURRENCY', category: 'Workflow' },
    { id: 'reimbursedAt', name: 'Reimbursed At', type: 'DATE', category: 'Workflow' },
  ],
  ASSETS: [
    { id: 'id', name: 'Asset ID', type: 'NUMBER', category: 'Basic' },
    { id: 'name', name: 'Asset Name', type: 'TEXT', category: 'Basic' },
    { id: 'category.name', name: 'Category', type: 'TEXT', category: 'Basic' },
    { id: 'serialNumber', name: 'Serial Number', type: 'TEXT', category: 'Details' },
    { id: 'assetTag', name: 'Asset Tag', type: 'TEXT', category: 'Details' },
    { id: 'status', name: 'Status', type: 'ENUM', category: 'Status', options: ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST'] },
    { id: 'condition', name: 'Condition', type: 'ENUM', category: 'Status', options: ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] },
    { id: 'purchaseDate', name: 'Purchase Date', type: 'DATE', category: 'Purchase' },
    { id: 'purchaseCost', name: 'Purchase Cost', type: 'CURRENCY', category: 'Purchase' },
    { id: 'currentValue', name: 'Current Value', type: 'CURRENCY', category: 'Value' },
    { id: 'warrantyExpiry', name: 'Warranty Expiry', type: 'DATE', category: 'Details' },
    { id: 'assignee.firstName', name: 'Assigned To First Name', type: 'TEXT', category: 'Assignment' },
    { id: 'assignee.lastName', name: 'Assigned To Last Name', type: 'TEXT', category: 'Assignment' },
  ],
  RECRUITMENT: [
    { id: 'id', name: 'Application ID', type: 'NUMBER', category: 'Basic' },
    { id: 'job.title', name: 'Job Title', type: 'TEXT', category: 'Job' },
    { id: 'job.department.name', name: 'Department', type: 'TEXT', category: 'Job' },
    { id: 'job.status', name: 'Job Status', type: 'ENUM', category: 'Job', options: ['DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED', 'CANCELLED'] },
    { id: 'candidateName', name: 'Candidate Name', type: 'TEXT', category: 'Candidate' },
    { id: 'candidateEmail', name: 'Candidate Email', type: 'TEXT', category: 'Candidate' },
    { id: 'candidatePhone', name: 'Candidate Phone', type: 'TEXT', category: 'Candidate' },
    { id: 'source', name: 'Source', type: 'TEXT', category: 'Candidate' },
    { id: 'stage', name: 'Stage', type: 'ENUM', category: 'Pipeline', options: ['NEW', 'SCREENING', 'INTERVIEW', 'EVALUATION', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'] },
    { id: 'rating', name: 'Rating', type: 'NUMBER', category: 'Evaluation' },
    { id: 'currentSalary', name: 'Current Salary', type: 'CURRENCY', category: 'Salary' },
    { id: 'expectedSalary', name: 'Expected Salary', type: 'CURRENCY', category: 'Salary' },
    { id: 'appliedAt', name: 'Applied At', type: 'DATE', category: 'Timeline' },
  ],
};

// Filter operators based on field type
const FILTER_OPERATORS = {
  TEXT: ['equals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  NUMBER: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'],
  DATE: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'],
  BOOLEAN: ['equals'],
  CURRENCY: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'],
  PERCENTAGE: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'],
  ENUM: ['equals', 'in', 'notIn'],
};

// ==================== REPORT TEMPLATES ====================

export const getAvailableFields = async (req, res) => {
  const { dataSource } = req.query;

  if (dataSource && !AVAILABLE_FIELDS[dataSource]) {
    return res.status(400).json({ error: 'Invalid data source' });
  }

  if (dataSource) {
    return res.json({
      success: true,
      data: {
        fields: AVAILABLE_FIELDS[dataSource],
        operators: FILTER_OPERATORS,
      },
    });
  }

  // Return all data sources with their fields
  return res.json({
    success: true,
    data: {
      dataSources: Object.keys(AVAILABLE_FIELDS).map(ds => ({
        id: ds,
        name: ds.charAt(0) + ds.slice(1).toLowerCase(),
        fieldCount: AVAILABLE_FIELDS[ds].length,
      })),
      operators: FILTER_OPERATORS,
    },
  });
};

export const listReportTemplates = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { dataSource, isPublic, page = 1, limit = 20 } = req.query;

  const where = {
    tenantId,
    OR: [
      { isPublic: true },
      { createdBy: userId },
    ],
  };

  if (dataSource) where.dataSource = dataSource;
  if (isPublic !== undefined) where.isPublic = isPublic === 'true';

  const [templates, total] = await Promise.all([
    prisma.reportTemplate.findMany({
      where,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { generatedReports: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.reportTemplate.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      templates,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
};

export const getReportTemplate = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const template = await prisma.reportTemplate.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      OR: [
        { isPublic: true },
        { createdBy: userId },
      ],
    },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
      generatedReports: {
        orderBy: { generatedAt: 'desc' },
        take: 5,
        include: {
          generator: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!template) {
    return res.status(404).json({ error: 'Report template not found' });
  }

  res.json({ success: true, data: template });
};

export const createReportTemplate = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const {
    name,
    description,
    dataSource,
    selectedFields,
    filters,
    groupBy,
    sortBy,
    aggregations,
    chartType,
    chartConfig,
    isPublic,
    schedule,
  } = req.body;

  // Validate required fields
  if (!name || !dataSource || !selectedFields || selectedFields.length === 0) {
    return res.status(400).json({
      error: 'Name, data source, and at least one field are required',
    });
  }

  // Validate data source
  if (!AVAILABLE_FIELDS[dataSource]) {
    return res.status(400).json({ error: 'Invalid data source' });
  }

  // Check for duplicate name
  const existing = await prisma.reportTemplate.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });
  if (existing) {
    return res.status(400).json({ error: 'A report with this name already exists' });
  }

  const template = await prisma.reportTemplate.create({
    data: {
      tenantId,
      name,
      description,
      dataSource,
      selectedFields,
      filters: filters || [],
      groupBy: groupBy || [],
      sortBy: sortBy || [],
      aggregations: aggregations || [],
      chartType: chartType || 'TABLE',
      chartConfig: chartConfig || {},
      isPublic: isPublic || false,
      schedule,
      createdBy: userId,
    },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entity: 'REPORT_TEMPLATE',
    entityId: template.id,
    newData: template,
  });

  res.status(201).json({ success: true, data: template });
};

export const updateReportTemplate = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const {
    name,
    description,
    selectedFields,
    filters,
    groupBy,
    sortBy,
    aggregations,
    chartType,
    chartConfig,
    isPublic,
    schedule,
  } = req.body;

  const existing = await prisma.reportTemplate.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      createdBy: userId, // Only creator can update
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Report template not found or access denied' });
  }

  if (existing.isSystem) {
    return res.status(400).json({ error: 'Cannot modify system reports' });
  }

  // Check name uniqueness if changed
  if (name && name !== existing.name) {
    const duplicate = await prisma.reportTemplate.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });
    if (duplicate) {
      return res.status(400).json({ error: 'A report with this name already exists' });
    }
  }

  const template = await prisma.reportTemplate.update({
    where: { id: parseInt(id) },
    data: {
      name,
      description,
      selectedFields,
      filters,
      groupBy,
      sortBy,
      aggregations,
      chartType,
      chartConfig,
      isPublic,
      schedule,
    },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'REPORT_TEMPLATE',
    entityId: template.id,
    oldData: existing,
    newData: template,
  });

  res.json({ success: true, data: template });
};

export const deleteReportTemplate = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const existing = await prisma.reportTemplate.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      createdBy: userId,
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Report template not found or access denied' });
  }

  if (existing.isSystem) {
    return res.status(400).json({ error: 'Cannot delete system reports' });
  }

  await prisma.reportTemplate.delete({
    where: { id: parseInt(id) },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entity: 'REPORT_TEMPLATE',
    entityId: parseInt(id),
    oldData: existing,
  });

  res.json({ success: true, message: 'Report template deleted successfully' });
};

// ==================== REPORT EXECUTION ====================

const buildPrismaQuery = (dataSource, selectedFields, filters, tenantId) => {
  const include = {};
  const where = { tenantId };

  // Build includes based on selected fields with nested relations
  selectedFields.forEach(fieldId => {
    const parts = fieldId.split('.');
    if (parts.length > 1) {
      const relation = parts[0];
      if (!include[relation]) {
        include[relation] = { select: {} };
      }
      if (parts.length === 2) {
        include[relation].select[parts[1]] = true;
      } else if (parts.length === 3) {
        // Nested relation like user.department.name
        if (!include[relation].select[parts[1]]) {
          include[relation].select[parts[1]] = { select: {} };
        }
        include[relation].select[parts[1]].select[parts[2]] = true;
      }
    }
  });

  // Apply filters
  if (filters && filters.length > 0) {
    filters.forEach(filter => {
      const { field, operator, value } = filter;
      const parts = field.split('.');

      let filterObj = where;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!filterObj[parts[i]]) filterObj[parts[i]] = {};
        filterObj = filterObj[parts[i]];
      }

      const fieldName = parts[parts.length - 1];

      switch (operator) {
        case 'equals':
          filterObj[fieldName] = value;
          break;
        case 'contains':
          filterObj[fieldName] = { contains: value, mode: 'insensitive' };
          break;
        case 'startsWith':
          filterObj[fieldName] = { startsWith: value, mode: 'insensitive' };
          break;
        case 'endsWith':
          filterObj[fieldName] = { endsWith: value, mode: 'insensitive' };
          break;
        case 'gt':
          filterObj[fieldName] = { gt: value };
          break;
        case 'gte':
          filterObj[fieldName] = { gte: value };
          break;
        case 'lt':
          filterObj[fieldName] = { lt: value };
          break;
        case 'lte':
          filterObj[fieldName] = { lte: value };
          break;
        case 'between':
          filterObj[fieldName] = { gte: value[0], lte: value[1] };
          break;
        case 'in':
          filterObj[fieldName] = { in: value };
          break;
        case 'notIn':
          filterObj[fieldName] = { notIn: value };
          break;
        case 'isEmpty':
          filterObj[fieldName] = { equals: null };
          break;
        case 'isNotEmpty':
          filterObj[fieldName] = { not: null };
          break;
      }
    });
  }

  return { where, include };
};

const getModelName = (dataSource) => {
  const modelMap = {
    EMPLOYEES: 'user',
    ATTENDANCE: 'attendance',
    LEAVE: 'leaveRequest',
    PAYROLL: 'payslip',
    GOALS: 'goal',
    REVIEWS: 'performanceReview',
    TRAINING: 'trainingProgram',
    EXPENSES: 'expenseClaim',
    ASSETS: 'asset',
    RECRUITMENT: 'jobApplication',
  };
  return modelMap[dataSource];
};

const extractFieldValue = (record, fieldId) => {
  const parts = fieldId.split('.');
  let value = record;
  for (const part of parts) {
    if (value === null || value === undefined) return null;
    value = value[part];
  }
  return value;
};

const calculateAggregation = (data, field, type) => {
  const values = data.map(row => extractFieldValue(row, field)).filter(v => v !== null && v !== undefined);

  switch (type) {
    case 'COUNT':
      return values.length;
    case 'SUM':
      return values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    case 'AVG':
      if (values.length === 0) return 0;
      return values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0) / values.length;
    case 'MIN':
      return Math.min(...values.map(v => parseFloat(v) || 0));
    case 'MAX':
      return Math.max(...values.map(v => parseFloat(v) || 0));
    default:
      return null;
  }
};

export const runReport = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { parameters = {} } = req.body;

  const template = await prisma.reportTemplate.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      OR: [
        { isPublic: true },
        { createdBy: userId },
      ],
    },
  });

  if (!template) {
    return res.status(404).json({ error: 'Report template not found' });
  }

  const modelName = getModelName(template.dataSource);
  const { where, include } = buildPrismaQuery(
    template.dataSource,
    template.selectedFields,
    template.filters,
    tenantId
  );

  // Apply runtime parameters (date ranges, etc.)
  if (parameters.startDate) {
    where.createdAt = { ...where.createdAt, gte: new Date(parameters.startDate) };
  }
  if (parameters.endDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(parameters.endDate) };
  }

  // For employees, add isActive filter by default
  if (template.dataSource === 'EMPLOYEES') {
    where.isActive = where.isActive ?? true;
  }

  // Get raw data
  const rawData = await prisma[modelName].findMany({
    where,
    include: Object.keys(include).length > 0 ? include : undefined,
    orderBy: template.sortBy && template.sortBy.length > 0
      ? template.sortBy.map(s => ({ [s.field]: s.direction || 'asc' }))
      : { id: 'desc' },
    take: 1000, // Limit for performance
  });

  // Transform data to include only selected fields
  const transformedData = rawData.map(record => {
    const row = {};
    template.selectedFields.forEach(fieldId => {
      row[fieldId] = extractFieldValue(record, fieldId);
    });
    return row;
  });

  // Calculate summary/aggregations
  const summary = {};
  if (template.aggregations && template.aggregations.length > 0) {
    template.aggregations.forEach(agg => {
      summary[`${agg.field}_${agg.type}`] = calculateAggregation(rawData, agg.field, agg.type);
    });
  }

  // Save generated report
  const generatedReport = await prisma.generatedReport.create({
    data: {
      tenantId,
      templateId: template.id,
      parameters,
      data: transformedData,
      summary,
      rowCount: transformedData.length,
      generatedBy: userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Update last run time
  await prisma.reportTemplate.update({
    where: { id: template.id },
    data: { lastRunAt: new Date() },
  });

  res.json({
    success: true,
    data: {
      id: generatedReport.id,
      templateId: template.id,
      templateName: template.name,
      dataSource: template.dataSource,
      chartType: template.chartType,
      chartConfig: template.chartConfig,
      selectedFields: template.selectedFields,
      data: transformedData,
      summary,
      rowCount: transformedData.length,
      generatedAt: generatedReport.generatedAt,
      fieldMeta: AVAILABLE_FIELDS[template.dataSource].filter(f =>
        template.selectedFields.includes(f.id)
      ),
    },
  });
};

export const previewReport = async (req, res) => {
  const { tenantId } = req.user;
  const {
    dataSource,
    selectedFields = [],
    filters = [],
    sortBy = [],
    limit = 10,
  } = req.body;

  if (!dataSource || !AVAILABLE_FIELDS[dataSource]) {
    return res.status(400).json({ error: 'Invalid data source' });
  }

  if (selectedFields.length === 0) {
    return res.status(400).json({ error: 'At least one field is required' });
  }

  const modelName = getModelName(dataSource);
  const { where, include } = buildPrismaQuery(dataSource, selectedFields, filters, tenantId);

  // For employees, add isActive filter
  if (dataSource === 'EMPLOYEES') {
    where.isActive = true;
  }

  const rawData = await prisma[modelName].findMany({
    where,
    include: Object.keys(include).length > 0 ? include : undefined,
    orderBy: sortBy.length > 0
      ? sortBy.map(s => ({ [s.field]: s.direction || 'asc' }))
      : { id: 'desc' },
    take: parseInt(limit),
  });

  const transformedData = rawData.map(record => {
    const row = {};
    selectedFields.forEach(fieldId => {
      row[fieldId] = extractFieldValue(record, fieldId);
    });
    return row;
  });

  res.json({
    success: true,
    data: {
      preview: true,
      data: transformedData,
      rowCount: transformedData.length,
      fieldMeta: AVAILABLE_FIELDS[dataSource].filter(f => selectedFields.includes(f.id)),
    },
  });
};

// ==================== GENERATED REPORTS ====================

export const listGeneratedReports = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { templateId, page = 1, limit = 20 } = req.query;

  const where = {
    tenantId,
    generatedBy: userId,
  };

  if (templateId) where.templateId = parseInt(templateId);

  const [reports, total] = await Promise.all([
    prisma.generatedReport.findMany({
      where,
      include: {
        template: {
          select: { id: true, name: true, dataSource: true, chartType: true },
        },
        generator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { generatedAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.generatedReport.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      reports,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
};

export const getGeneratedReport = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const report = await prisma.generatedReport.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      generatedBy: userId,
    },
    include: {
      template: true,
      generator: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!report) {
    return res.status(404).json({ error: 'Generated report not found' });
  }

  // Add field meta for UI
  const fieldMeta = AVAILABLE_FIELDS[report.template.dataSource].filter(f =>
    report.template.selectedFields.includes(f.id)
  );

  res.json({
    success: true,
    data: {
      ...report,
      fieldMeta,
    },
  });
};

export const deleteGeneratedReport = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const existing = await prisma.generatedReport.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      generatedBy: userId,
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Generated report not found' });
  }

  await prisma.generatedReport.delete({
    where: { id: parseInt(id) },
  });

  res.json({ success: true, message: 'Generated report deleted successfully' });
};

// ==================== STATS ====================

export const getReportBuilderStats = async (req, res) => {
  const { tenantId, id: userId } = req.user;

  const [
    totalTemplates,
    myTemplates,
    publicTemplates,
    totalGenerated,
    recentReports,
    templatesBySource,
  ] = await Promise.all([
    prisma.reportTemplate.count({
      where: {
        tenantId,
        OR: [{ isPublic: true }, { createdBy: userId }],
      },
    }),
    prisma.reportTemplate.count({
      where: { tenantId, createdBy: userId },
    }),
    prisma.reportTemplate.count({
      where: { tenantId, isPublic: true },
    }),
    prisma.generatedReport.count({
      where: { tenantId, generatedBy: userId },
    }),
    prisma.generatedReport.findMany({
      where: { tenantId, generatedBy: userId },
      include: {
        template: { select: { name: true, dataSource: true } },
      },
      orderBy: { generatedAt: 'desc' },
      take: 5,
    }),
    prisma.reportTemplate.groupBy({
      by: ['dataSource'],
      where: {
        tenantId,
        OR: [{ isPublic: true }, { createdBy: userId }],
      },
      _count: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalTemplates,
      myTemplates,
      publicTemplates,
      totalGenerated,
      recentReports,
      templatesBySource: templatesBySource.map(t => ({
        dataSource: t.dataSource,
        count: t._count,
      })),
      dataSources: Object.keys(AVAILABLE_FIELDS).map(ds => ({
        id: ds,
        name: ds.charAt(0) + ds.slice(1).toLowerCase(),
        fieldCount: AVAILABLE_FIELDS[ds].length,
      })),
    },
  });
};

// ==================== DUPLICATE TEMPLATE ====================

export const duplicateReportTemplate = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { name } = req.body;

  const existing = await prisma.reportTemplate.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      OR: [{ isPublic: true }, { createdBy: userId }],
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Report template not found' });
  }

  const newName = name || `${existing.name} (Copy)`;

  // Check for duplicate name
  const duplicate = await prisma.reportTemplate.findUnique({
    where: { tenantId_name: { tenantId, name: newName } },
  });
  if (duplicate) {
    return res.status(400).json({ error: 'A report with this name already exists' });
  }

  const template = await prisma.reportTemplate.create({
    data: {
      tenantId,
      name: newName,
      description: existing.description,
      dataSource: existing.dataSource,
      selectedFields: existing.selectedFields,
      filters: existing.filters,
      groupBy: existing.groupBy,
      sortBy: existing.sortBy,
      aggregations: existing.aggregations,
      chartType: existing.chartType,
      chartConfig: existing.chartConfig,
      isPublic: false,
      isSystem: false,
      createdBy: userId,
    },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entity: 'REPORT_TEMPLATE',
    entityId: template.id,
    newData: template,
    details: { duplicatedFrom: existing.id },
  });

  res.status(201).json({ success: true, data: template });
};
