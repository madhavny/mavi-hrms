import prisma from '@shared/config/database.js';
import { auditCreate, auditUpdate, auditDelete } from '@shared/utilities/audit.js';

/**
 * List all roles for the tenant
 * GET /tenant/roles/manage
 */
export const listRoles = async (req, res) => {
  const { includeInactive } = req.query;
  const tenantId = req.user.tenantId;

  const where = { tenantId };

  if (!includeInactive || includeInactive !== 'true') {
    where.isActive = true;
  }

  const roles = await prisma.role.findMany({
    where,
    orderBy: [
      { isSystem: 'desc' }, // System roles first
      { name: 'asc' }
    ],
    include: {
      _count: {
        select: {
          users: true,
          permissions: true
        }
      }
    }
  });

  const transformedRoles = roles.map(role => ({
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    userCount: role._count.users,
    permissionCount: role._count.permissions,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  }));

  res.json({
    success: true,
    data: {
      roles: transformedRoles,
      total: transformedRoles.length
    }
  });
};

/**
 * Get a single role with permissions
 * GET /tenant/roles/manage/:id
 */
export const getRole = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const role = await prisma.role.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    },
    include: {
      _count: {
        select: { users: true }
      },
      permissions: {
        include: {
          permission: true
        }
      },
      users: {
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true
        },
        take: 10
      }
    }
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // Group permissions by module
  const permissionsByModule = {};
  role.permissions.forEach(rp => {
    const { module, action, description } = rp.permission;
    if (!permissionsByModule[module]) {
      permissionsByModule[module] = [];
    }
    permissionsByModule[module].push({
      id: rp.permission.id,
      action,
      description
    });
  });

  res.json({
    success: true,
    data: {
      role: {
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        isSystem: role.isSystem,
        isActive: role.isActive,
        userCount: role._count.users,
        permissionCount: role.permissions.length,
        permissions: role.permissions.map(rp => ({
          id: rp.permission.id,
          module: rp.permission.module,
          action: rp.permission.action,
          description: rp.permission.description
        })),
        permissionsByModule,
        users: role.users,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }
    }
  });
};

/**
 * Create a new role
 * POST /tenant/roles/manage
 */
export const createRole = async (req, res) => {
  const { name, code, description, permissionIds } = req.body;
  const tenantId = req.user.tenantId;

  // Check if code already exists
  const existingRole = await prisma.role.findFirst({
    where: {
      tenantId,
      code: code.toUpperCase()
    }
  });

  if (existingRole) {
    return res.status(400).json({
      success: false,
      message: `Role with code "${code}" already exists`
    });
  }

  // Create role with permissions in a transaction
  const role = await prisma.$transaction(async (tx) => {
    const newRole = await tx.role.create({
      data: {
        tenantId,
        name,
        code: code.toUpperCase(),
        description: description || null,
        isSystem: false,
        isActive: true
      }
    });

    // Add permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: newRole.id,
          permissionId
        }))
      });
    }

    return newRole;
  });

  // Fetch the created role with counts
  const createdRole = await prisma.role.findUnique({
    where: { id: role.id },
    include: {
      _count: {
        select: { permissions: true }
      }
    }
  });

  await auditCreate(req, 'Role', role.id, role.name, role);

  res.status(201).json({
    success: true,
    message: 'Role created successfully',
    data: {
      role: {
        ...createdRole,
        permissionCount: createdRole._count.permissions
      }
    }
  });
};

/**
 * Update a role
 * PATCH /tenant/roles/manage/:id
 */
export const updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, code, description, isActive } = req.body;
  const tenantId = req.user.tenantId;

  const existingRole = await prisma.role.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    }
  });

  if (!existingRole) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // System roles have restricted updates
  if (existingRole.isSystem) {
    if (code && code.toUpperCase() !== existingRole.code) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change code of system role'
      });
    }
    if (isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate system role'
      });
    }
  }

  // Check code uniqueness if changing
  if (code && code.toUpperCase() !== existingRole.code) {
    const codeExists = await prisma.role.findFirst({
      where: {
        tenantId,
        code: code.toUpperCase(),
        id: { not: parseInt(id) }
      }
    });

    if (codeExists) {
      return res.status(400).json({
        success: false,
        message: `Role with code "${code}" already exists`
      });
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (code !== undefined) updateData.code = code.toUpperCase();
  if (description !== undefined) updateData.description = description || null;
  if (isActive !== undefined && !existingRole.isSystem) updateData.isActive = isActive;

  const role = await prisma.role.update({
    where: { id: parseInt(id) },
    data: updateData
  });

  await auditUpdate(req, 'Role', role.id, role.name, existingRole, role);

  res.json({
    success: true,
    message: 'Role updated successfully',
    data: { role }
  });
};

/**
 * Delete a role
 * DELETE /tenant/roles/manage/:id
 */
export const deleteRole = async (req, res) => {
  const { id } = req.params;
  const { force } = req.query;
  const tenantId = req.user.tenantId;

  const role = await prisma.role.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // Cannot delete system roles
  if (role.isSystem) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete system role "${role.name}". System roles are protected.`
    });
  }

  // Check if role has users
  if (role._count.users > 0 && force !== 'true') {
    return res.status(400).json({
      success: false,
      message: `Cannot delete role "${role.name}" because it has ${role._count.users} user(s) assigned. Reassign users first or use force=true to deactivate instead.`,
      data: {
        userCount: role._count.users,
        suggestion: 'deactivate'
      }
    });
  }

  // Deactivate if has users and force=true
  if (role._count.users > 0 && force === 'true') {
    const deactivatedRole = await prisma.role.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    await auditUpdate(req, 'Role', role.id, role.name, role, deactivatedRole);

    return res.json({
      success: true,
      message: `Role "${role.name}" has been deactivated (has ${role._count.users} users)`,
      data: { role: deactivatedRole, action: 'deactivated' }
    });
  }

  // Hard delete
  await prisma.role.delete({
    where: { id: parseInt(id) }
  });

  await auditDelete(req, 'Role', role.id, role.name, role);

  res.json({
    success: true,
    message: `Role "${role.name}" deleted successfully`
  });
};

/**
 * Get all available permissions (grouped by module)
 * GET /tenant/permissions
 */
export const listPermissions = async (req, res) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [
      { module: 'asc' },
      { action: 'asc' }
    ]
  });

  // Group by module
  const permissionsByModule = {};
  permissions.forEach(p => {
    if (!permissionsByModule[p.module]) {
      permissionsByModule[p.module] = [];
    }
    permissionsByModule[p.module].push({
      id: p.id,
      action: p.action,
      description: p.description
    });
  });

  res.json({
    success: true,
    data: {
      permissions,
      permissionsByModule,
      total: permissions.length
    }
  });
};

/**
 * Update role permissions
 * PUT /tenant/roles/manage/:id/permissions
 */
export const updateRolePermissions = async (req, res) => {
  const { id } = req.params;
  const { permissionIds } = req.body;
  const tenantId = req.user.tenantId;

  const role = await prisma.role.findFirst({
    where: {
      id: parseInt(id),
      tenantId
    }
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }

  // Get current permissions for audit
  const currentPermissions = await prisma.rolePermission.findMany({
    where: { roleId: parseInt(id) },
    include: { permission: true }
  });

  // Replace all permissions in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing permissions
    await tx.rolePermission.deleteMany({
      where: { roleId: parseInt(id) }
    });

    // Add new permissions
    if (permissionIds && permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: parseInt(id),
          permissionId
        }))
      });
    }
  });

  // Get updated role with permissions
  const updatedRole = await prisma.role.findUnique({
    where: { id: parseInt(id) },
    include: {
      permissions: {
        include: { permission: true }
      },
      _count: {
        select: { permissions: true }
      }
    }
  });

  await auditUpdate(req, 'Role', role.id, `${role.name} permissions`,
    { permissions: currentPermissions.map(p => p.permission.module + ':' + p.permission.action) },
    { permissions: updatedRole.permissions.map(p => p.permission.module + ':' + p.permission.action) }
  );

  res.json({
    success: true,
    message: 'Role permissions updated successfully',
    data: {
      role: {
        id: updatedRole.id,
        name: updatedRole.name,
        permissionCount: updatedRole._count.permissions,
        permissions: updatedRole.permissions.map(rp => ({
          id: rp.permission.id,
          module: rp.permission.module,
          action: rp.permission.action
        }))
      }
    }
  });
};
