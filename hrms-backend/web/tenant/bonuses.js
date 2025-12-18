import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== BONUS MANAGEMENT ====================

/**
 * List all bonuses with filters
 */
export async function listBonuses(req, res) {
  const { tenantId } = req.user;
  const {
    page = 1,
    limit = 20,
    userId,
    bonusType,
    status,
    fromDate,
    toDate,
    search,
    myBonuses,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    tenantId,
    ...(userId && { userId: parseInt(userId) }),
    ...(bonusType && { bonusType }),
    ...(status && { status }),
    ...(myBonuses === 'true' && { userId: req.user.id }),
    ...(fromDate && toDate && {
      effectiveDate: {
        gte: new Date(fromDate),
        lte: new Date(toDate),
      },
    }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [bonuses, total] = await Promise.all([
    prisma.bonus.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            avatar: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } },
          },
        },
        requester: {
          select: { id: true, firstName: true, lastName: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.bonus.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      bonuses,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    },
  });
}

/**
 * Get single bonus details
 */
export async function getBonus(req, res) {
  const { tenantId } = req.user;
  const { id } = req.params;

  const bonus = await prisma.bonus.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true,
          avatar: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      },
      requester: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      approver: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      payslip: {
        select: { id: true, month: true, year: true, status: true },
      },
    },
  });

  if (!bonus) {
    return res.status(404).json({
      success: false,
      message: 'Bonus not found',
    });
  }

  res.json({ success: true, data: bonus });
}

/**
 * Create a new bonus
 */
export async function createBonus(req, res) {
  const { tenantId, id: requesterId } = req.user;
  const {
    userId,
    bonusType,
    title,
    description,
    amount,
    currency = 'INR',
    effectiveDate,
    isTaxable = true,
    remarks,
  } = req.body;

  // Verify user exists in tenant
  const user = await prisma.user.findFirst({
    where: { id: parseInt(userId), tenantId },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found',
    });
  }

  const bonus = await prisma.bonus.create({
    data: {
      tenantId,
      userId: parseInt(userId),
      bonusType,
      title,
      description,
      amount: parseFloat(amount),
      currency,
      effectiveDate: new Date(effectiveDate),
      isTaxable,
      remarks,
      requestedBy: requesterId,
      status: 'PENDING',
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId: requesterId,
    action: 'CREATE',
    entity: 'Bonus',
    entityId: bonus.id,
    newValue: bonus,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(201).json({
    success: true,
    message: 'Bonus created successfully',
    data: bonus,
  });
}

/**
 * Update bonus
 */
export async function updateBonus(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const {
    bonusType,
    title,
    description,
    amount,
    currency,
    effectiveDate,
    isTaxable,
    remarks,
  } = req.body;

  const existing = await prisma.bonus.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Bonus not found',
    });
  }

  // Can only edit PENDING bonuses
  if (existing.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: 'Can only edit pending bonuses',
    });
  }

  const bonus = await prisma.bonus.update({
    where: { id: parseInt(id) },
    data: {
      ...(bonusType && { bonusType }),
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(amount && { amount: parseFloat(amount) }),
      ...(currency && { currency }),
      ...(effectiveDate && { effectiveDate: new Date(effectiveDate) }),
      ...(isTaxable !== undefined && { isTaxable }),
      ...(remarks !== undefined && { remarks }),
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'Bonus',
    entityId: bonus.id,
    oldValue: existing,
    newValue: bonus,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Bonus updated successfully',
    data: bonus,
  });
}

/**
 * Approve bonus
 */
export async function approveBonus(req, res) {
  const { tenantId, id: approverId } = req.user;
  const { id } = req.params;

  const existing = await prisma.bonus.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Bonus not found',
    });
  }

  if (existing.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: 'Can only approve pending bonuses',
    });
  }

  const bonus = await prisma.bonus.update({
    where: { id: parseInt(id) },
    data: {
      status: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date(),
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId: approverId,
    action: 'UPDATE',
    entity: 'Bonus',
    entityId: bonus.id,
    oldValue: { status: existing.status },
    newValue: { status: 'APPROVED', approvedBy: approverId },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Bonus approved successfully',
    data: bonus,
  });
}

/**
 * Reject bonus
 */
export async function rejectBonus(req, res) {
  const { tenantId, id: approverId } = req.user;
  const { id } = req.params;
  const { rejectionReason } = req.body;

  const existing = await prisma.bonus.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Bonus not found',
    });
  }

  if (existing.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: 'Can only reject pending bonuses',
    });
  }

  const bonus = await prisma.bonus.update({
    where: { id: parseInt(id) },
    data: {
      status: 'REJECTED',
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason,
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId: approverId,
    action: 'UPDATE',
    entity: 'Bonus',
    entityId: bonus.id,
    oldValue: { status: existing.status },
    newValue: { status: 'REJECTED', rejectionReason },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Bonus rejected',
    data: bonus,
  });
}

/**
 * Mark bonus as paid
 */
export async function markBonusPaid(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { paymentDate, payslipId, taxAmount, netAmount } = req.body;

  const existing = await prisma.bonus.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Bonus not found',
    });
  }

  if (existing.status !== 'APPROVED') {
    return res.status(400).json({
      success: false,
      message: 'Can only pay approved bonuses',
    });
  }

  const bonus = await prisma.bonus.update({
    where: { id: parseInt(id) },
    data: {
      status: 'PAID',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      ...(payslipId && { payslipId: parseInt(payslipId) }),
      ...(taxAmount !== undefined && { taxAmount: parseFloat(taxAmount) }),
      ...(netAmount !== undefined && { netAmount: parseFloat(netAmount) }),
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'Bonus',
    entityId: bonus.id,
    oldValue: { status: existing.status },
    newValue: { status: 'PAID', paymentDate: bonus.paymentDate },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Bonus marked as paid',
    data: bonus,
  });
}

/**
 * Cancel bonus
 */
export async function cancelBonus(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const existing = await prisma.bonus.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Bonus not found',
    });
  }

  if (existing.status === 'PAID') {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel paid bonuses',
    });
  }

  const bonus = await prisma.bonus.update({
    where: { id: parseInt(id) },
    data: { status: 'CANCELLED' },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'Bonus',
    entityId: bonus.id,
    oldValue: { status: existing.status },
    newValue: { status: 'CANCELLED' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Bonus cancelled',
    data: bonus,
  });
}

/**
 * Delete bonus (only PENDING or CANCELLED)
 */
export async function deleteBonus(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const existing = await prisma.bonus.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Bonus not found',
    });
  }

  if (!['PENDING', 'CANCELLED'].includes(existing.status)) {
    return res.status(400).json({
      success: false,
      message: 'Can only delete pending or cancelled bonuses',
    });
  }

  await prisma.bonus.delete({
    where: { id: parseInt(id) },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entity: 'Bonus',
    entityId: parseInt(id),
    oldValue: existing,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Bonus deleted successfully',
  });
}

/**
 * Get bonus statistics
 */
export async function getBonusStats(req, res) {
  const { tenantId } = req.user;
  const { year, month } = req.query;

  const currentYear = year ? parseInt(year) : new Date().getFullYear();

  // Get all bonuses for the year
  const bonuses = await prisma.bonus.findMany({
    where: {
      tenantId,
      effectiveDate: {
        gte: new Date(currentYear, 0, 1),
        lt: new Date(currentYear + 1, 0, 1),
      },
    },
    select: {
      id: true,
      bonusType: true,
      status: true,
      amount: true,
      effectiveDate: true,
    },
  });

  // Calculate stats
  const stats = {
    totalBonuses: bonuses.length,
    totalAmount: bonuses.reduce((sum, b) => sum + b.amount, 0),
    paidAmount: bonuses
      .filter((b) => b.status === 'PAID')
      .reduce((sum, b) => sum + b.amount, 0),
    pendingAmount: bonuses
      .filter((b) => b.status === 'PENDING')
      .reduce((sum, b) => sum + b.amount, 0),
    approvedAmount: bonuses
      .filter((b) => b.status === 'APPROVED')
      .reduce((sum, b) => sum + b.amount, 0),
    byStatus: {
      PENDING: bonuses.filter((b) => b.status === 'PENDING').length,
      APPROVED: bonuses.filter((b) => b.status === 'APPROVED').length,
      REJECTED: bonuses.filter((b) => b.status === 'REJECTED').length,
      PAID: bonuses.filter((b) => b.status === 'PAID').length,
      CANCELLED: bonuses.filter((b) => b.status === 'CANCELLED').length,
    },
    byType: {},
    monthlyTrend: [],
  };

  // By type
  const bonusTypes = [
    'PERFORMANCE',
    'FESTIVAL',
    'REFERRAL',
    'RETENTION',
    'JOINING',
    'ANNUAL',
    'SPOT',
    'PROJECT',
    'OTHER',
  ];
  bonusTypes.forEach((type) => {
    const typeBonuses = bonuses.filter((b) => b.bonusType === type);
    stats.byType[type] = {
      count: typeBonuses.length,
      amount: typeBonuses.reduce((sum, b) => sum + b.amount, 0),
    };
  });

  // Monthly trend
  for (let m = 0; m < 12; m++) {
    const monthBonuses = bonuses.filter((b) => {
      const date = new Date(b.effectiveDate);
      return date.getMonth() === m;
    });
    stats.monthlyTrend.push({
      month: m + 1,
      count: monthBonuses.length,
      amount: monthBonuses.reduce((sum, b) => sum + b.amount, 0),
    });
  }

  res.json({ success: true, data: stats });
}

// ==================== INCENTIVE SCHEME MANAGEMENT ====================

/**
 * List all incentive schemes
 */
export async function listIncentiveSchemes(req, res) {
  const { tenantId } = req.user;
  const { page = 1, limit = 20, isActive, frequency, search } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    tenantId,
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
    ...(frequency && { frequency }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [schemes, total] = await Promise.all([
    prisma.incentiveScheme.findMany({
      where,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { records: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.incentiveScheme.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      schemes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    },
  });
}

/**
 * Get single incentive scheme
 */
export async function getIncentiveScheme(req, res) {
  const { tenantId } = req.user;
  const { id } = req.params;

  const scheme = await prisma.incentiveScheme.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      records: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!scheme) {
    return res.status(404).json({
      success: false,
      message: 'Incentive scheme not found',
    });
  }

  res.json({ success: true, data: scheme });
}

/**
 * Create incentive scheme
 */
export async function createIncentiveScheme(req, res) {
  const { tenantId, id: creatorId } = req.user;
  const {
    name,
    code,
    description,
    frequency,
    criteria,
    targetType,
    targetValue,
    targetUnit,
    payoutType,
    payoutValue,
    slabs,
    maxPayout,
    applicableTo,
    applicableIds,
    startDate,
    endDate,
  } = req.body;

  // Check code uniqueness
  const existing = await prisma.incentiveScheme.findFirst({
    where: { tenantId, code },
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Incentive scheme with this code already exists',
    });
  }

  const scheme = await prisma.incentiveScheme.create({
    data: {
      tenantId,
      name,
      code,
      description,
      frequency: frequency || 'QUARTERLY',
      criteria,
      targetType,
      targetValue: targetValue ? parseFloat(targetValue) : null,
      targetUnit,
      payoutType: payoutType || 'FIXED',
      payoutValue: payoutValue ? parseFloat(payoutValue) : null,
      slabs,
      maxPayout: maxPayout ? parseFloat(maxPayout) : null,
      applicableTo: applicableTo || 'ALL',
      applicableIds: applicableIds || [],
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      createdBy: creatorId,
    },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId: creatorId,
    action: 'CREATE',
    entity: 'IncentiveScheme',
    entityId: scheme.id,
    newValue: scheme,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(201).json({
    success: true,
    message: 'Incentive scheme created successfully',
    data: scheme,
  });
}

/**
 * Update incentive scheme
 */
export async function updateIncentiveScheme(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const updates = req.body;

  const existing = await prisma.incentiveScheme.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Incentive scheme not found',
    });
  }

  // Check code uniqueness if changing
  if (updates.code && updates.code !== existing.code) {
    const codeExists = await prisma.incentiveScheme.findFirst({
      where: { tenantId, code: updates.code, id: { not: parseInt(id) } },
    });
    if (codeExists) {
      return res.status(400).json({
        success: false,
        message: 'Incentive scheme with this code already exists',
      });
    }
  }

  const scheme = await prisma.incentiveScheme.update({
    where: { id: parseInt(id) },
    data: {
      ...(updates.name && { name: updates.name }),
      ...(updates.code && { code: updates.code }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.frequency && { frequency: updates.frequency }),
      ...(updates.criteria !== undefined && { criteria: updates.criteria }),
      ...(updates.targetType !== undefined && { targetType: updates.targetType }),
      ...(updates.targetValue !== undefined && { targetValue: updates.targetValue ? parseFloat(updates.targetValue) : null }),
      ...(updates.targetUnit !== undefined && { targetUnit: updates.targetUnit }),
      ...(updates.payoutType && { payoutType: updates.payoutType }),
      ...(updates.payoutValue !== undefined && { payoutValue: updates.payoutValue ? parseFloat(updates.payoutValue) : null }),
      ...(updates.slabs !== undefined && { slabs: updates.slabs }),
      ...(updates.maxPayout !== undefined && { maxPayout: updates.maxPayout ? parseFloat(updates.maxPayout) : null }),
      ...(updates.applicableTo && { applicableTo: updates.applicableTo }),
      ...(updates.applicableIds !== undefined && { applicableIds: updates.applicableIds }),
      ...(updates.startDate && { startDate: new Date(updates.startDate) }),
      ...(updates.endDate !== undefined && { endDate: updates.endDate ? new Date(updates.endDate) : null }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
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
    entity: 'IncentiveScheme',
    entityId: scheme.id,
    oldValue: existing,
    newValue: scheme,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Incentive scheme updated successfully',
    data: scheme,
  });
}

/**
 * Delete incentive scheme
 */
export async function deleteIncentiveScheme(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const existing = await prisma.incentiveScheme.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { _count: { select: { records: true } } },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Incentive scheme not found',
    });
  }

  // If has records, just deactivate
  if (existing._count.records > 0) {
    await prisma.incentiveScheme.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: 'Incentive scheme deactivated (has existing records)',
    });
  }

  await prisma.incentiveScheme.delete({
    where: { id: parseInt(id) },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entity: 'IncentiveScheme',
    entityId: parseInt(id),
    oldValue: existing,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Incentive scheme deleted successfully',
  });
}

// ==================== INCENTIVE RECORD MANAGEMENT ====================

/**
 * List incentive records
 */
export async function listIncentiveRecords(req, res) {
  const { tenantId } = req.user;
  const {
    page = 1,
    limit = 20,
    schemeId,
    userId,
    status,
    fromDate,
    toDate,
    myIncentives,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    tenantId,
    ...(schemeId && { schemeId: parseInt(schemeId) }),
    ...(userId && { userId: parseInt(userId) }),
    ...(status && { status }),
    ...(myIncentives === 'true' && { userId: req.user.id }),
    ...(fromDate && toDate && {
      periodStart: { gte: new Date(fromDate) },
      periodEnd: { lte: new Date(toDate) },
    }),
  };

  const [records, total] = await Promise.all([
    prisma.incentiveRecord.findMany({
      where,
      include: {
        scheme: {
          select: { id: true, name: true, code: true, frequency: true },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { id: true, name: true } },
          },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.incentiveRecord.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      records,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    },
  });
}

/**
 * Get single incentive record
 */
export async function getIncentiveRecord(req, res) {
  const { tenantId } = req.user;
  const { id } = req.params;

  const record = await prisma.incentiveRecord.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      scheme: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      },
      approver: {
        select: { id: true, firstName: true, lastName: true },
      },
      payslip: {
        select: { id: true, month: true, year: true, status: true },
      },
    },
  });

  if (!record) {
    return res.status(404).json({
      success: false,
      message: 'Incentive record not found',
    });
  }

  res.json({ success: true, data: record });
}

/**
 * Create incentive record
 */
export async function createIncentiveRecord(req, res) {
  const { tenantId } = req.user;
  const {
    schemeId,
    userId,
    periodStart,
    periodEnd,
    targetValue,
    achievedValue,
    calculatedAmount,
    adjustedAmount,
    remarks,
  } = req.body;

  // Verify scheme exists
  const scheme = await prisma.incentiveScheme.findFirst({
    where: { id: parseInt(schemeId), tenantId, isActive: true },
  });

  if (!scheme) {
    return res.status(404).json({
      success: false,
      message: 'Incentive scheme not found or inactive',
    });
  }

  // Verify user exists
  const user = await prisma.user.findFirst({
    where: { id: parseInt(userId), tenantId },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found',
    });
  }

  // Calculate achievement percentage
  const achievementPercent = targetValue && achievedValue
    ? (achievedValue / targetValue) * 100
    : null;

  // Calculate final amount
  const finalAmount = adjustedAmount !== undefined
    ? parseFloat(adjustedAmount)
    : parseFloat(calculatedAmount);

  const record = await prisma.incentiveRecord.create({
    data: {
      tenantId,
      schemeId: parseInt(schemeId),
      userId: parseInt(userId),
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      targetValue: targetValue ? parseFloat(targetValue) : null,
      achievedValue: achievedValue ? parseFloat(achievedValue) : null,
      achievementPercent,
      calculatedAmount: parseFloat(calculatedAmount),
      adjustedAmount: adjustedAmount ? parseFloat(adjustedAmount) : null,
      finalAmount,
      remarks,
      status: 'PENDING',
    },
    include: {
      scheme: {
        select: { id: true, name: true, code: true },
      },
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId: req.user.id,
    action: 'CREATE',
    entity: 'IncentiveRecord',
    entityId: record.id,
    newValue: record,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(201).json({
    success: true,
    message: 'Incentive record created successfully',
    data: record,
  });
}

/**
 * Update incentive record
 */
export async function updateIncentiveRecord(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const updates = req.body;

  const existing = await prisma.incentiveRecord.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Incentive record not found',
    });
  }

  if (existing.status === 'PAID') {
    return res.status(400).json({
      success: false,
      message: 'Cannot edit paid incentive records',
    });
  }

  // Recalculate if values changed
  let achievementPercent = existing.achievementPercent;
  let finalAmount = existing.finalAmount;

  if (updates.targetValue !== undefined || updates.achievedValue !== undefined) {
    const target = updates.targetValue !== undefined ? updates.targetValue : existing.targetValue;
    const achieved = updates.achievedValue !== undefined ? updates.achievedValue : existing.achievedValue;
    achievementPercent = target && achieved ? (achieved / target) * 100 : null;
  }

  if (updates.adjustedAmount !== undefined || updates.calculatedAmount !== undefined) {
    const adjusted = updates.adjustedAmount !== undefined ? updates.adjustedAmount : existing.adjustedAmount;
    const calculated = updates.calculatedAmount !== undefined ? updates.calculatedAmount : existing.calculatedAmount;
    finalAmount = adjusted !== null ? adjusted : calculated;
  }

  const record = await prisma.incentiveRecord.update({
    where: { id: parseInt(id) },
    data: {
      ...(updates.targetValue !== undefined && { targetValue: updates.targetValue ? parseFloat(updates.targetValue) : null }),
      ...(updates.achievedValue !== undefined && { achievedValue: updates.achievedValue ? parseFloat(updates.achievedValue) : null }),
      achievementPercent,
      ...(updates.calculatedAmount !== undefined && { calculatedAmount: parseFloat(updates.calculatedAmount) }),
      ...(updates.adjustedAmount !== undefined && { adjustedAmount: updates.adjustedAmount ? parseFloat(updates.adjustedAmount) : null }),
      finalAmount,
      ...(updates.remarks !== undefined && { remarks: updates.remarks }),
    },
    include: {
      scheme: {
        select: { id: true, name: true, code: true },
      },
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'IncentiveRecord',
    entityId: record.id,
    oldValue: existing,
    newValue: record,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Incentive record updated successfully',
    data: record,
  });
}

/**
 * Approve incentive record
 */
export async function approveIncentiveRecord(req, res) {
  const { tenantId, id: approverId } = req.user;
  const { id } = req.params;

  const existing = await prisma.incentiveRecord.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Incentive record not found',
    });
  }

  if (existing.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: 'Can only approve pending incentive records',
    });
  }

  const record = await prisma.incentiveRecord.update({
    where: { id: parseInt(id) },
    data: {
      status: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date(),
    },
    include: {
      scheme: {
        select: { id: true, name: true, code: true },
      },
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId: approverId,
    action: 'UPDATE',
    entity: 'IncentiveRecord',
    entityId: record.id,
    oldValue: { status: existing.status },
    newValue: { status: 'APPROVED' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Incentive approved successfully',
    data: record,
  });
}

/**
 * Reject incentive record
 */
export async function rejectIncentiveRecord(req, res) {
  const { tenantId, id: approverId } = req.user;
  const { id } = req.params;
  const { remarks } = req.body;

  const existing = await prisma.incentiveRecord.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Incentive record not found',
    });
  }

  if (existing.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: 'Can only reject pending incentive records',
    });
  }

  const record = await prisma.incentiveRecord.update({
    where: { id: parseInt(id) },
    data: {
      status: 'REJECTED',
      approvedBy: approverId,
      approvedAt: new Date(),
      remarks: remarks || existing.remarks,
    },
    include: {
      scheme: {
        select: { id: true, name: true, code: true },
      },
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId: approverId,
    action: 'UPDATE',
    entity: 'IncentiveRecord',
    entityId: record.id,
    oldValue: { status: existing.status },
    newValue: { status: 'REJECTED' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Incentive rejected',
    data: record,
  });
}

/**
 * Mark incentive as paid
 */
export async function markIncentivePaid(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { paidAt, payslipId, taxAmount, netAmount } = req.body;

  const existing = await prisma.incentiveRecord.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Incentive record not found',
    });
  }

  if (existing.status !== 'APPROVED') {
    return res.status(400).json({
      success: false,
      message: 'Can only pay approved incentives',
    });
  }

  const record = await prisma.incentiveRecord.update({
    where: { id: parseInt(id) },
    data: {
      status: 'PAID',
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      ...(payslipId && { payslipId: parseInt(payslipId) }),
      ...(taxAmount !== undefined && { taxAmount: parseFloat(taxAmount) }),
      ...(netAmount !== undefined && { netAmount: parseFloat(netAmount) }),
    },
    include: {
      scheme: {
        select: { id: true, name: true, code: true },
      },
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entity: 'IncentiveRecord',
    entityId: record.id,
    oldValue: { status: existing.status },
    newValue: { status: 'PAID' },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Incentive marked as paid',
    data: record,
  });
}

/**
 * Delete incentive record
 */
export async function deleteIncentiveRecord(req, res) {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;

  const existing = await prisma.incentiveRecord.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Incentive record not found',
    });
  }

  if (existing.status === 'PAID') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete paid incentive records',
    });
  }

  await prisma.incentiveRecord.delete({
    where: { id: parseInt(id) },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entity: 'IncentiveRecord',
    entityId: parseInt(id),
    oldValue: existing,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Incentive record deleted successfully',
  });
}

/**
 * Get incentive statistics
 */
export async function getIncentiveStats(req, res) {
  const { tenantId } = req.user;
  const { year } = req.query;

  const currentYear = year ? parseInt(year) : new Date().getFullYear();

  const [schemes, records] = await Promise.all([
    prisma.incentiveScheme.findMany({
      where: { tenantId },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.incentiveRecord.findMany({
      where: {
        tenantId,
        periodStart: {
          gte: new Date(currentYear, 0, 1),
        },
        periodEnd: {
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
      select: {
        id: true,
        schemeId: true,
        status: true,
        finalAmount: true,
        periodStart: true,
      },
    }),
  ]);

  const stats = {
    totalSchemes: schemes.length,
    activeSchemes: schemes.filter((s) => s.isActive).length,
    totalRecords: records.length,
    totalAmount: records.reduce((sum, r) => sum + r.finalAmount, 0),
    paidAmount: records
      .filter((r) => r.status === 'PAID')
      .reduce((sum, r) => sum + r.finalAmount, 0),
    pendingAmount: records
      .filter((r) => r.status === 'PENDING')
      .reduce((sum, r) => sum + r.finalAmount, 0),
    approvedAmount: records
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.finalAmount, 0),
    byStatus: {
      PENDING: records.filter((r) => r.status === 'PENDING').length,
      APPROVED: records.filter((r) => r.status === 'APPROVED').length,
      REJECTED: records.filter((r) => r.status === 'REJECTED').length,
      PAID: records.filter((r) => r.status === 'PAID').length,
    },
    byScheme: {},
    quarterlyTrend: [],
  };

  // By scheme
  schemes.forEach((scheme) => {
    const schemeRecords = records.filter((r) => r.schemeId === scheme.id);
    stats.byScheme[scheme.name] = {
      count: schemeRecords.length,
      amount: schemeRecords.reduce((sum, r) => sum + r.finalAmount, 0),
    };
  });

  // Quarterly trend
  const quarters = [
    { start: 0, end: 2, label: 'Q1' },
    { start: 3, end: 5, label: 'Q2' },
    { start: 6, end: 8, label: 'Q3' },
    { start: 9, end: 11, label: 'Q4' },
  ];

  quarters.forEach((q) => {
    const qRecords = records.filter((r) => {
      const month = new Date(r.periodStart).getMonth();
      return month >= q.start && month <= q.end;
    });
    stats.quarterlyTrend.push({
      quarter: q.label,
      count: qRecords.length,
      amount: qRecords.reduce((sum, r) => sum + r.finalAmount, 0),
    });
  });

  res.json({ success: true, data: stats });
}
