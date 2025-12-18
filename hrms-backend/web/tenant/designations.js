import prisma from '@shared/config/database.js';
import { auditCreate, auditUpdate, auditDelete } from '@shared/utilities/audit.js';

// List all designations
export const listDesignations = async (req, res) => {
  const { includeInactive } = req.query;
  const tenantId = req.user.tenantId;

  const where = { tenantId };
  if (!includeInactive || includeInactive !== 'true') {
    where.isActive = true;
  }

  const designations = await prisma.designation.findMany({
    where,
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  return res.json({
    success: true,
    data: designations.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      level: d.level,
      isActive: d.isActive,
      employeeCount: d._count.users,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }))
  });
};

// Get single designation with details
export const getDesignation = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const designation = await prisma.designation.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      users: {
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true,
          avatar: true,
          department: { select: { id: true, name: true } }
        },
        orderBy: { firstName: 'asc' }
      }
    }
  });

  if (!designation) {
    return res.status(404).json({ success: false, message: 'Designation not found' });
  }

  return res.json({
    success: true,
    data: {
      ...designation,
      employeeCount: designation.users.length
    }
  });
};

// Create designation
export const createDesignation = async (req, res) => {
  const { name, code, level } = req.body;
  const tenantId = req.user.tenantId;

  // Check code uniqueness within tenant
  const existing = await prisma.designation.findFirst({
    where: { tenantId, code: code.toUpperCase() }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Designation code already exists'
    });
  }

  const designation = await prisma.designation.create({
    data: {
      tenantId,
      name,
      code: code.toUpperCase(),
      level: level || 1
    }
  });

  // Audit log
  await auditCreate({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'Designation',
    entityId: designation.id,
    data: { name, code, level },
    req
  });

  return res.status(201).json({
    success: true,
    message: 'Designation created successfully',
    data: designation
  });
};

// Update designation
export const updateDesignation = async (req, res) => {
  const { id } = req.params;
  const { name, code, level, isActive } = req.body;
  const tenantId = req.user.tenantId;

  // Check designation exists
  const existing = await prisma.designation.findFirst({
    where: { id: parseInt(id), tenantId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Designation not found' });
  }

  // If code is being changed, check uniqueness
  if (code && code.toUpperCase() !== existing.code) {
    const codeExists = await prisma.designation.findFirst({
      where: { tenantId, code: code.toUpperCase(), id: { not: parseInt(id) } }
    });
    if (codeExists) {
      return res.status(400).json({
        success: false,
        message: 'Designation code already exists'
      });
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (code !== undefined) updateData.code = code.toUpperCase();
  if (level !== undefined) updateData.level = level;
  if (isActive !== undefined) updateData.isActive = isActive;

  const designation = await prisma.designation.update({
    where: { id: parseInt(id) },
    data: updateData
  });

  // Audit log
  await auditUpdate({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'Designation',
    entityId: designation.id,
    oldData: existing,
    newData: updateData,
    req
  });

  return res.json({
    success: true,
    message: 'Designation updated successfully',
    data: designation
  });
};

// Delete designation
export const deleteDesignation = async (req, res) => {
  const { id } = req.params;
  const { force } = req.query;
  const tenantId = req.user.tenantId;

  const designation = await prisma.designation.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      _count: { select: { users: true } }
    }
  });

  if (!designation) {
    return res.status(404).json({ success: false, message: 'Designation not found' });
  }

  // Check for assigned employees
  if (designation._count.users > 0 && force !== 'true') {
    return res.status(400).json({
      success: false,
      message: `Cannot delete designation with ${designation._count.users} assigned employee(s). Reassign employees first or use force=true to soft delete.`,
      employeeCount: designation._count.users
    });
  }

  // If has employees, soft delete (deactivate)
  if (designation._count.users > 0) {
    await prisma.designation.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    await auditUpdate({
      tenantId,
      userId: req.user.id,
      userEmail: req.user.email,
      entity: 'Designation',
      entityId: designation.id,
      oldData: { isActive: true },
      newData: { isActive: false },
      req
    });

    return res.json({
      success: true,
      message: 'Designation deactivated (soft deleted) due to existing employees'
    });
  }

  // Hard delete if no employees
  await prisma.designation.delete({
    where: { id: parseInt(id) }
  });

  await auditDelete({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'Designation',
    entityId: designation.id,
    data: { name: designation.name, code: designation.code },
    req
  });

  return res.json({
    success: true,
    message: 'Designation deleted successfully'
  });
};
