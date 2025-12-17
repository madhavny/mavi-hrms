import prisma from '@shared/config/database.js';

/**
 * Get audit logs for tenant (Admin/HR only)
 */
export const getAuditLogs = async (req, res) => {
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

  const skip = (page - 1) * limit;
  const tenantId = req.user.tenantId;

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

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }
  }

  if (search) {
    where.OR = [
      { entityName: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
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

  return res.json({
    success: true,
    data: {
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  });
};

/**
 * Get audit log detail (with full old/new values)
 */
export const getAuditLogDetail = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const log = await prisma.auditLog.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    }
  });

  if (!log) {
    return res.status(404).json({
      success: false,
      message: 'Audit log not found'
    });
  }

  return res.json({
    success: true,
    data: log
  });
};

/**
 * Get audit logs for a specific entity (e.g., all logs for User #5)
 */
export const getEntityAuditLogs = async (req, res) => {
  const { entity, entityId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  const tenantId = req.user.tenantId;

  const where = {
    tenantId,
    entity,
    entityId: parseInt(entityId)
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        userEmail: true,
        action: true,
        changes: true,
        createdAt: true
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  return res.json({
    success: true,
    data: {
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  });
};

/**
 * Get available entity types for filtering
 */
export const getEntityTypes = async (req, res) => {
  const tenantId = req.user.tenantId;

  const entities = await prisma.auditLog.findMany({
    where: { tenantId },
    distinct: ['entity'],
    select: { entity: true }
  });

  return res.json({
    success: true,
    data: entities.map(e => e.entity)
  });
};

/**
 * Get audit log statistics
 */
export const getAuditStats = async (req, res) => {
  const tenantId = req.user.tenantId;
  const { startDate, endDate } = req.query;

  const where = { tenantId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }
  }

  // Count by action
  const actionCounts = await prisma.auditLog.groupBy({
    by: ['action'],
    where,
    _count: { id: true }
  });

  // Count by entity
  const entityCounts = await prisma.auditLog.groupBy({
    by: ['entity'],
    where,
    _count: { id: true }
  });

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentActivity = await prisma.auditLog.groupBy({
    by: ['action'],
    where: {
      tenantId,
      createdAt: { gte: sevenDaysAgo }
    },
    _count: { id: true }
  });

  return res.json({
    success: true,
    data: {
      byAction: actionCounts.map(a => ({ action: a.action, count: a._count.id })),
      byEntity: entityCounts.map(e => ({ entity: e.entity, count: e._count.id })),
      recentActivity: recentActivity.map(r => ({ action: r.action, count: r._count.id }))
    }
  });
};

/**
 * Get user activity (all logs by a specific user)
 */
export const getUserActivity = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  const tenantId = req.user.tenantId;

  const where = {
    tenantId,
    userId: parseInt(userId)
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
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

  return res.json({
    success: true,
    data: {
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  });
};
