import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate progress percentage from current/target values
 */
function calculateProgress(currentValue, targetValue) {
  if (!targetValue || targetValue === 0) return 0;
  const progress = (currentValue / targetValue) * 100;
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0-100
}

/**
 * Determine status based on progress and due date
 */
function determineStatus(progress, dueDate, currentStatus) {
  if (currentStatus === 'CANCELLED') return 'CANCELLED';
  if (progress >= 100) return 'COMPLETED';
  if (progress > 0) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

/**
 * Calculate goal progress from key results (weighted average)
 */
function calculateGoalProgressFromKRs(keyResults) {
  if (!keyResults || keyResults.length === 0) return 0;

  const totalWeight = keyResults.reduce((sum, kr) => sum + (kr.weight || 1), 0);
  const weightedProgress = keyResults.reduce((sum, kr) => {
    const krProgress = calculateProgress(kr.currentValue, kr.targetValue);
    return sum + (krProgress * (kr.weight || 1));
  }, 0);

  return totalWeight > 0 ? weightedProgress / totalWeight : 0;
}

/**
 * Recalculate parent goal progress from children (roll-up)
 */
async function recalculateParentProgress(parentId, tenantId) {
  if (!parentId) return;

  const children = await prisma.goal.findMany({
    where: { parentId, tenantId, isActive: true },
    select: { progress: true, weight: true },
  });

  if (children.length === 0) return;

  const totalWeight = children.reduce((sum, c) => sum + (c.weight || 1), 0);
  const weightedProgress = children.reduce((sum, c) => {
    return sum + (c.progress * (c.weight || 1));
  }, 0);

  const newProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
  const newStatus = determineStatus(newProgress, null, null);

  await prisma.goal.update({
    where: { id: parentId },
    data: { progress: newProgress, status: newStatus },
  });

  // Recursively update grandparent
  const parent = await prisma.goal.findUnique({
    where: { id: parentId },
    select: { parentId: true },
  });

  if (parent?.parentId) {
    await recalculateParentProgress(parent.parentId, tenantId);
  }
}

// ==================== LIST GOALS ====================

export async function listGoals(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const userRole = req.user.role?.code;

  const {
    page = 1,
    limit = 20,
    type,
    category,
    status,
    userId: filterUserId,
    departmentId,
    parentId,
    includeKeyResults = 'true',
    myGoals = 'false',
  } = req.query;

  const where = {
    tenantId,
    isActive: true,
  };

  // Filter by type
  if (type) where.type = type;

  // Filter by category
  if (category) where.category = category;

  // Filter by status
  if (status) where.status = status;

  // Filter by department
  if (departmentId) where.departmentId = parseInt(departmentId);

  // Filter by parent
  if (parentId) where.parentId = parseInt(parentId);
  else if (parentId === 'null') where.parentId = null;

  // Filter by user - employees can only see their own goals unless Admin/HR
  if (myGoals === 'true') {
    where.userId = userId;
  } else if (filterUserId) {
    where.userId = parseInt(filterUserId);
  } else if (userRole === 'EMPLOYEE') {
    // Employees see their own goals + team goals for their department
    where.OR = [
      { userId },
      { type: 'TEAM', departmentId: req.user.departmentId },
      { type: 'COMPANY' },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [goals, total] = await Promise.all([
    prisma.goal.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        department: { select: { id: true, name: true } },
        parent: { select: { id: true, title: true } },
        children: { select: { id: true, title: true, progress: true, status: true } },
        keyResults: includeKeyResults === 'true',
      },
    }),
    prisma.goal.count({ where }),
  ]);

  res.json({
    success: true,
    data: goals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
}

// ==================== GET SINGLE GOAL ====================

export async function getGoal(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const goal = await prisma.goal.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
      department: { select: { id: true, name: true } },
      parent: { select: { id: true, title: true, progress: true } },
      children: {
        where: { isActive: true },
        select: { id: true, title: true, progress: true, status: true, dueDate: true },
      },
      keyResults: true,
    },
  });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  res.json({ success: true, data: goal });
}

// ==================== CREATE GOAL ====================

export async function createGoal(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const {
    title,
    description,
    type = 'INDIVIDUAL',
    category = 'OKR',
    targetValue,
    unit,
    startDate,
    dueDate,
    weight = 1,
    parentId,
    departmentId,
    assignedUserId,
    keyResults = [],
  } = req.body;

  // Validate required fields
  if (!title || !startDate || !dueDate) {
    return res.status(400).json({
      success: false,
      message: 'Title, start date, and due date are required',
    });
  }

  // For team goals, department is required
  if (type === 'TEAM' && !departmentId) {
    return res.status(400).json({
      success: false,
      message: 'Department is required for team goals',
    });
  }

  // Validate parent goal exists and belongs to same tenant
  if (parentId) {
    const parent = await prisma.goal.findFirst({
      where: { id: parentId, tenantId },
    });
    if (!parent) {
      return res.status(400).json({
        success: false,
        message: 'Parent goal not found',
      });
    }
  }

  // Determine goal owner
  const goalOwnerId = assignedUserId ? parseInt(assignedUserId) : userId;

  const goal = await prisma.goal.create({
    data: {
      tenantId,
      userId: goalOwnerId,
      title,
      description,
      type,
      category,
      targetValue: targetValue ? parseFloat(targetValue) : null,
      currentValue: 0,
      unit,
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      status: 'NOT_STARTED',
      progress: 0,
      weight: parseFloat(weight),
      parentId: parentId ? parseInt(parentId) : null,
      departmentId: departmentId ? parseInt(departmentId) : null,
      keyResults: {
        create: keyResults.map(kr => ({
          title: kr.title,
          description: kr.description,
          targetValue: parseFloat(kr.targetValue),
          currentValue: 0,
          unit: kr.unit,
          weight: kr.weight ? parseFloat(kr.weight) : 1,
          status: 'NOT_STARTED',
        })),
      },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      keyResults: true,
    },
  });

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'Goal',
    entityId: goal.id,
    newValues: goal,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: goal });
}

// ==================== UPDATE GOAL ====================

export async function updateGoal(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existingGoal = await prisma.goal.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existingGoal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  const {
    title,
    description,
    type,
    category,
    targetValue,
    unit,
    startDate,
    dueDate,
    status,
    weight,
    parentId,
    departmentId,
  } = req.body;

  const updateData = {};

  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (type !== undefined) updateData.type = type;
  if (category !== undefined) updateData.category = category;
  if (targetValue !== undefined) updateData.targetValue = parseFloat(targetValue);
  if (unit !== undefined) updateData.unit = unit;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
  if (status !== undefined) updateData.status = status;
  if (weight !== undefined) updateData.weight = parseFloat(weight);
  if (parentId !== undefined) updateData.parentId = parentId ? parseInt(parentId) : null;
  if (departmentId !== undefined) updateData.departmentId = departmentId ? parseInt(departmentId) : null;

  const goal = await prisma.goal.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      keyResults: true,
    },
  });

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'Goal',
    entityId: goal.id,
    oldValues: existingGoal,
    newValues: goal,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: goal });
}

// ==================== UPDATE GOAL PROGRESS ====================

export async function updateGoalProgress(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;
  const { currentValue, note } = req.body;

  const goal = await prisma.goal.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { keyResults: true },
  });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  let newProgress;
  let newCurrentValue = goal.currentValue;

  // If goal has key results, calculate progress from them
  if (goal.keyResults.length > 0) {
    newProgress = calculateGoalProgressFromKRs(goal.keyResults);
  } else if (currentValue !== undefined) {
    // Otherwise use direct value
    newCurrentValue = parseFloat(currentValue);
    newProgress = calculateProgress(newCurrentValue, goal.targetValue);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Current value is required for goals without key results',
    });
  }

  const newStatus = determineStatus(newProgress, goal.dueDate, goal.status);

  const updatedGoal = await prisma.goal.update({
    where: { id: parseInt(id) },
    data: {
      currentValue: newCurrentValue,
      progress: newProgress,
      status: newStatus,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      keyResults: true,
    },
  });

  // Roll-up to parent
  if (goal.parentId) {
    await recalculateParentProgress(goal.parentId, tenantId);
  }

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'Goal',
    entityId: goal.id,
    oldValues: { currentValue: goal.currentValue, progress: goal.progress, status: goal.status },
    newValues: { currentValue: newCurrentValue, progress: newProgress, status: newStatus, note },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: updatedGoal });
}

// ==================== DELETE GOAL ====================

export async function deleteGoal(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const goal = await prisma.goal.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { children: { where: { isActive: true } } },
  });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  // Check for active children
  if (goal.children.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete goal with child goals. Delete children first.',
    });
  }

  // Soft delete
  await prisma.goal.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  // Roll-up parent progress
  if (goal.parentId) {
    await recalculateParentProgress(goal.parentId, tenantId);
  }

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'Goal',
    entityId: goal.id,
    oldValues: goal,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Goal deleted successfully' });
}

// ==================== KEY RESULTS ====================

export async function addKeyResult(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;
  const { title, description, targetValue, unit, weight = 1 } = req.body;

  const goal = await prisma.goal.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  if (!title || !targetValue) {
    return res.status(400).json({
      success: false,
      message: 'Title and target value are required',
    });
  }

  const keyResult = await prisma.keyResult.create({
    data: {
      goalId: parseInt(id),
      title,
      description,
      targetValue: parseFloat(targetValue),
      currentValue: 0,
      unit,
      weight: parseFloat(weight),
      status: 'NOT_STARTED',
    },
  });

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'KeyResult',
    entityId: keyResult.id,
    newValues: keyResult,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: keyResult });
}

export async function updateKeyResult(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id, krId } = req.params;
  const { title, description, targetValue, currentValue, unit, weight, status } = req.body;

  // Verify goal exists and belongs to tenant
  const goal = await prisma.goal.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  const existingKR = await prisma.keyResult.findFirst({
    where: { id: parseInt(krId), goalId: parseInt(id) },
  });

  if (!existingKR) {
    return res.status(404).json({ success: false, message: 'Key result not found' });
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (targetValue !== undefined) updateData.targetValue = parseFloat(targetValue);
  if (currentValue !== undefined) updateData.currentValue = parseFloat(currentValue);
  if (unit !== undefined) updateData.unit = unit;
  if (weight !== undefined) updateData.weight = parseFloat(weight);
  if (status !== undefined) updateData.status = status;

  // Auto-determine status based on progress if currentValue changed
  if (currentValue !== undefined && !status) {
    const progress = calculateProgress(parseFloat(currentValue), existingKR.targetValue);
    updateData.status = determineStatus(progress, null, existingKR.status);
  }

  const keyResult = await prisma.keyResult.update({
    where: { id: parseInt(krId) },
    data: updateData,
  });

  // Recalculate goal progress
  const allKRs = await prisma.keyResult.findMany({
    where: { goalId: parseInt(id) },
  });

  const goalProgress = calculateGoalProgressFromKRs(allKRs);
  const goalStatus = determineStatus(goalProgress, goal.dueDate, goal.status);

  await prisma.goal.update({
    where: { id: parseInt(id) },
    data: { progress: goalProgress, status: goalStatus },
  });

  // Roll-up to parent
  if (goal.parentId) {
    await recalculateParentProgress(goal.parentId, tenantId);
  }

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'KeyResult',
    entityId: keyResult.id,
    oldValues: existingKR,
    newValues: keyResult,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: keyResult });
}

export async function deleteKeyResult(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id, krId } = req.params;

  // Verify goal exists and belongs to tenant
  const goal = await prisma.goal.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  const keyResult = await prisma.keyResult.findFirst({
    where: { id: parseInt(krId), goalId: parseInt(id) },
  });

  if (!keyResult) {
    return res.status(404).json({ success: false, message: 'Key result not found' });
  }

  await prisma.keyResult.delete({
    where: { id: parseInt(krId) },
  });

  // Recalculate goal progress
  const remainingKRs = await prisma.keyResult.findMany({
    where: { goalId: parseInt(id) },
  });

  const goalProgress = calculateGoalProgressFromKRs(remainingKRs);
  const goalStatus = determineStatus(goalProgress, goal.dueDate, goal.status);

  await prisma.goal.update({
    where: { id: parseInt(id) },
    data: { progress: goalProgress, status: goalStatus },
  });

  // Roll-up to parent
  if (goal.parentId) {
    await recalculateParentProgress(goal.parentId, tenantId);
  }

  // Audit log
  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'KeyResult',
    entityId: keyResult.id,
    oldValues: keyResult,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Key result deleted successfully' });
}

// ==================== GOAL HIERARCHY ====================

export async function getGoalHierarchy(req, res) {
  const tenantId = req.user.tenantId;
  const { rootId } = req.query;

  // Get top-level goals (company goals or specified root)
  const where = {
    tenantId,
    isActive: true,
  };

  if (rootId) {
    where.id = parseInt(rootId);
  } else {
    where.parentId = null;
    where.type = 'COMPANY';
  }

  const buildTree = async (goals) => {
    const tree = [];
    for (const goal of goals) {
      const children = await prisma.goal.findMany({
        where: { parentId: goal.id, tenantId, isActive: true },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { id: true, name: true } },
        },
      });

      tree.push({
        ...goal,
        children: children.length > 0 ? await buildTree(children) : [],
      });
    }
    return tree;
  };

  const rootGoals = await prisma.goal.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      department: { select: { id: true, name: true } },
    },
  });

  const hierarchy = await buildTree(rootGoals);

  res.json({ success: true, data: hierarchy });
}

// ==================== GOAL STATS ====================

export async function getGoalStats(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { userId: filterUserId, departmentId } = req.query;

  const where = {
    tenantId,
    isActive: true,
  };

  if (filterUserId) where.userId = parseInt(filterUserId);
  if (departmentId) where.departmentId = parseInt(departmentId);

  const [goals, statusCounts, typeCounts, categoryCounts] = await Promise.all([
    prisma.goal.findMany({
      where,
      select: { progress: true, status: true, dueDate: true },
    }),
    prisma.goal.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    prisma.goal.groupBy({
      by: ['type'],
      where,
      _count: { id: true },
    }),
    prisma.goal.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
    }),
  ]);

  // Calculate averages
  const totalGoals = goals.length;
  const avgProgress = totalGoals > 0
    ? goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals
    : 0;

  // Count overdue goals
  const today = new Date();
  const overdueCount = goals.filter(g =>
    g.status !== 'COMPLETED' && g.status !== 'CANCELLED' && new Date(g.dueDate) < today
  ).length;

  // Format counts
  const byStatus = statusCounts.reduce((acc, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  const byType = typeCounts.reduce((acc, t) => {
    acc[t.type] = t._count.id;
    return acc;
  }, {});

  const byCategory = categoryCounts.reduce((acc, c) => {
    acc[c.category] = c._count.id;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      total: totalGoals,
      avgProgress: Math.round(avgProgress * 100) / 100,
      overdue: overdueCount,
      byStatus,
      byType,
      byCategory,
    },
  });
}
