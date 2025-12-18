import prisma from '@shared/config/database.js';
import { auditCreate, auditUpdate, auditDelete } from '@shared/utilities/audit.js';

// List all departments with hierarchy
export const listDepartments = async (req, res) => {
  const { includeInactive, flat } = req.query;
  const tenantId = req.user.tenantId;

  const where = { tenantId };
  if (!includeInactive || includeInactive !== 'true') {
    where.isActive = true;
  }

  const departments = await prisma.department.findMany({
    where,
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    include: {
      parent: {
        select: { id: true, name: true, code: true }
      },
      _count: {
        select: { users: true, children: true }
      }
    }
  });

  // If flat is requested, return simple list
  if (flat === 'true') {
    return res.json({
      success: true,
      data: departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        parentId: dept.parentId,
        parentName: dept.parent?.name || null,
        headId: dept.headId,
        isActive: dept.isActive,
        employeeCount: dept._count.users,
        childCount: dept._count.children
      }))
    });
  }

  // Build tree structure
  const departmentMap = new Map();
  const rootDepartments = [];

  // First pass: create map of all departments
  for (const dept of departments) {
    departmentMap.set(dept.id, {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      parentId: dept.parentId,
      headId: dept.headId,
      isActive: dept.isActive,
      employeeCount: dept._count.users,
      childCount: dept._count.children,
      children: []
    });
  }

  // Second pass: build tree
  for (const dept of departments) {
    const node = departmentMap.get(dept.id);
    if (dept.parentId && departmentMap.has(dept.parentId)) {
      departmentMap.get(dept.parentId).children.push(node);
    } else {
      rootDepartments.push(node);
    }
  }

  return res.json({
    success: true,
    data: rootDepartments
  });
};

// Get single department with details
export const getDepartment = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const department = await prisma.department.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      parent: {
        select: { id: true, name: true, code: true }
      },
      children: {
        where: { isActive: true },
        select: { id: true, name: true, code: true }
      },
      users: {
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true,
          avatar: true,
          designation: { select: { id: true, name: true } }
        },
        orderBy: { firstName: 'asc' }
      }
    }
  });

  if (!department) {
    return res.status(404).json({ success: false, message: 'Department not found' });
  }

  // Get department head details if headId exists
  let head = null;
  if (department.headId) {
    head = await prisma.user.findUnique({
      where: { id: department.headId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeCode: true,
        avatar: true,
        designation: { select: { id: true, name: true } }
      }
    });
  }

  return res.json({
    success: true,
    data: {
      ...department,
      head,
      employeeCount: department.users.length,
      childCount: department.children.length
    }
  });
};

// Create department
export const createDepartment = async (req, res) => {
  const { name, code, parentId, headId } = req.body;
  const tenantId = req.user.tenantId;

  // Check code uniqueness within tenant
  const existing = await prisma.department.findFirst({
    where: { tenantId, code }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Department code already exists'
    });
  }

  // If parentId provided, verify it exists and belongs to same tenant
  if (parentId) {
    const parentDept = await prisma.department.findFirst({
      where: { id: parentId, tenantId }
    });
    if (!parentDept) {
      return res.status(400).json({
        success: false,
        message: 'Parent department not found'
      });
    }
  }

  // If headId provided, verify user exists and belongs to same tenant
  if (headId) {
    const headUser = await prisma.user.findFirst({
      where: { id: headId, tenantId, isActive: true }
    });
    if (!headUser) {
      return res.status(400).json({
        success: false,
        message: 'Department head user not found'
      });
    }
  }

  const department = await prisma.department.create({
    data: {
      tenantId,
      name,
      code: code.toUpperCase(),
      parentId: parentId || null,
      headId: headId || null
    },
    include: {
      parent: { select: { id: true, name: true, code: true } }
    }
  });

  // Audit log
  await auditCreate({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'Department',
    entityId: department.id,
    data: { name, code, parentId, headId },
    req
  });

  return res.status(201).json({
    success: true,
    message: 'Department created successfully',
    data: department
  });
};

// Update department
export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, code, parentId, headId, isActive } = req.body;
  const tenantId = req.user.tenantId;

  // Check department exists
  const existing = await prisma.department.findFirst({
    where: { id: parseInt(id), tenantId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Department not found' });
  }

  // If code is being changed, check uniqueness
  if (code && code !== existing.code) {
    const codeExists = await prisma.department.findFirst({
      where: { tenantId, code, id: { not: parseInt(id) } }
    });
    if (codeExists) {
      return res.status(400).json({
        success: false,
        message: 'Department code already exists'
      });
    }
  }

  // Prevent setting self as parent
  if (parentId === parseInt(id)) {
    return res.status(400).json({
      success: false,
      message: 'Department cannot be its own parent'
    });
  }

  // If parentId provided, verify it exists and check for circular reference
  if (parentId) {
    const parentDept = await prisma.department.findFirst({
      where: { id: parentId, tenantId }
    });
    if (!parentDept) {
      return res.status(400).json({
        success: false,
        message: 'Parent department not found'
      });
    }

    // Check for circular reference (is the new parent a descendant of this department?)
    const isCircular = await checkCircularReference(parseInt(id), parentId, tenantId);
    if (isCircular) {
      return res.status(400).json({
        success: false,
        message: 'Cannot set parent: would create circular reference'
      });
    }
  }

  // If headId provided, verify user exists
  if (headId) {
    const headUser = await prisma.user.findFirst({
      where: { id: headId, tenantId, isActive: true }
    });
    if (!headUser) {
      return res.status(400).json({
        success: false,
        message: 'Department head user not found'
      });
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (code !== undefined) updateData.code = code.toUpperCase();
  if (parentId !== undefined) updateData.parentId = parentId || null;
  if (headId !== undefined) updateData.headId = headId || null;
  if (isActive !== undefined) updateData.isActive = isActive;

  const department = await prisma.department.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      parent: { select: { id: true, name: true, code: true } }
    }
  });

  // Audit log
  await auditUpdate({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'Department',
    entityId: department.id,
    oldData: existing,
    newData: updateData,
    req
  });

  return res.json({
    success: true,
    message: 'Department updated successfully',
    data: department
  });
};

// Delete department
export const deleteDepartment = async (req, res) => {
  const { id } = req.params;
  const { force } = req.query;
  const tenantId = req.user.tenantId;

  const department = await prisma.department.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      _count: { select: { users: true, children: true } }
    }
  });

  if (!department) {
    return res.status(404).json({ success: false, message: 'Department not found' });
  }

  // Check for assigned employees
  if (department._count.users > 0 && force !== 'true') {
    return res.status(400).json({
      success: false,
      message: `Cannot delete department with ${department._count.users} assigned employee(s). Reassign employees first or use force=true to soft delete.`,
      employeeCount: department._count.users
    });
  }

  // Check for child departments
  if (department._count.children > 0 && force !== 'true') {
    return res.status(400).json({
      success: false,
      message: `Cannot delete department with ${department._count.children} child department(s). Delete or reassign child departments first or use force=true to soft delete.`,
      childCount: department._count.children
    });
  }

  // If has dependencies, soft delete (deactivate)
  if (department._count.users > 0 || department._count.children > 0) {
    await prisma.department.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    await auditUpdate({
      tenantId,
      userId: req.user.id,
      userEmail: req.user.email,
      entity: 'Department',
      entityId: department.id,
      oldData: { isActive: true },
      newData: { isActive: false },
      req
    });

    return res.json({
      success: true,
      message: 'Department deactivated (soft deleted) due to existing dependencies'
    });
  }

  // Hard delete if no dependencies
  await prisma.department.delete({
    where: { id: parseInt(id) }
  });

  await auditDelete({
    tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'Department',
    entityId: department.id,
    data: { name: department.name, code: department.code },
    req
  });

  return res.json({
    success: true,
    message: 'Department deleted successfully'
  });
};

// Helper: Check for circular reference in hierarchy
async function checkCircularReference(departmentId, newParentId, tenantId) {
  let currentId = newParentId;
  const visited = new Set();

  while (currentId) {
    if (currentId === departmentId) {
      return true; // Circular reference detected
    }
    if (visited.has(currentId)) {
      return false; // Already visited, no circular ref through this path
    }
    visited.add(currentId);

    const dept = await prisma.department.findFirst({
      where: { id: currentId, tenantId },
      select: { parentId: true }
    });

    currentId = dept?.parentId;
  }

  return false;
}

// Get employees for department head selection
export const getEmployeesForHead = async (req, res) => {
  const tenantId = req.user.tenantId;

  const employees = await prisma.user.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      employeeCode: true,
      avatar: true,
      designation: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } }
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
  });

  return res.json({
    success: true,
    data: employees
  });
};
