import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== EXPENSE CATEGORIES ====================

export async function listExpenseCategories(req, res) {
  const tenantId = req.user.tenantId;

  const categories = await prisma.expenseCategory.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { claims: true } },
    },
  });

  res.json({ success: true, data: categories });
}

export async function getExpenseCategory(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const category = await prisma.expenseCategory.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      _count: { select: { claims: true } },
    },
  });

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  res.json({ success: true, data: category });
}

export async function createExpenseCategory(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const { name, description, maxLimit, requiresReceipt = true } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  // Check for duplicate name
  const existing = await prisma.expenseCategory.findFirst({
    where: { tenantId, name },
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'Category with this name already exists' });
  }

  const category = await prisma.expenseCategory.create({
    data: {
      tenantId,
      name,
      description,
      maxLimit: maxLimit ? parseFloat(maxLimit) : null,
      requiresReceipt,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'ExpenseCategory',
    entityId: category.id,
    newValues: category,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: category });
}

export async function updateExpenseCategory(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.expenseCategory.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const { name, description, maxLimit, requiresReceipt } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (maxLimit !== undefined) updateData.maxLimit = maxLimit ? parseFloat(maxLimit) : null;
  if (requiresReceipt !== undefined) updateData.requiresReceipt = requiresReceipt;

  const category = await prisma.expenseCategory.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'ExpenseCategory',
    entityId: category.id,
    oldValues: existing,
    newValues: category,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: category });
}

export async function deleteExpenseCategory(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const category = await prisma.expenseCategory.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { _count: { select: { claims: true } } },
  });

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (category._count.claims > 0) {
    // Soft delete if has claims
    await prisma.expenseCategory.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });
  } else {
    // Hard delete if no claims
    await prisma.expenseCategory.delete({
      where: { id: parseInt(id) },
    });
  }

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'ExpenseCategory',
    entityId: category.id,
    oldValues: category,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Category deleted' });
}

// ==================== EXPENSE CLAIMS ====================

export async function listExpenseClaims(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const userRole = req.user.role?.code;

  const { status, categoryId, startDate, endDate, myClaims = 'false', toApprove = 'false', page = 1, limit = 20 } = req.query;

  const where = { tenantId };

  if (status) where.status = status;
  if (categoryId) where.categoryId = parseInt(categoryId);

  // Date range filter
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  // Filter based on role and params
  if (myClaims === 'true') {
    where.userId = userId;
  } else if (toApprove === 'true') {
    // Manager sees pending claims from their reportees
    const reportees = await prisma.user.findMany({
      where: { tenantId, reportingTo: userId },
      select: { id: true },
    });
    where.userId = { in: reportees.map((r) => r.id) };
    where.status = 'PENDING';
  } else if (userRole === 'EMPLOYEE') {
    where.userId = userId;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [claims, total] = await Promise.all([
    prisma.expenseClaim.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ createdAt: 'desc' }],
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        category: { select: { id: true, name: true, maxLimit: true, requiresReceipt: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.expenseClaim.count({ where }),
  ]);

  res.json({
    success: true,
    data: claims,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getExpenseClaim(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const claim = await prisma.expenseClaim.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, department: { select: { name: true } } } },
      category: true,
      approver: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!claim) {
    return res.status(404).json({ success: false, message: 'Expense claim not found' });
  }

  res.json({ success: true, data: claim });
}

export async function createExpenseClaim(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const { categoryId, amount, currency = 'INR', date, description, receiptUrl, notes, submit = false } = req.body;

  if (!categoryId || !amount || !date || !description) {
    return res.status(400).json({ success: false, message: 'Category, amount, date, and description are required' });
  }

  // Validate category and check limits
  const category = await prisma.expenseCategory.findFirst({
    where: { id: parseInt(categoryId), tenantId, isActive: true },
  });

  if (!category) {
    return res.status(400).json({ success: false, message: 'Invalid category' });
  }

  if (category.maxLimit && parseFloat(amount) > category.maxLimit) {
    return res.status(400).json({
      success: false,
      message: `Amount exceeds category limit of ${category.maxLimit} ${currency}`,
    });
  }

  if (category.requiresReceipt && !receiptUrl && submit) {
    return res.status(400).json({ success: false, message: 'Receipt is required for this category' });
  }

  const claim = await prisma.expenseClaim.create({
    data: {
      tenantId,
      userId,
      categoryId: parseInt(categoryId),
      amount: parseFloat(amount),
      currency,
      date: new Date(date),
      description,
      receiptUrl,
      notes,
      status: submit ? 'PENDING' : 'DRAFT',
    },
    include: {
      category: true,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'ExpenseClaim',
    entityId: claim.id,
    newValues: claim,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: claim });
}

export async function updateExpenseClaim(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const claim = await prisma.expenseClaim.findFirst({
    where: { id: parseInt(id), tenantId, userId },
  });

  if (!claim) {
    return res.status(404).json({ success: false, message: 'Expense claim not found' });
  }

  if (claim.status !== 'DRAFT' && claim.status !== 'REJECTED') {
    return res.status(400).json({ success: false, message: 'Can only edit draft or rejected claims' });
  }

  const { categoryId, amount, currency, date, description, receiptUrl, notes } = req.body;

  const updateData = {};
  if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);
  if (amount !== undefined) updateData.amount = parseFloat(amount);
  if (currency !== undefined) updateData.currency = currency;
  if (date !== undefined) updateData.date = new Date(date);
  if (description !== undefined) updateData.description = description;
  if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;
  if (notes !== undefined) updateData.notes = notes;

  // If editing a rejected claim, reset to draft
  if (claim.status === 'REJECTED') {
    updateData.status = 'DRAFT';
    updateData.rejectedReason = null;
  }

  const updated = await prisma.expenseClaim.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: { category: true },
  });

  res.json({ success: true, data: updated });
}

export async function deleteExpenseClaim(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const claim = await prisma.expenseClaim.findFirst({
    where: { id: parseInt(id), tenantId, userId },
  });

  if (!claim) {
    return res.status(404).json({ success: false, message: 'Expense claim not found' });
  }

  if (claim.status !== 'DRAFT') {
    return res.status(400).json({ success: false, message: 'Can only delete draft claims' });
  }

  await prisma.expenseClaim.delete({ where: { id: parseInt(id) } });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'ExpenseClaim',
    entityId: claim.id,
    oldValues: claim,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Expense claim deleted' });
}

// ==================== SUBMIT & APPROVAL ====================

export async function submitExpenseClaim(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const claim = await prisma.expenseClaim.findFirst({
    where: { id: parseInt(id), tenantId, userId },
    include: { category: true },
  });

  if (!claim) {
    return res.status(404).json({ success: false, message: 'Expense claim not found' });
  }

  if (claim.status !== 'DRAFT' && claim.status !== 'REJECTED') {
    return res.status(400).json({ success: false, message: 'Claim already submitted' });
  }

  // Validate receipt if required
  if (claim.category.requiresReceipt && !claim.receiptUrl) {
    return res.status(400).json({ success: false, message: 'Receipt is required for this category' });
  }

  const updated = await prisma.expenseClaim.update({
    where: { id: parseInt(id) },
    data: { status: 'PENDING', rejectedReason: null },
    include: { category: true },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'ExpenseClaim',
    entityId: claim.id,
    newValues: { status: 'PENDING' },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updated, message: 'Expense claim submitted for approval' });
}

export async function approveExpenseClaims(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { claimIds } = req.body;

  if (!claimIds || claimIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No claim IDs provided' });
  }

  // Verify all claims exist and are pending
  const claims = await prisma.expenseClaim.findMany({
    where: { id: { in: claimIds }, tenantId, status: 'PENDING' },
  });

  if (claims.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid claims to approve' });
  }

  // Approve all claims
  await prisma.expenseClaim.updateMany({
    where: { id: { in: claims.map((c) => c.id) } },
    data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'ExpenseClaim',
    entityId: 0,
    newValues: { action: 'APPROVE_EXPENSES', count: claims.length },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: `Approved ${claims.length} expense claims`, approvedCount: claims.length });
}

export async function rejectExpenseClaims(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { claimIds, reason } = req.body;

  if (!claimIds || claimIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No claim IDs provided' });
  }

  // Verify all claims exist and are pending
  const claims = await prisma.expenseClaim.findMany({
    where: { id: { in: claimIds }, tenantId, status: 'PENDING' },
  });

  if (claims.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid claims to reject' });
  }

  // Reject all claims
  await prisma.expenseClaim.updateMany({
    where: { id: { in: claims.map((c) => c.id) } },
    data: { status: 'REJECTED', rejectedReason: reason || null },
  });

  res.json({ success: true, message: `Rejected ${claims.length} expense claims`, rejectedCount: claims.length });
}

export async function markAsReimbursed(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { claimIds } = req.body;

  if (!claimIds || claimIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No claim IDs provided' });
  }

  // Verify all claims exist and are approved
  const claims = await prisma.expenseClaim.findMany({
    where: { id: { in: claimIds }, tenantId, status: 'APPROVED' },
  });

  if (claims.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid claims to mark as reimbursed' });
  }

  // Mark all as reimbursed
  await prisma.expenseClaim.updateMany({
    where: { id: { in: claims.map((c) => c.id) } },
    data: { status: 'REIMBURSED', reimbursedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'ExpenseClaim',
    entityId: 0,
    newValues: { action: 'REIMBURSE_EXPENSES', count: claims.length },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: `Marked ${claims.length} claims as reimbursed`, reimbursedCount: claims.length });
}

// ==================== STATS ====================

export async function getExpenseStats(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const userRole = req.user.role?.code;
  const { startDate, endDate, myClaims = 'false' } = req.query;

  const where = { tenantId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (myClaims === 'true' || userRole === 'EMPLOYEE') {
    where.userId = userId;
  }

  const [total, statusCounts, totalAmount, categoryTotals] = await Promise.all([
    prisma.expenseClaim.count({ where }),
    prisma.expenseClaim.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.expenseClaim.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.expenseClaim.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  // Get category names
  const categoryIds = categoryTotals.map((c) => c.categoryId);
  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});

  const byStatus = statusCounts.reduce((acc, s) => {
    acc[s.status] = { count: s._count.id, amount: s._sum.amount || 0 };
    return acc;
  }, {});

  const byCategory = categoryTotals.map((c) => ({
    categoryId: c.categoryId,
    categoryName: categoryMap[c.categoryId] || 'Unknown',
    count: c._count.id,
    amount: c._sum.amount || 0,
  }));

  res.json({
    success: true,
    data: {
      total,
      totalAmount: totalAmount._sum.amount || 0,
      byStatus,
      byCategory,
      pendingAmount: byStatus.PENDING?.amount || 0,
      approvedAmount: byStatus.APPROVED?.amount || 0,
      reimbursedAmount: byStatus.REIMBURSED?.amount || 0,
    },
  });
}
