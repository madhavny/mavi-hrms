import prisma from '@shared/config/database.js';

/**
 * List audit logs with filtering and pagination
 * GET /tenant/audit
 */
export const listAuditLogs = async (req, res) => {
  const tenantId = req.user.tenantId;
  const {
    page = 1,
    limit = 20,
    entity,
    entityId,
    action,
    userId,
    startDate,
    endDate,
    search
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where = { tenantId };

  if (entity) {
    where.entity = entity;
  }

  if (entityId) {
    where.entityId = parseInt(entityId);
  }

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = parseInt(userId);
  }

  // Date range filter
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      // Set to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // Search in entity name, user email
  if (search) {
    where.OR = [
      { entityName: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        tenantId: true,
        userId: true,
        userEmail: true,
        userType: true,
        action: true,
        entity: true,
        entityId: true,
        entityName: true,
        changes: true,
        ipAddress: true,
        createdAt: true
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  });
};

/**
 * Get single audit log detail
 * GET /tenant/audit/:id
 */
export const getAuditLogDetail = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const auditLog = await prisma.auditLog.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    }
  });

  if (!auditLog) {
    return res.status(404).json({
      success: false,
      message: 'Audit log not found'
    });
  }

  res.json({
    success: true,
    data: auditLog
  });
};

/**
 * Get audit logs for a specific entity
 * GET /tenant/audit/entity/:entity/:entityId
 */
export const getEntityAuditLogs = async (req, res) => {
  const { entity, entityId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const tenantId = req.user.tenantId;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    tenantId,
    entity,
    entityId: parseInt(entityId)
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.auditLog.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  });
};

/**
 * Get available entity types for filtering
 * GET /tenant/audit/entity-types
 */
export const getEntityTypes = async (req, res) => {
  const tenantId = req.user.tenantId;

  const entities = await prisma.auditLog.findMany({
    where: { tenantId },
    distinct: ['entity'],
    select: { entity: true }
  });

  res.json({
    success: true,
    data: entities.map(e => e.entity).sort()
  });
};

/**
 * Get audit statistics
 * GET /tenant/audit/stats
 */
export const getAuditStats = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { startDate, endDate } = req.query;

  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      dateFilter.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.createdAt.lte = end;
    }
  }

  const where = { tenantId, ...dateFilter };

  // Get counts by action
  const byAction = await prisma.auditLog.groupBy({
    by: ['action'],
    where,
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } }
  });

  // Get counts by entity
  const byEntity = await prisma.auditLog.groupBy({
    by: ['entity'],
    where,
    _count: { entity: true },
    orderBy: { _count: { entity: 'desc' } }
  });

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentActivity = await prisma.auditLog.groupBy({
    by: ['action'],
    where: {
      tenantId,
      createdAt: { gte: sevenDaysAgo }
    },
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
    take: 10
  });

  // Get total count
  const totalLogs = await prisma.auditLog.count({ where });

  // Get today's count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await prisma.auditLog.count({
    where: {
      tenantId,
      createdAt: { gte: today }
    }
  });

  // Get unique users who performed actions
  const uniqueUsers = await prisma.auditLog.findMany({
    where,
    distinct: ['userId'],
    select: { userId: true }
  });

  res.json({
    success: true,
    data: {
      totalLogs,
      todayCount,
      uniqueUsers: uniqueUsers.filter(u => u.userId !== null).length,
      byAction: byAction.map(a => ({
        action: a.action,
        count: a._count.action
      })),
      byEntity: byEntity.map(e => ({
        entity: e.entity,
        count: e._count.entity
      })),
      recentActivity: recentActivity.map(r => ({
        action: r.action,
        count: r._count.action
      }))
    }
  });
};

/**
 * Get user activity logs
 * GET /tenant/audit/user/:userId
 */
export const getUserActivity = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const tenantId = req.user.tenantId;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  // Verify user belongs to tenant
  const user = await prisma.user.findFirst({
    where: {
      id: parseInt(userId),
      tenantId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const where = {
    tenantId,
    userId: parseInt(userId)
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        entityName: true,
        changes: true,
        ipAddress: true,
        createdAt: true
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      user,
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  });
};

/**
 * Get available actions for filtering
 * GET /tenant/audit/actions
 */
export const getActions = async (req, res) => {
  // Return all possible actions from the enum
  const actions = [
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET',
    'CLOCK_IN',
    'CLOCK_OUT',
    'LEAVE_APPLY',
    'LEAVE_APPROVE',
    'LEAVE_REJECT',
    'LEAVE_CANCEL',
    'STATUS_CHANGE',
    'BULK_IMPORT',
    'EXPORT'
  ];

  res.json({
    success: true,
    data: actions
  });
};
