import prisma from '@shared/config/database.js';
import { createAuditLog } from '@shared/utilities/audit.js';

// ==================== HELPER FUNCTIONS ====================

/**
 * Get the start and end dates for a given week
 */
function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const startOfWeek = new Date(d.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { startOfWeek, endOfWeek };
}

/**
 * Calculate total hours for a project
 */
async function getProjectTotalHours(projectId) {
  const result = await prisma.timeLog.aggregate({
    where: { projectId, status: { in: ['SUBMITTED', 'APPROVED'] } },
    _sum: { hours: true },
  });
  return result._sum.hours || 0;
}

// ==================== PROJECTS ====================

export async function listProjects(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const userRole = req.user.role?.code;

  const { status, myProjects = 'false', page = 1, limit = 20 } = req.query;

  const where = { tenantId, isActive: true };
  if (status) where.status = status;

  // Non-admin users can only see projects they're members of
  if (myProjects === 'true' || (userRole !== 'ADMIN' && userRole !== 'HR')) {
    where.members = { some: { userId } };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true, timeLogs: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
          take: 5,
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  // Calculate total logged hours for each project
  const projectsWithHours = await Promise.all(
    projects.map(async (p) => {
      const totalHours = await getProjectTotalHours(p.id);
      return { ...p, totalHours };
    })
  );

  res.json({
    success: true,
    data: projectsWithHours,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getProject(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      members: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
      },
      timeLogs: {
        orderBy: { date: 'desc' },
        take: 20,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const totalHours = await getProjectTotalHours(project.id);

  res.json({ success: true, data: { ...project, totalHours } });
}

export async function createProject(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const { name, code, description, clientName, startDate, endDate, budgetHours, memberIds = [] } = req.body;

  if (!name || !code || !startDate) {
    return res.status(400).json({ success: false, message: 'Name, code, and start date are required' });
  }

  // Check for duplicate code
  const existing = await prisma.project.findFirst({
    where: { tenantId, code },
  });

  if (existing) {
    return res.status(400).json({ success: false, message: 'Project code already exists' });
  }

  const project = await prisma.project.create({
    data: {
      tenantId,
      name,
      code: code.toUpperCase(),
      description,
      clientName,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      budgetHours: budgetHours ? parseFloat(budgetHours) : null,
      status: 'ACTIVE',
      createdBy: userId,
      members: {
        create: [
          { userId, role: 'LEAD' }, // Creator is the lead
          ...memberIds.filter((id) => id !== userId).map((id) => ({ userId: id, role: 'MEMBER' })),
        ],
      },
    },
    include: {
      members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'Project',
    entityId: project.id,
    newValues: project,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: project });
}

export async function updateProject(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.project.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const { name, description, clientName, startDate, endDate, budgetHours, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (clientName !== undefined) updateData.clientName = clientName;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
  if (budgetHours !== undefined) updateData.budgetHours = budgetHours ? parseFloat(budgetHours) : null;
  if (status !== undefined) updateData.status = status;

  const project = await prisma.project.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'Project',
    entityId: project.id,
    oldValues: existing,
    newValues: project,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: project });
}

export async function deleteProject(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  await prisma.project.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'DELETE',
    entityType: 'Project',
    entityId: project.id,
    oldValues: project,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Project deleted' });
}

// ==================== PROJECT MEMBERS ====================

export async function addProjectMember(req, res) {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { userId, role = 'MEMBER', hourlyRate } = req.body;

  const project = await prisma.project.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: parseInt(id), userId: parseInt(userId) } },
    update: { role, hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null, leftAt: null },
    create: {
      projectId: parseInt(id),
      userId: parseInt(userId),
      role,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });

  res.json({ success: true, data: member });
}

export async function removeProjectMember(req, res) {
  const tenantId = req.user.tenantId;
  const { id, userId } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId: parseInt(id), userId: parseInt(userId) } },
    data: { leftAt: new Date() },
  });

  res.json({ success: true, message: 'Member removed from project' });
}

// ==================== TIME LOGS ====================

export async function listTimeLogs(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const userRole = req.user.role?.code;

  const { projectId, startDate, endDate, status, myLogs = 'false', toApprove = 'false', page = 1, limit = 50 } = req.query;

  const where = { tenantId };

  if (projectId) where.projectId = parseInt(projectId);
  if (status) where.status = status;

  // Date range filter
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  // Filter based on role and params
  if (myLogs === 'true') {
    where.userId = userId;
  } else if (toApprove === 'true') {
    // Manager sees pending logs from their reportees
    const reportees = await prisma.user.findMany({
      where: { tenantId, reportingTo: userId },
      select: { id: true },
    });
    where.userId = { in: reportees.map((r) => r.id) };
    where.status = 'SUBMITTED';
  } else if (userRole === 'EMPLOYEE') {
    where.userId = userId;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.timeLog.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        project: { select: { id: true, name: true, code: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.timeLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}

export async function getWeeklyTimesheet(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { weekOf, targetUserId } = req.query;

  // Use specified week or current week
  const targetDate = weekOf ? new Date(weekOf) : new Date();
  const { startOfWeek, endOfWeek } = getWeekDates(targetDate);

  // Get user's projects
  const memberProjects = await prisma.projectMember.findMany({
    where: { userId: targetUserId ? parseInt(targetUserId) : userId, leftAt: null },
    include: { project: { select: { id: true, name: true, code: true, status: true } } },
  });

  const activeProjects = memberProjects
    .filter((m) => m.project.status === 'ACTIVE')
    .map((m) => m.project);

  // Get time logs for the week
  const logs = await prisma.timeLog.findMany({
    where: {
      tenantId,
      userId: targetUserId ? parseInt(targetUserId) : userId,
      date: { gte: startOfWeek, lte: endOfWeek },
    },
    orderBy: { date: 'asc' },
    include: { project: { select: { id: true, name: true, code: true } } },
  });

  // Build weekly data structure
  const weekDays = [];
  const currentDate = new Date(startOfWeek);
  while (currentDate <= endOfWeek) {
    weekDays.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group logs by date and project
  const logsMap = {};
  logs.forEach((log) => {
    const dateKey = log.date.toISOString().split('T')[0];
    if (!logsMap[dateKey]) logsMap[dateKey] = {};
    logsMap[dateKey][log.projectId || 'no-project'] = log;
  });

  // Calculate totals
  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const submittedHours = logs.filter((l) => l.status !== 'DRAFT').reduce((sum, log) => sum + log.hours, 0);

  res.json({
    success: true,
    data: {
      weekOf: startOfWeek.toISOString().split('T')[0],
      weekDays: weekDays.map((d) => d.toISOString().split('T')[0]),
      projects: activeProjects,
      logs,
      logsMap,
      totalHours,
      submittedHours,
    },
  });
}

export async function createTimeLog(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  const { projectId, date, hours, description, isBillable = true } = req.body;

  if (!date || !hours) {
    return res.status(400).json({ success: false, message: 'Date and hours are required' });
  }

  if (hours <= 0 || hours > 24) {
    return res.status(400).json({ success: false, message: 'Hours must be between 0 and 24' });
  }

  // Check if log already exists for this date/project
  const existing = await prisma.timeLog.findFirst({
    where: {
      tenantId,
      userId,
      date: new Date(date),
      projectId: projectId ? parseInt(projectId) : null,
    },
  });

  if (existing) {
    // Update existing log
    const log = await prisma.timeLog.update({
      where: { id: existing.id },
      data: { hours: parseFloat(hours), description, isBillable },
      include: { project: { select: { id: true, name: true, code: true } } },
    });
    return res.json({ success: true, data: log });
  }

  const log = await prisma.timeLog.create({
    data: {
      tenantId,
      userId,
      projectId: projectId ? parseInt(projectId) : null,
      date: new Date(date),
      hours: parseFloat(hours),
      description,
      isBillable,
      status: 'DRAFT',
    },
    include: { project: { select: { id: true, name: true, code: true } } },
  });

  res.status(201).json({ success: true, data: log });
}

export async function updateTimeLog(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const log = await prisma.timeLog.findFirst({
    where: { id: parseInt(id), tenantId, userId },
  });

  if (!log) {
    return res.status(404).json({ success: false, message: 'Time log not found' });
  }

  if (log.status !== 'DRAFT') {
    return res.status(400).json({ success: false, message: 'Can only edit draft time logs' });
  }

  const { hours, description, isBillable, projectId } = req.body;

  const updateData = {};
  if (hours !== undefined) updateData.hours = parseFloat(hours);
  if (description !== undefined) updateData.description = description;
  if (isBillable !== undefined) updateData.isBillable = isBillable;
  if (projectId !== undefined) updateData.projectId = projectId ? parseInt(projectId) : null;

  const updated = await prisma.timeLog.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: { project: { select: { id: true, name: true, code: true } } },
  });

  res.json({ success: true, data: updated });
}

export async function deleteTimeLog(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { id } = req.params;

  const log = await prisma.timeLog.findFirst({
    where: { id: parseInt(id), tenantId, userId },
  });

  if (!log) {
    return res.status(404).json({ success: false, message: 'Time log not found' });
  }

  if (log.status !== 'DRAFT') {
    return res.status(400).json({ success: false, message: 'Can only delete draft time logs' });
  }

  await prisma.timeLog.delete({ where: { id: parseInt(id) } });

  res.json({ success: true, message: 'Time log deleted' });
}

// ==================== TIMESHEET SUBMISSION & APPROVAL ====================

export async function submitTimesheet(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { weekOf } = req.body;

  const targetDate = weekOf ? new Date(weekOf) : new Date();
  const { startOfWeek, endOfWeek } = getWeekDates(targetDate);

  // Get all draft logs for the week
  const draftLogs = await prisma.timeLog.findMany({
    where: {
      tenantId,
      userId,
      date: { gte: startOfWeek, lte: endOfWeek },
      status: 'DRAFT',
    },
  });

  if (draftLogs.length === 0) {
    return res.status(400).json({ success: false, message: 'No draft time logs to submit' });
  }

  // Submit all draft logs
  await prisma.timeLog.updateMany({
    where: { id: { in: draftLogs.map((l) => l.id) } },
    data: { status: 'SUBMITTED' },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'TimeLog',
    entityId: 0,
    newValues: { action: 'SUBMIT_TIMESHEET', weekOf: startOfWeek.toISOString(), count: draftLogs.length },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: `Submitted ${draftLogs.length} time entries for approval`,
    submittedCount: draftLogs.length,
  });
}

export async function approveTimeLogs(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { logIds } = req.body;

  if (!logIds || logIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No log IDs provided' });
  }

  // Verify all logs exist and are submitted
  const logs = await prisma.timeLog.findMany({
    where: { id: { in: logIds }, tenantId, status: 'SUBMITTED' },
  });

  if (logs.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid logs to approve' });
  }

  // Approve all logs
  await prisma.timeLog.updateMany({
    where: { id: { in: logs.map((l) => l.id) } },
    data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'TimeLog',
    entityId: 0,
    newValues: { action: 'APPROVE_TIMELOGS', count: logs.length },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: `Approved ${logs.length} time entries`, approvedCount: logs.length });
}

export async function rejectTimeLogs(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { logIds, reason } = req.body;

  if (!logIds || logIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No log IDs provided' });
  }

  // Verify all logs exist and are submitted
  const logs = await prisma.timeLog.findMany({
    where: { id: { in: logIds }, tenantId, status: 'SUBMITTED' },
  });

  if (logs.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid logs to reject' });
  }

  // Reject all logs (back to DRAFT so user can edit)
  await prisma.timeLog.updateMany({
    where: { id: { in: logs.map((l) => l.id) } },
    data: { status: 'REJECTED', rejectedReason: reason || null },
  });

  res.json({ success: true, message: `Rejected ${logs.length} time entries`, rejectedCount: logs.length });
}

// ==================== STATS ====================

export async function getTimesheetStats(req, res) {
  const tenantId = req.user.tenantId;
  const userId = req.user.id;
  const { weekOf } = req.query;

  const targetDate = weekOf ? new Date(weekOf) : new Date();
  const { startOfWeek, endOfWeek } = getWeekDates(targetDate);

  // Get logs for current week
  const weekLogs = await prisma.timeLog.findMany({
    where: {
      tenantId,
      userId,
      date: { gte: startOfWeek, lte: endOfWeek },
    },
  });

  // Calculate stats
  const totalHours = weekLogs.reduce((sum, l) => sum + l.hours, 0);
  const draftHours = weekLogs.filter((l) => l.status === 'DRAFT').reduce((sum, l) => sum + l.hours, 0);
  const submittedHours = weekLogs.filter((l) => l.status === 'SUBMITTED').reduce((sum, l) => sum + l.hours, 0);
  const approvedHours = weekLogs.filter((l) => l.status === 'APPROVED').reduce((sum, l) => sum + l.hours, 0);
  const billableHours = weekLogs.filter((l) => l.isBillable).reduce((sum, l) => sum + l.hours, 0);

  // Get projects count
  const projectIds = [...new Set(weekLogs.filter((l) => l.projectId).map((l) => l.projectId))];

  res.json({
    success: true,
    data: {
      weekOf: startOfWeek.toISOString().split('T')[0],
      totalHours,
      draftHours,
      submittedHours,
      approvedHours,
      billableHours,
      projectsWorkedOn: projectIds.length,
      entriesCount: weekLogs.length,
    },
  });
}
