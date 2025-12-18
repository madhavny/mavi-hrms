import { prisma } from "../../shared/config/database.js";
import { createAuditLog } from "../../shared/utilities/audit.js";

// List all salary components
async function listSalaryComponents(req, res) {
  const tenantId = req.user.tenantId;
  const { type, isActive, isTaxable, isStatutory } = req.query;

  const where = { tenantId };

  if (type) {
    where.type = type;
  }
  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }
  if (isTaxable !== undefined) {
    where.isTaxable = isTaxable === "true";
  }
  if (isStatutory !== undefined) {
    where.isStatutory = isStatutory === "true";
  }

  const components = await prisma.salaryComponent.findMany({
    where,
    orderBy: [{ type: "asc" }, { order: "asc" }, { name: "asc" }],
  });

  // Group by type for better organization
  const grouped = {
    earnings: components.filter((c) => c.type === "EARNING"),
    deductions: components.filter((c) => c.type === "DEDUCTION"),
    reimbursements: components.filter((c) => c.type === "REIMBURSEMENT"),
  };

  res.json({
    success: true,
    data: {
      components,
      grouped,
      total: components.length,
    },
  });
}

// Get single salary component
async function getSalaryComponent(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const component = await prisma.salaryComponent.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
    },
    include: {
      _count: {
        select: {
          structureComponents: true,
          payslipComponents: true,
        },
      },
    },
  });

  if (!component) {
    return res.status(404).json({
      success: false,
      error: "Salary component not found",
    });
  }

  res.json({
    success: true,
    data: component,
  });
}

// Create salary component
async function createSalaryComponent(req, res) {
  const tenantId = req.user.tenantId;
  const {
    name,
    code,
    type,
    calculationType = "FIXED",
    defaultValue,
    isTaxable = true,
    isStatutory = false,
    isActive = true,
    order = 0,
  } = req.body;

  // Validate required fields
  if (!name || !code || !type) {
    return res.status(400).json({
      success: false,
      error: "Name, code, and type are required",
    });
  }

  // Validate type
  if (!["EARNING", "DEDUCTION", "REIMBURSEMENT"].includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Type must be EARNING, DEDUCTION, or REIMBURSEMENT",
    });
  }

  // Validate calculationType
  if (!["FIXED", "PERCENTAGE"].includes(calculationType)) {
    return res.status(400).json({
      success: false,
      error: "Calculation type must be FIXED or PERCENTAGE",
    });
  }

  // Check for duplicate code
  const existing = await prisma.salaryComponent.findFirst({
    where: {
      tenantId,
      code: code.toUpperCase(),
    },
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      error: "A salary component with this code already exists",
    });
  }

  const component = await prisma.salaryComponent.create({
    data: {
      tenantId,
      name,
      code: code.toUpperCase(),
      type,
      calculationType,
      defaultValue: defaultValue ? parseFloat(defaultValue) : null,
      isTaxable,
      isStatutory,
      isActive,
      order: parseInt(order),
    },
  });

  // Audit log
  await createAuditLog({
    req,
    action: "CREATE",
    entity: "SalaryComponent",
    entityId: component.id,
    entityName: component.name,
    newValue: component,
  });

  res.status(201).json({
    success: true,
    data: component,
    message: "Salary component created successfully",
  });
}

// Update salary component
async function updateSalaryComponent(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const {
    name,
    code,
    type,
    calculationType,
    defaultValue,
    isTaxable,
    isStatutory,
    isActive,
    order,
  } = req.body;

  // Check if component exists
  const existing = await prisma.salaryComponent.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Salary component not found",
    });
  }

  // Check for duplicate code if code is being changed
  if (code && code.toUpperCase() !== existing.code) {
    const duplicate = await prisma.salaryComponent.findFirst({
      where: {
        tenantId,
        code: code.toUpperCase(),
        NOT: { id: parseInt(id) },
      },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: "A salary component with this code already exists",
      });
    }
  }

  // Build update data
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (code !== undefined) updateData.code = code.toUpperCase();
  if (type !== undefined) {
    if (!["EARNING", "DEDUCTION", "REIMBURSEMENT"].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Type must be EARNING, DEDUCTION, or REIMBURSEMENT",
      });
    }
    updateData.type = type;
  }
  if (calculationType !== undefined) {
    if (!["FIXED", "PERCENTAGE"].includes(calculationType)) {
      return res.status(400).json({
        success: false,
        error: "Calculation type must be FIXED or PERCENTAGE",
      });
    }
    updateData.calculationType = calculationType;
  }
  if (defaultValue !== undefined)
    updateData.defaultValue = defaultValue ? parseFloat(defaultValue) : null;
  if (isTaxable !== undefined) updateData.isTaxable = isTaxable;
  if (isStatutory !== undefined) updateData.isStatutory = isStatutory;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (order !== undefined) updateData.order = parseInt(order);

  const component = await prisma.salaryComponent.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  // Audit log
  await createAuditLog({
    req,
    action: "UPDATE",
    entity: "SalaryComponent",
    entityId: component.id,
    entityName: component.name,
    oldValue: existing,
    newValue: component,
  });

  res.json({
    success: true,
    data: component,
    message: "Salary component updated successfully",
  });
}

// Delete salary component
async function deleteSalaryComponent(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  // Check if component exists
  const existing = await prisma.salaryComponent.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
    },
    include: {
      _count: {
        select: {
          structureComponents: true,
          payslipComponents: true,
        },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Salary component not found",
    });
  }

  // Check if component is used in salary structures
  if (existing._count.structureComponents > 0) {
    return res.status(400).json({
      success: false,
      error: `Cannot delete: Component is used in ${existing._count.structureComponents} salary structure(s)`,
    });
  }

  // Check if component is used in payslips
  if (existing._count.payslipComponents > 0) {
    return res.status(400).json({
      success: false,
      error: `Cannot delete: Component is used in ${existing._count.payslipComponents} payslip(s)`,
    });
  }

  // Check if it's a statutory component
  if (existing.isStatutory) {
    return res.status(400).json({
      success: false,
      error: "Cannot delete statutory components. Consider deactivating instead.",
    });
  }

  await prisma.salaryComponent.delete({
    where: { id: parseInt(id) },
  });

  // Audit log
  await createAuditLog({
    req,
    action: "DELETE",
    entity: "SalaryComponent",
    entityId: existing.id,
    entityName: existing.name,
    oldValue: existing,
  });

  res.json({
    success: true,
    message: "Salary component deleted successfully",
  });
}

// Bulk update order
async function updateComponentOrder(req, res) {
  const tenantId = req.user.tenantId;
  const { components } = req.body;

  if (!Array.isArray(components)) {
    return res.status(400).json({
      success: false,
      error: "Components array is required",
    });
  }

  // Update each component's order
  await Promise.all(
    components.map((item, index) =>
      prisma.salaryComponent.updateMany({
        where: {
          id: item.id,
          tenantId,
        },
        data: {
          order: item.order ?? index,
        },
      })
    )
  );

  res.json({
    success: true,
    message: "Component order updated successfully",
  });
}

// Initialize default salary components for a tenant
async function initializeDefaultComponents(req, res) {
  const tenantId = req.user.tenantId;

  // Check if tenant already has components
  const existingCount = await prisma.salaryComponent.count({
    where: { tenantId },
  });

  if (existingCount > 0) {
    return res.status(400).json({
      success: false,
      error: "Salary components already exist for this tenant",
    });
  }

  const defaultComponents = [
    // Earnings
    { name: "Basic Salary", code: "BASIC", type: "EARNING", calculationType: "FIXED", isTaxable: true, isStatutory: false, order: 1 },
    { name: "House Rent Allowance", code: "HRA", type: "EARNING", calculationType: "PERCENTAGE", defaultValue: 40, isTaxable: true, isStatutory: false, order: 2 },
    { name: "Dearness Allowance", code: "DA", type: "EARNING", calculationType: "PERCENTAGE", defaultValue: 10, isTaxable: true, isStatutory: false, order: 3 },
    { name: "Conveyance Allowance", code: "CONV", type: "EARNING", calculationType: "FIXED", defaultValue: 1600, isTaxable: false, isStatutory: false, order: 4 },
    { name: "Medical Allowance", code: "MED", type: "EARNING", calculationType: "FIXED", defaultValue: 1250, isTaxable: false, isStatutory: false, order: 5 },
    { name: "Special Allowance", code: "SPL", type: "EARNING", calculationType: "FIXED", isTaxable: true, isStatutory: false, order: 6 },

    // Deductions
    { name: "Provident Fund (Employee)", code: "PF_EMP", type: "DEDUCTION", calculationType: "PERCENTAGE", defaultValue: 12, isTaxable: false, isStatutory: true, order: 1 },
    { name: "Provident Fund (Employer)", code: "PF_EMPR", type: "DEDUCTION", calculationType: "PERCENTAGE", defaultValue: 12, isTaxable: false, isStatutory: true, order: 2 },
    { name: "ESI (Employee)", code: "ESI_EMP", type: "DEDUCTION", calculationType: "PERCENTAGE", defaultValue: 0.75, isTaxable: false, isStatutory: true, order: 3 },
    { name: "ESI (Employer)", code: "ESI_EMPR", type: "DEDUCTION", calculationType: "PERCENTAGE", defaultValue: 3.25, isTaxable: false, isStatutory: true, order: 4 },
    { name: "Professional Tax", code: "PT", type: "DEDUCTION", calculationType: "FIXED", defaultValue: 200, isTaxable: false, isStatutory: true, order: 5 },
    { name: "Income Tax (TDS)", code: "TDS", type: "DEDUCTION", calculationType: "FIXED", isTaxable: false, isStatutory: true, order: 6 },
    { name: "Loan Recovery", code: "LOAN", type: "DEDUCTION", calculationType: "FIXED", isTaxable: false, isStatutory: false, order: 7 },

    // Reimbursements
    { name: "Travel Reimbursement", code: "TRAVEL_REIMB", type: "REIMBURSEMENT", calculationType: "FIXED", isTaxable: false, isStatutory: false, order: 1 },
    { name: "Food Reimbursement", code: "FOOD_REIMB", type: "REIMBURSEMENT", calculationType: "FIXED", isTaxable: false, isStatutory: false, order: 2 },
    { name: "Mobile Reimbursement", code: "MOBILE_REIMB", type: "REIMBURSEMENT", calculationType: "FIXED", isTaxable: false, isStatutory: false, order: 3 },
  ];

  const created = await prisma.salaryComponent.createMany({
    data: defaultComponents.map((c) => ({
      ...c,
      tenantId,
      isActive: true,
    })),
  });

  // Audit log
  await createAuditLog({
    req,
    action: "BULK_IMPORT",
    entity: "SalaryComponent",
    entityName: "Default Components",
    newValue: { count: created.count },
  });

  res.status(201).json({
    success: true,
    message: `${created.count} default salary components created`,
    data: { count: created.count },
  });
}

export {
  listSalaryComponents,
  getSalaryComponent,
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
  updateComponentOrder,
  initializeDefaultComponents,
};
