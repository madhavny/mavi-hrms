import { prisma } from "../../shared/config/database.js";
import { createAuditLog } from "../../shared/utilities/audit.js";

// List payslips with filters
async function listPayslips(req, res) {
  const tenantId = req.user.tenantId;
  const { userId, month, year, status, page = 1, limit = 20 } = req.query;

  const where = { tenantId };

  if (userId) where.userId = parseInt(userId);
  if (month) where.month = parseInt(month);
  if (year) where.year = parseInt(year);
  if (status) where.status = status;

  const [payslips, total] = await Promise.all([
    prisma.payslip.findMany({
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
            salaryComponent: {
              select: { code: true, type: true },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { user: { firstName: "asc" } }],
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.payslip.count({ where }),
  ]);

  res.json({
    success: true,
    data: payslips,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
}

// Get single payslip
async function getPayslip(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const payslip = await prisma.payslip.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          email: true,
          phone: true,
          dateOfJoining: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
          location: { select: { name: true } },
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

  if (!payslip) {
    return res.status(404).json({
      success: false,
      error: "Payslip not found",
    });
  }

  // Group components
  const earnings = payslip.components.filter(
    (c) => c.componentType === "EARNING"
  );
  const deductions = payslip.components.filter(
    (c) => c.componentType === "DEDUCTION"
  );
  const reimbursements = payslip.components.filter(
    (c) => c.componentType === "REIMBURSEMENT"
  );

  res.json({
    success: true,
    data: {
      ...payslip,
      groupedComponents: { earnings, deductions, reimbursements },
    },
  });
}

// Get employee's payslip for specific month
async function getEmployeePayslip(req, res) {
  const tenantId = req.user.tenantId;
  const { userId, month, year } = req.params;

  const payslip = await prisma.payslip.findFirst({
    where: {
      tenantId,
      userId: parseInt(userId),
      month: parseInt(month),
      year: parseInt(year),
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
      },
    },
  });

  if (!payslip) {
    return res.status(404).json({
      success: false,
      error: "Payslip not found for this period",
    });
  }

  res.json({
    success: true,
    data: payslip,
  });
}

// Generate payslip for an employee
async function generatePayslip(req, res) {
  const tenantId = req.user.tenantId;
  const { userId, month, year } = req.body;

  if (!userId || !month || !year) {
    return res.status(400).json({
      success: false,
      error: "userId, month, and year are required",
    });
  }

  // Check if payslip already exists
  const existing = await prisma.payslip.findFirst({
    where: {
      tenantId,
      userId: parseInt(userId),
      month: parseInt(month),
      year: parseInt(year),
    },
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      error: "Payslip already exists for this period",
      existingPayslipId: existing.id,
    });
  }

  // Get employee's active salary structure
  const salaryStructure = await prisma.salaryStructure.findFirst({
    where: {
      tenantId,
      userId: parseInt(userId),
      isActive: true,
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

  if (!salaryStructure) {
    return res.status(400).json({
      success: false,
      error: "No active salary structure found for this employee",
    });
  }

  // Get attendance data for the month
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0);

  const attendance = await prisma.attendance.findMany({
    where: {
      tenantId,
      userId: parseInt(userId),
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Get leave data
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      userId: parseInt(userId),
      status: "APPROVED",
      fromDate: { lte: endDate },
      toDate: { gte: startDate },
    },
    include: {
      leaveType: true,
    },
  });

  // Calculate working days (excluding weekends)
  const totalDaysInMonth = endDate.getDate();
  let weekends = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const day = new Date(parseInt(year), parseInt(month) - 1, d).getDay();
    if (day === 0 || day === 6) weekends++;
  }
  const totalWorkingDays = totalDaysInMonth - weekends;

  // Calculate present days and LOP
  const presentDays = attendance.filter(
    (a) => a.status === "PRESENT" || a.status === "HALF_DAY" || a.status === "LATE"
  ).length;

  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  for (const leave of leaves) {
    // Calculate days in this month
    const leaveStart = new Date(leave.fromDate) < startDate ? startDate : new Date(leave.fromDate);
    const leaveEnd = new Date(leave.toDate) > endDate ? endDate : new Date(leave.toDate);
    const days = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;

    if (leave.leaveType.isPaid) {
      paidLeaveDays += days;
    } else {
      unpaidLeaveDays += days;
    }
  }

  const daysWorked = presentDays + paidLeaveDays;
  const lopDays = totalWorkingDays - daysWorked;

  // Calculate salary based on LOP
  const perDaySalary = salaryStructure.grossSalary / totalWorkingDays;
  const lopDeduction = lopDays > 0 ? lopDays * perDaySalary : 0;

  // Prepare payslip components
  const payslipComponents = salaryStructure.components.map((comp) => ({
    salaryComponentId: comp.salaryComponentId,
    componentName: comp.salaryComponent.name,
    componentType: comp.salaryComponent.type,
    amount: comp.calculatedAmount,
  }));

  // Calculate totals
  const grossEarnings = payslipComponents
    .filter((c) => c.componentType === "EARNING" || c.componentType === "REIMBURSEMENT")
    .reduce((sum, c) => sum + c.amount, 0);

  const totalDeductions = payslipComponents
    .filter((c) => c.componentType === "DEDUCTION")
    .reduce((sum, c) => sum + c.amount, 0);

  const netSalary = grossEarnings - totalDeductions - lopDeduction;

  // Create payslip
  const payslip = await prisma.payslip.create({
    data: {
      tenantId,
      userId: parseInt(userId),
      month: parseInt(month),
      year: parseInt(year),
      basicSalary: salaryStructure.basicSalary,
      grossEarnings,
      totalDeductions: totalDeductions + lopDeduction,
      netSalary,
      totalWorkingDays,
      daysWorked,
      leaveDays: paidLeaveDays,
      lopDays,
      status: "DRAFT",
      generatedAt: new Date(),
      components: {
        create: payslipComponents,
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
      components: true,
    },
  });

  // Audit log
  await createAuditLog({
    req,
    action: "CREATE",
    entity: "Payslip",
    entityId: payslip.id,
    entityName: `${payslip.user.firstName} ${payslip.user.lastName || ""} - ${month}/${year}`.trim(),
    newValue: payslip,
  });

  res.status(201).json({
    success: true,
    data: payslip,
    message: "Payslip generated successfully",
  });
}

// Bulk generate payslips for all employees
async function bulkGeneratePayslips(req, res) {
  const tenantId = req.user.tenantId;
  const { month, year, userIds } = req.body;

  if (!month || !year) {
    return res.status(400).json({
      success: false,
      error: "month and year are required",
    });
  }

  // Get employees with active salary structures
  const whereClause = {
    tenantId,
    isActive: true,
  };

  if (userIds && userIds.length > 0) {
    whereClause.userId = { in: userIds.map((id) => parseInt(id)) };
  }

  const salaryStructures = await prisma.salaryStructure.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
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

  const results = {
    success: [],
    skipped: [],
    failed: [],
  };

  for (const structure of salaryStructures) {
    try {
      // Check if payslip already exists
      const existing = await prisma.payslip.findFirst({
        where: {
          tenantId,
          userId: structure.userId,
          month: parseInt(month),
          year: parseInt(year),
        },
      });

      if (existing) {
        results.skipped.push({
          userId: structure.userId,
          name: `${structure.user.firstName} ${structure.user.lastName || ""}`.trim(),
          reason: "Payslip already exists",
        });
        continue;
      }

      // Calculate attendance and LOP (simplified for bulk)
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      const totalDaysInMonth = endDate.getDate();

      let weekends = 0;
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const day = new Date(parseInt(year), parseInt(month) - 1, d).getDay();
        if (day === 0 || day === 6) weekends++;
      }
      const totalWorkingDays = totalDaysInMonth - weekends;

      // Prepare payslip components
      const payslipComponents = structure.components.map((comp) => ({
        salaryComponentId: comp.salaryComponentId,
        componentName: comp.salaryComponent.name,
        componentType: comp.salaryComponent.type,
        amount: comp.calculatedAmount,
      }));

      const grossEarnings = payslipComponents
        .filter((c) => c.componentType === "EARNING" || c.componentType === "REIMBURSEMENT")
        .reduce((sum, c) => sum + c.amount, 0);

      const totalDeductions = payslipComponents
        .filter((c) => c.componentType === "DEDUCTION")
        .reduce((sum, c) => sum + c.amount, 0);

      // Create payslip
      const payslip = await prisma.payslip.create({
        data: {
          tenantId,
          userId: structure.userId,
          month: parseInt(month),
          year: parseInt(year),
          basicSalary: structure.basicSalary,
          grossEarnings,
          totalDeductions,
          netSalary: grossEarnings - totalDeductions,
          totalWorkingDays,
          daysWorked: totalWorkingDays,
          leaveDays: 0,
          lopDays: 0,
          status: "DRAFT",
          generatedAt: new Date(),
          components: {
            create: payslipComponents,
          },
        },
      });

      results.success.push({
        userId: structure.userId,
        payslipId: payslip.id,
        name: `${structure.user.firstName} ${structure.user.lastName || ""}`.trim(),
      });
    } catch (error) {
      results.failed.push({
        userId: structure.userId,
        name: `${structure.user.firstName} ${structure.user.lastName || ""}`.trim(),
        error: error.message,
      });
    }
  }

  // Audit log
  await createAuditLog({
    req,
    action: "BULK_IMPORT",
    entity: "Payslip",
    entityName: `Bulk ${month}/${year}`,
    newValue: results,
  });

  res.json({
    success: true,
    data: results,
    message: `Generated ${results.success.length} payslips, skipped ${results.skipped.length}, failed ${results.failed.length}`,
  });
}

// Update payslip status
async function updatePayslipStatus(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { status } = req.body;

  if (!["DRAFT", "PROCESSED", "PAID", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Invalid status",
    });
  }

  const existing = await prisma.payslip.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Payslip not found",
    });
  }

  const updateData = { status };

  if (status === "PROCESSED") {
    updateData.processedAt = new Date();
  } else if (status === "PAID") {
    updateData.paidAt = new Date();
    updateData.paidBy = req.user.id;
  }

  const payslip = await prisma.payslip.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  // Audit log
  await createAuditLog({
    req,
    action: "STATUS_CHANGE",
    entity: "Payslip",
    entityId: payslip.id,
    entityName: `${existing.user.firstName} ${existing.user.lastName || ""} - ${existing.month}/${existing.year}`.trim(),
    oldValue: { status: existing.status },
    newValue: { status: payslip.status },
  });

  res.json({
    success: true,
    data: payslip,
    message: `Payslip status updated to ${status}`,
  });
}

// Bulk update payslip status
async function bulkUpdatePayslipStatus(req, res) {
  const tenantId = req.user.tenantId;
  const { payslipIds, status } = req.body;

  if (!Array.isArray(payslipIds) || payslipIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: "payslipIds array is required",
    });
  }

  if (!["PROCESSED", "PAID", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Invalid status",
    });
  }

  const updateData = { status };

  if (status === "PROCESSED") {
    updateData.processedAt = new Date();
  } else if (status === "PAID") {
    updateData.paidAt = new Date();
    updateData.paidBy = req.user.id;
  }

  const result = await prisma.payslip.updateMany({
    where: {
      id: { in: payslipIds.map((id) => parseInt(id)) },
      tenantId,
    },
    data: updateData,
  });

  // Audit log
  await createAuditLog({
    req,
    action: "STATUS_CHANGE",
    entity: "Payslip",
    entityName: `Bulk Status Update`,
    newValue: { status, count: result.count },
  });

  res.json({
    success: true,
    data: { updatedCount: result.count },
    message: `${result.count} payslips updated to ${status}`,
  });
}

// Delete payslip (only DRAFT)
async function deletePayslip(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const existing = await prisma.payslip.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: "Payslip not found",
    });
  }

  if (existing.status !== "DRAFT") {
    return res.status(400).json({
      success: false,
      error: "Only DRAFT payslips can be deleted",
    });
  }

  await prisma.payslip.delete({
    where: { id: parseInt(id) },
  });

  // Audit log
  await createAuditLog({
    req,
    action: "DELETE",
    entity: "Payslip",
    entityId: existing.id,
    entityName: `${existing.user.firstName} ${existing.user.lastName || ""} - ${existing.month}/${existing.year}`.trim(),
    oldValue: existing,
  });

  res.json({
    success: true,
    message: "Payslip deleted successfully",
  });
}

// Get payroll summary for a month
async function getPayrollSummary(req, res) {
  const tenantId = req.user.tenantId;
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({
      success: false,
      error: "month and year are required",
    });
  }

  const where = {
    tenantId,
    month: parseInt(month),
    year: parseInt(year),
  };

  const [payslips, statusCounts] = await Promise.all([
    prisma.payslip.findMany({
      where,
      select: {
        grossEarnings: true,
        totalDeductions: true,
        netSalary: true,
        status: true,
      },
    }),
    prisma.payslip.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
  ]);

  const summary = {
    totalPayslips: payslips.length,
    totalGrossEarnings: payslips.reduce((sum, p) => sum + p.grossEarnings, 0),
    totalDeductions: payslips.reduce((sum, p) => sum + p.totalDeductions, 0),
    totalNetSalary: payslips.reduce((sum, p) => sum + p.netSalary, 0),
    statusBreakdown: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {}),
  };

  res.json({
    success: true,
    data: summary,
  });
}

export {
  listPayslips,
  getPayslip,
  getEmployeePayslip,
  generatePayslip,
  bulkGeneratePayslips,
  updatePayslipStatus,
  bulkUpdatePayslipStatus,
  deletePayslip,
  getPayrollSummary,
};
