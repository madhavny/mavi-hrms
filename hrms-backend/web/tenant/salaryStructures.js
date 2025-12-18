import { prisma } from "../../shared/config/database.js";
import { createAuditLog } from "../../shared/utilities/audit.js";

// List salary structures (with optional user filter)
async function listSalaryStructures(req, res) {
  const tenantId = req.user.tenantId;
  const { userId, isActive, page = 1, limit = 20 } = req.query;

  const where = { tenantId };

  if (userId) {
    where.userId = parseInt(userId);
  }
  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  const [structures, total] = await Promise.all([
    prisma.salaryStructure.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
        components: {
          include: {
            salaryComponent: true,
          },
          orderBy: [
            { salaryComponent: { type: "asc" } },
            { salaryComponent: { order: "asc" } },
          ],
        },
      },
      orderBy: [{ isActive: "desc" }, { effectiveFrom: "desc" }],
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.salaryStructure.count({ where }),
  ]);

  res.json({
    success: true,
    data: structures,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
}

// Get employee's current salary structure
async function getEmployeeSalaryStructure(req, res) {
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  const structure = await prisma.salaryStructure.findFirst({
    where: {
      tenantId,
      userId: parseInt(userId),
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          email: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
      components: {
        include: {
          salaryComponent: true,
        },
        orderBy: [
          { salaryComponent: { type: "asc" } },
          { salaryComponent: { order: "asc" } },
        ],
      },
    },
  });

  if (!structure) {
    return res.status(404).json({
      success: false,
      error: "No active salary structure found for this employee",
    });
  }

  // Group components by type
  const grouped = {
    earnings: structure.components.filter(
      (c) => c.salaryComponent.type === "EARNING"
    ),
    deductions: structure.components.filter(
      (c) => c.salaryComponent.type === "DEDUCTION"
    ),
    reimbursements: structure.components.filter(
      (c) => c.salaryComponent.type === "REIMBURSEMENT"
    ),
  };

  res.json({
    success: true,
    data: {
      ...structure,
      groupedComponents: grouped,
    },
  });
}

// Get salary structure by ID
async function getSalaryStructure(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const structure = await prisma.salaryStructure.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          email: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
      components: {
        include: {
          salaryComponent: true,
        },
        orderBy: [
          { salaryComponent: { type: "asc" } },
          { salaryComponent: { order: "asc" } },
        ],
      },
    },
  });

  if (!structure) {
    return res.status(404).json({
      success: false,
      error: "Salary structure not found",
    });
  }

  res.json({
    success: true,
    data: structure,
  });
}

// Get employee salary history
async function getEmployeeSalaryHistory(req, res) {
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  const history = await prisma.salaryStructure.findMany({
    where: {
      tenantId,
      userId: parseInt(userId),
    },
    include: {
      components: {
        include: {
          salaryComponent: true,
        },
      },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  res.json({
    success: true,
    data: history,
  });
}

// Create/Assign salary structure to employee
async function createSalaryStructure(req, res) {
  const tenantId = req.user.tenantId;
  const {
    userId,
    ctc,
    basicSalary,
    effectiveFrom,
    remarks,
    components = [],
  } = req.body;

  // Validate required fields
  if (!userId || !ctc || !basicSalary || !effectiveFrom) {
    return res.status(400).json({
      success: false,
      error: "userId, ctc, basicSalary, and effectiveFrom are required",
    });
  }

  // Check if user exists
  const user = await prisma.user.findFirst({
    where: { id: parseInt(userId), tenantId },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "Employee not found",
    });
  }

  // Deactivate existing active structure and set effectiveTo
  await prisma.salaryStructure.updateMany({
    where: {
      tenantId,
      userId: parseInt(userId),
      isActive: true,
    },
    data: {
      isActive: false,
      effectiveTo: new Date(effectiveFrom),
    },
  });

  // Calculate totals from components
  let grossSalary = 0;
  let totalDeductions = 0;

  const componentData = [];
  for (const comp of components) {
    const salaryComponent = await prisma.salaryComponent.findFirst({
      where: { id: comp.salaryComponentId, tenantId },
    });

    if (!salaryComponent) continue;

    let calculatedAmount = 0;
    if (comp.calculationType === "FIXED") {
      calculatedAmount = comp.amount || 0;
    } else if (comp.calculationType === "PERCENTAGE") {
      calculatedAmount = (parseFloat(basicSalary) * (comp.percentage || 0)) / 100;
    }

    componentData.push({
      salaryComponentId: comp.salaryComponentId,
      calculationType: comp.calculationType,
      amount: comp.amount || null,
      percentage: comp.percentage || null,
      calculatedAmount,
    });

    if (salaryComponent.type === "EARNING" || salaryComponent.type === "REIMBURSEMENT") {
      grossSalary += calculatedAmount;
    } else if (salaryComponent.type === "DEDUCTION") {
      totalDeductions += calculatedAmount;
    }
  }

  // Add basic salary to gross if not in components
  if (!componentData.some((c) => c.salaryComponentId === undefined)) {
    grossSalary += parseFloat(basicSalary);
  }

  const netSalary = grossSalary - totalDeductions;

  // Create salary structure with components
  const structure = await prisma.salaryStructure.create({
    data: {
      tenantId,
      userId: parseInt(userId),
      ctc: parseFloat(ctc),
      basicSalary: parseFloat(basicSalary),
      grossSalary,
      netSalary,
      effectiveFrom: new Date(effectiveFrom),
      isActive: true,
      remarks,
      createdBy: req.user.id,
      components: {
        create: componentData,
      },
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      },
      components: {
        include: {
          salaryComponent: true,
        },
      },
    },
  });

  // Audit log
  await createAuditLog({
    req,
    action: "CREATE",
    entity: "SalaryStructure",
    entityId: structure.id,
    entityName: `${structure.user.firstName} ${structure.user.lastName || ""}`.trim(),
    newValue: structure,
  });

  res.status(201).json({
    success: true,
    data: structure,
    message: "Salary structure created successfully",
  });
}

// Update salary structure
async function updateSalaryStructure(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { ctc, basicSalary, remarks, components = [] } = req.body;

  // Check if structure exists
  const existing = await prisma.salaryStructure.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { components: true },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Salary structure not found",
    });
  }

  // Calculate totals from components
  let grossSalary = 0;
  let totalDeductions = 0;
  const basicAmount = basicSalary ? parseFloat(basicSalary) : existing.basicSalary;

  const componentData = [];
  for (const comp of components) {
    const salaryComponent = await prisma.salaryComponent.findFirst({
      where: { id: comp.salaryComponentId, tenantId },
    });

    if (!salaryComponent) continue;

    let calculatedAmount = 0;
    if (comp.calculationType === "FIXED") {
      calculatedAmount = comp.amount || 0;
    } else if (comp.calculationType === "PERCENTAGE") {
      calculatedAmount = (basicAmount * (comp.percentage || 0)) / 100;
    }

    componentData.push({
      salaryComponentId: comp.salaryComponentId,
      calculationType: comp.calculationType,
      amount: comp.amount || null,
      percentage: comp.percentage || null,
      calculatedAmount,
    });

    if (salaryComponent.type === "EARNING" || salaryComponent.type === "REIMBURSEMENT") {
      grossSalary += calculatedAmount;
    } else if (salaryComponent.type === "DEDUCTION") {
      totalDeductions += calculatedAmount;
    }
  }

  grossSalary += basicAmount;
  const netSalary = grossSalary - totalDeductions;

  // Update structure and replace components
  const structure = await prisma.$transaction(async (tx) => {
    // Delete existing components
    await tx.salaryStructureComponent.deleteMany({
      where: { salaryStructureId: parseInt(id) },
    });

    // Update structure
    return tx.salaryStructure.update({
      where: { id: parseInt(id) },
      data: {
        ctc: ctc ? parseFloat(ctc) : undefined,
        basicSalary: basicSalary ? parseFloat(basicSalary) : undefined,
        grossSalary,
        netSalary,
        remarks,
        components: {
          create: componentData,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        components: {
          include: {
            salaryComponent: true,
          },
        },
      },
    });
  });

  // Audit log
  await createAuditLog({
    req,
    action: "UPDATE",
    entity: "SalaryStructure",
    entityId: structure.id,
    entityName: `${structure.user.firstName} ${structure.user.lastName || ""}`.trim(),
    oldValue: existing,
    newValue: structure,
  });

  res.json({
    success: true,
    data: structure,
    message: "Salary structure updated successfully",
  });
}

// Delete salary structure
async function deleteSalaryStructure(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  // Check if structure exists
  const existing = await prisma.salaryStructure.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: { select: { firstName: true, lastName: true } },
      _count: { select: { components: true } },
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Salary structure not found",
    });
  }

  // Check if there are payslips using this structure
  const payslipsCount = await prisma.payslip.count({
    where: {
      userId: existing.userId,
      tenantId,
      createdAt: {
        gte: existing.effectiveFrom,
        lte: existing.effectiveTo || new Date(),
      },
    },
  });

  if (payslipsCount > 0) {
    return res.status(400).json({
      success: false,
      error: `Cannot delete: ${payslipsCount} payslip(s) exist for this salary period`,
    });
  }

  await prisma.salaryStructure.delete({
    where: { id: parseInt(id) },
  });

  // Audit log
  await createAuditLog({
    req,
    action: "DELETE",
    entity: "SalaryStructure",
    entityId: existing.id,
    entityName: `${existing.user.firstName} ${existing.user.lastName || ""}`.trim(),
    oldValue: existing,
  });

  res.json({
    success: true,
    message: "Salary structure deleted successfully",
  });
}

// Calculate salary preview (before saving)
async function calculateSalaryPreview(req, res) {
  const tenantId = req.user.tenantId;
  const { basicSalary, components = [] } = req.body;

  if (!basicSalary) {
    return res.status(400).json({
      success: false,
      error: "Basic salary is required",
    });
  }

  const basic = parseFloat(basicSalary);
  let grossEarnings = basic;
  let totalDeductions = 0;
  let totalReimbursements = 0;

  const calculatedComponents = [];

  for (const comp of components) {
    const salaryComponent = await prisma.salaryComponent.findFirst({
      where: { id: comp.salaryComponentId, tenantId },
    });

    if (!salaryComponent) continue;

    let calculatedAmount = 0;
    if (comp.calculationType === "FIXED") {
      calculatedAmount = comp.amount || 0;
    } else if (comp.calculationType === "PERCENTAGE") {
      calculatedAmount = (basic * (comp.percentage || 0)) / 100;
    }

    calculatedComponents.push({
      ...comp,
      componentName: salaryComponent.name,
      componentCode: salaryComponent.code,
      componentType: salaryComponent.type,
      calculatedAmount: Math.round(calculatedAmount * 100) / 100,
    });

    if (salaryComponent.type === "EARNING") {
      grossEarnings += calculatedAmount;
    } else if (salaryComponent.type === "DEDUCTION") {
      totalDeductions += calculatedAmount;
    } else if (salaryComponent.type === "REIMBURSEMENT") {
      totalReimbursements += calculatedAmount;
    }
  }

  const grossSalary = grossEarnings + totalReimbursements;
  const netSalary = grossSalary - totalDeductions;

  res.json({
    success: true,
    data: {
      basicSalary: basic,
      grossEarnings: Math.round(grossEarnings * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalReimbursements: Math.round(totalReimbursements * 100) / 100,
      grossSalary: Math.round(grossSalary * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      annualCTC: Math.round(grossSalary * 12 * 100) / 100,
      components: calculatedComponents,
    },
  });
}

export {
  listSalaryStructures,
  getSalaryStructure,
  getEmployeeSalaryStructure,
  getEmployeeSalaryHistory,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  calculateSalaryPreview,
};
