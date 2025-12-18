import { prisma } from "../../shared/config/database.js";
import { createAuditLog } from "../../shared/utilities/audit.js";

// ==================== TAX SLABS ====================

// List tax slabs
async function listTaxSlabs(req, res) {
  const tenantId = req.user.tenantId;
  const { regime, financialYear, isActive } = req.query;

  const where = { tenantId };

  if (regime) where.regime = regime;
  if (financialYear) where.financialYear = financialYear;
  if (isActive !== undefined) where.isActive = isActive === "true";

  const slabs = await prisma.taxSlab.findMany({
    where,
    orderBy: [{ financialYear: "desc" }, { regime: "asc" }, { fromAmount: "asc" }],
  });

  // Group by regime
  const grouped = {
    OLD: slabs.filter((s) => s.regime === "OLD"),
    NEW: slabs.filter((s) => s.regime === "NEW"),
  };

  res.json({
    success: true,
    data: { slabs, grouped },
  });
}

// Create tax slab
async function createTaxSlab(req, res) {
  const tenantId = req.user.tenantId;
  const { regime, financialYear, fromAmount, toAmount, percentage, isActive = true } = req.body;

  if (!regime || !financialYear || fromAmount === undefined || percentage === undefined) {
    return res.status(400).json({
      success: false,
      error: "regime, financialYear, fromAmount, and percentage are required",
    });
  }

  const slab = await prisma.taxSlab.create({
    data: {
      tenantId,
      regime,
      financialYear,
      fromAmount: parseFloat(fromAmount),
      toAmount: toAmount ? parseFloat(toAmount) : null,
      percentage: parseFloat(percentage),
      isActive,
    },
  });

  await createAuditLog({
    req,
    action: "CREATE",
    entity: "TaxSlab",
    entityId: slab.id,
    entityName: `${regime} - ${financialYear}`,
    newValue: slab,
  });

  res.status(201).json({
    success: true,
    data: slab,
    message: "Tax slab created successfully",
  });
}

// Update tax slab
async function updateTaxSlab(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { fromAmount, toAmount, percentage, isActive } = req.body;

  const existing = await prisma.taxSlab.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Tax slab not found",
    });
  }

  const updateData = {};
  if (fromAmount !== undefined) updateData.fromAmount = parseFloat(fromAmount);
  if (toAmount !== undefined) updateData.toAmount = toAmount ? parseFloat(toAmount) : null;
  if (percentage !== undefined) updateData.percentage = parseFloat(percentage);
  if (isActive !== undefined) updateData.isActive = isActive;

  const slab = await prisma.taxSlab.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  await createAuditLog({
    req,
    action: "UPDATE",
    entity: "TaxSlab",
    entityId: slab.id,
    entityName: `${slab.regime} - ${slab.financialYear}`,
    oldValue: existing,
    newValue: slab,
  });

  res.json({
    success: true,
    data: slab,
    message: "Tax slab updated successfully",
  });
}

// Delete tax slab
async function deleteTaxSlab(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const existing = await prisma.taxSlab.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Tax slab not found",
    });
  }

  await prisma.taxSlab.delete({
    where: { id: parseInt(id) },
  });

  await createAuditLog({
    req,
    action: "DELETE",
    entity: "TaxSlab",
    entityId: existing.id,
    entityName: `${existing.regime} - ${existing.financialYear}`,
    oldValue: existing,
  });

  res.json({
    success: true,
    message: "Tax slab deleted successfully",
  });
}

// Initialize default tax slabs (Indian tax regime)
async function initializeDefaultTaxSlabs(req, res) {
  const tenantId = req.user.tenantId;
  const { financialYear = "2024-25" } = req.body;

  // Check if slabs already exist
  const existingCount = await prisma.taxSlab.count({
    where: { tenantId, financialYear },
  });

  if (existingCount > 0) {
    return res.status(400).json({
      success: false,
      error: `Tax slabs already exist for ${financialYear}`,
    });
  }

  // New Tax Regime (FY 2024-25)
  const newRegimeSlabs = [
    { fromAmount: 0, toAmount: 300000, percentage: 0 },
    { fromAmount: 300000, toAmount: 700000, percentage: 5 },
    { fromAmount: 700000, toAmount: 1000000, percentage: 10 },
    { fromAmount: 1000000, toAmount: 1200000, percentage: 15 },
    { fromAmount: 1200000, toAmount: 1500000, percentage: 20 },
    { fromAmount: 1500000, toAmount: null, percentage: 30 },
  ];

  // Old Tax Regime (FY 2024-25)
  const oldRegimeSlabs = [
    { fromAmount: 0, toAmount: 250000, percentage: 0 },
    { fromAmount: 250000, toAmount: 500000, percentage: 5 },
    { fromAmount: 500000, toAmount: 1000000, percentage: 20 },
    { fromAmount: 1000000, toAmount: null, percentage: 30 },
  ];

  const allSlabs = [
    ...newRegimeSlabs.map((s) => ({ ...s, regime: "NEW", financialYear, tenantId, isActive: true })),
    ...oldRegimeSlabs.map((s) => ({ ...s, regime: "OLD", financialYear, tenantId, isActive: true })),
  ];

  const created = await prisma.taxSlab.createMany({
    data: allSlabs,
  });

  await createAuditLog({
    req,
    action: "BULK_IMPORT",
    entity: "TaxSlab",
    entityName: `Default Slabs ${financialYear}`,
    newValue: { count: created.count },
  });

  res.status(201).json({
    success: true,
    message: `${created.count} tax slabs created for ${financialYear}`,
    data: { count: created.count },
  });
}

// ==================== TAX DECLARATIONS ====================

// List tax declarations
async function listTaxDeclarations(req, res) {
  const tenantId = req.user.tenantId;
  const { userId, financialYear, status, page = 1, limit = 20 } = req.query;

  const where = { tenantId };

  if (userId) where.userId = parseInt(userId);
  if (financialYear) where.financialYear = financialYear;
  if (status) where.status = status;

  const [declarations, total] = await Promise.all([
    prisma.taxDeclaration.findMany({
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
          },
        },
      },
      orderBy: [{ financialYear: "desc" }, { updatedAt: "desc" }],
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.taxDeclaration.count({ where }),
  ]);

  res.json({
    success: true,
    data: declarations,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
}

// Get single tax declaration
async function getTaxDeclaration(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const declaration = await prisma.taxDeclaration.findFirst({
    where: { id: parseInt(id), tenantId },
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
    },
  });

  if (!declaration) {
    return res.status(404).json({
      success: false,
      error: "Tax declaration not found",
    });
  }

  res.json({
    success: true,
    data: declaration,
  });
}

// Get employee's tax declaration for a year
async function getEmployeeTaxDeclaration(req, res) {
  const tenantId = req.user.tenantId;
  const { userId, financialYear } = req.params;

  let declaration = await prisma.taxDeclaration.findFirst({
    where: {
      tenantId,
      userId: parseInt(userId),
      financialYear,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
      },
    },
  });

  // If not found, create a draft
  if (!declaration) {
    declaration = await prisma.taxDeclaration.create({
      data: {
        tenantId,
        userId: parseInt(userId),
        financialYear,
        regime: "NEW",
        status: "DRAFT",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });
  }

  res.json({
    success: true,
    data: declaration,
  });
}

// Create/Update tax declaration
async function saveTaxDeclaration(req, res) {
  const tenantId = req.user.tenantId;
  const {
    userId,
    financialYear,
    regime = "NEW",
    section80C = 0,
    section80D = 0,
    section80E = 0,
    section80G = 0,
    hra = 0,
    rentPaid = 0,
    homeLoanInterest = 0,
    homeLoanPrincipal = 0,
    nps = 0,
    otherDeductions = 0,
  } = req.body;

  if (!userId || !financialYear) {
    return res.status(400).json({
      success: false,
      error: "userId and financialYear are required",
    });
  }

  // Calculate total deductions
  const totalDeductions =
    parseFloat(section80C) +
    parseFloat(section80D) +
    parseFloat(section80E) +
    parseFloat(section80G) +
    parseFloat(hra) +
    parseFloat(homeLoanInterest) +
    parseFloat(nps) +
    parseFloat(otherDeductions);

  // Get employee's annual income
  const salaryStructure = await prisma.salaryStructure.findFirst({
    where: { tenantId, userId: parseInt(userId), isActive: true },
  });

  const annualIncome = salaryStructure ? salaryStructure.ctc : 0;
  const taxableIncome = Math.max(0, annualIncome - totalDeductions);

  // Calculate estimated tax based on regime
  const slabs = await prisma.taxSlab.findMany({
    where: { tenantId, regime, isActive: true },
    orderBy: { fromAmount: "asc" },
  });

  let estimatedTax = 0;
  let remainingIncome = taxableIncome;

  for (const slab of slabs) {
    if (remainingIncome <= 0) break;

    const slabTop = slab.toAmount || Infinity;
    const slabRange = slabTop - slab.fromAmount;
    const incomeInSlab = Math.min(remainingIncome, slabRange);

    estimatedTax += (incomeInSlab * slab.percentage) / 100;
    remainingIncome -= incomeInSlab;
  }

  // Add cess (4%)
  estimatedTax = estimatedTax + estimatedTax * 0.04;

  const data = {
    tenantId,
    userId: parseInt(userId),
    financialYear,
    regime,
    section80C: parseFloat(section80C),
    section80D: parseFloat(section80D),
    section80E: parseFloat(section80E),
    section80G: parseFloat(section80G),
    hra: parseFloat(hra),
    rentPaid: parseFloat(rentPaid),
    homeLoanInterest: parseFloat(homeLoanInterest),
    homeLoanPrincipal: parseFloat(homeLoanPrincipal),
    nps: parseFloat(nps),
    otherDeductions: parseFloat(otherDeductions),
    totalDeductions,
    taxableIncome,
    estimatedTax: Math.round(estimatedTax),
  };

  // Upsert declaration
  const existing = await prisma.taxDeclaration.findFirst({
    where: { tenantId, userId: parseInt(userId), financialYear },
  });

  let declaration;
  if (existing) {
    declaration = await prisma.taxDeclaration.update({
      where: { id: existing.id },
      data,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    await createAuditLog({
      req,
      action: "UPDATE",
      entity: "TaxDeclaration",
      entityId: declaration.id,
      entityName: `${declaration.user.firstName} ${declaration.user.lastName || ""} - ${financialYear}`.trim(),
      oldValue: existing,
      newValue: declaration,
    });
  } else {
    declaration = await prisma.taxDeclaration.create({
      data: { ...data, status: "DRAFT" },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    await createAuditLog({
      req,
      action: "CREATE",
      entity: "TaxDeclaration",
      entityId: declaration.id,
      entityName: `${declaration.user.firstName} ${declaration.user.lastName || ""} - ${financialYear}`.trim(),
      newValue: declaration,
    });
  }

  res.json({
    success: true,
    data: declaration,
    message: existing ? "Tax declaration updated" : "Tax declaration created",
  });
}

// Submit tax declaration
async function submitTaxDeclaration(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const existing = await prisma.taxDeclaration.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Tax declaration not found",
    });
  }

  if (existing.status !== "DRAFT") {
    return res.status(400).json({
      success: false,
      error: "Only DRAFT declarations can be submitted",
    });
  }

  const declaration = await prisma.taxDeclaration.update({
    where: { id: parseInt(id) },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  await createAuditLog({
    req,
    action: "STATUS_CHANGE",
    entity: "TaxDeclaration",
    entityId: declaration.id,
    entityName: `${existing.user.firstName} ${existing.user.lastName || ""} - ${existing.financialYear}`.trim(),
    oldValue: { status: existing.status },
    newValue: { status: declaration.status },
  });

  res.json({
    success: true,
    data: declaration,
    message: "Tax declaration submitted for approval",
  });
}

// Approve/Reject tax declaration
async function reviewTaxDeclaration(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { action, comments } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({
      success: false,
      error: "Action must be 'approve' or 'reject'",
    });
  }

  const existing = await prisma.taxDeclaration.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Tax declaration not found",
    });
  }

  if (existing.status !== "SUBMITTED") {
    return res.status(400).json({
      success: false,
      error: "Only SUBMITTED declarations can be reviewed",
    });
  }

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  const declaration = await prisma.taxDeclaration.update({
    where: { id: parseInt(id) },
    data: {
      status: newStatus,
      approvedBy: req.user.id,
      approvedAt: new Date(),
    },
  });

  await createAuditLog({
    req,
    action: action === "approve" ? "LEAVE_APPROVE" : "LEAVE_REJECT",
    entity: "TaxDeclaration",
    entityId: declaration.id,
    entityName: `${existing.user.firstName} ${existing.user.lastName || ""} - ${existing.financialYear}`.trim(),
    oldValue: { status: existing.status },
    newValue: { status: declaration.status, comments },
  });

  res.json({
    success: true,
    data: declaration,
    message: `Tax declaration ${action}d`,
  });
}

// Calculate tax preview
async function calculateTaxPreview(req, res) {
  const tenantId = req.user.tenantId;
  const {
    annualIncome,
    regime = "NEW",
    section80C = 0,
    section80D = 0,
    section80E = 0,
    section80G = 0,
    hra = 0,
    homeLoanInterest = 0,
    nps = 0,
    otherDeductions = 0,
    financialYear = "2024-25",
  } = req.body;

  if (!annualIncome) {
    return res.status(400).json({
      success: false,
      error: "annualIncome is required",
    });
  }

  // Calculate total deductions (applicable in old regime, limited in new)
  let totalDeductions = 0;
  if (regime === "OLD") {
    totalDeductions =
      Math.min(parseFloat(section80C), 150000) +
      Math.min(parseFloat(section80D), 100000) +
      parseFloat(section80E) +
      parseFloat(section80G) +
      parseFloat(hra) +
      Math.min(parseFloat(homeLoanInterest), 200000) +
      Math.min(parseFloat(nps), 50000) +
      parseFloat(otherDeductions);
  } else {
    // New regime has very limited deductions
    totalDeductions = Math.min(parseFloat(nps), 50000);
  }

  const taxableIncome = Math.max(0, parseFloat(annualIncome) - totalDeductions);

  // Get tax slabs
  let slabs = await prisma.taxSlab.findMany({
    where: { tenantId, regime, financialYear, isActive: true },
    orderBy: { fromAmount: "asc" },
  });

  // If no slabs found, use default
  if (slabs.length === 0) {
    slabs =
      regime === "NEW"
        ? [
            { fromAmount: 0, toAmount: 300000, percentage: 0 },
            { fromAmount: 300000, toAmount: 700000, percentage: 5 },
            { fromAmount: 700000, toAmount: 1000000, percentage: 10 },
            { fromAmount: 1000000, toAmount: 1200000, percentage: 15 },
            { fromAmount: 1200000, toAmount: 1500000, percentage: 20 },
            { fromAmount: 1500000, toAmount: null, percentage: 30 },
          ]
        : [
            { fromAmount: 0, toAmount: 250000, percentage: 0 },
            { fromAmount: 250000, toAmount: 500000, percentage: 5 },
            { fromAmount: 500000, toAmount: 1000000, percentage: 20 },
            { fromAmount: 1000000, toAmount: null, percentage: 30 },
          ];
  }

  let tax = 0;
  let remainingIncome = taxableIncome;
  const slabwiseTax = [];

  for (const slab of slabs) {
    if (remainingIncome <= 0) break;

    const slabTop = slab.toAmount || Infinity;
    const slabRange = slabTop - slab.fromAmount;
    const incomeInSlab = Math.min(remainingIncome, slabRange);
    const taxInSlab = (incomeInSlab * slab.percentage) / 100;

    slabwiseTax.push({
      slab: `${slab.fromAmount.toLocaleString()} - ${slab.toAmount ? slab.toAmount.toLocaleString() : "Above"}`,
      rate: `${slab.percentage}%`,
      income: Math.round(incomeInSlab),
      tax: Math.round(taxInSlab),
    });

    tax += taxInSlab;
    remainingIncome -= incomeInSlab;
  }

  // Add cess (4%)
  const cess = tax * 0.04;
  const totalTax = tax + cess;

  res.json({
    success: true,
    data: {
      annualIncome: parseFloat(annualIncome),
      regime,
      totalDeductions: Math.round(totalDeductions),
      taxableIncome: Math.round(taxableIncome),
      baseTax: Math.round(tax),
      cess: Math.round(cess),
      totalTax: Math.round(totalTax),
      monthlyTax: Math.round(totalTax / 12),
      effectiveRate: `${((totalTax / parseFloat(annualIncome)) * 100).toFixed(2)}%`,
      slabwiseTax,
    },
  });
}

export {
  listTaxSlabs,
  createTaxSlab,
  updateTaxSlab,
  deleteTaxSlab,
  initializeDefaultTaxSlabs,
  listTaxDeclarations,
  getTaxDeclaration,
  getEmployeeTaxDeclaration,
  saveTaxDeclaration,
  submitTaxDeclaration,
  reviewTaxDeclaration,
  calculateTaxPreview,
};
