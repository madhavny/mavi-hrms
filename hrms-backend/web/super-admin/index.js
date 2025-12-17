import prisma from '@shared/config/database.js';
import { hashPassword, comparePassword } from '@shared/utilities/password.js';
import jwt from 'jsonwebtoken';
import redis from '@shared/config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-admin-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Super Admin Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  const admin = await prisma.superAdmin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isValid = await comparePassword(password, admin.password);
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, type: 'super_admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  await redis.set(`superadmin:${token}`, 'valid', 'EX', 28800);

  return res.json({
    success: true,
    data: {
      token,
      user: { id: admin.id, name: admin.name, email: admin.email }
    }
  });
};

// Create Tenant with Admin User
export const createTenant = async (req, res) => {
  const {
    name, slug, email, phone, address, city, state, country, pincode,
    subscriptionPlan, enabledModules,
    adminEmail, adminPassword, adminFirstName, adminLastName
  } = req.body;

  // Check slug uniqueness
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Slug already exists' });
  }

  const hashedPassword = await hashPassword(adminPassword);

  // Create tenant with default roles and admin user in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name, slug, email, phone, address, city, state, country, pincode,
        subscriptionPlan,
        enabledModules: enabledModules || [],
        createdBy: req.superAdmin.id
      }
    });

    // Create default roles
    const roles = await Promise.all([
      tx.role.create({ data: { tenantId: tenant.id, name: 'Admin', code: 'ADMIN', isSystem: true } }),
      tx.role.create({ data: { tenantId: tenant.id, name: 'HR', code: 'HR', isSystem: true } }),
      tx.role.create({ data: { tenantId: tenant.id, name: 'Manager', code: 'MANAGER', isSystem: true } }),
      tx.role.create({ data: { tenantId: tenant.id, name: 'Employee', code: 'EMPLOYEE', isSystem: true } }),
    ]);

    const adminRole = roles.find(r => r.code === 'ADMIN');

    // Create admin user (no plain password stored for security)
    const adminUser = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        password: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName || '',
        roleId: adminRole.id,
        employeeCode: 'ADMIN001'
      }
    });

    return { tenant, adminUser };
  });

  // Return plain password ONLY in the creation response (one-time display)
  return res.status(201).json({
    success: true,
    data: {
      tenant: result.tenant,
      adminUser: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        firstName: adminFirstName,
        lastName: adminLastName || ''
      },
      // One-time password display - not stored in database
      credentials: {
        email: adminEmail,
        password: adminPassword,
        loginUrl: `/${slug}/login`,
        warning: 'Save these credentials now. The password cannot be retrieved later.'
      }
    }
  });
};

// List all tenants
export const listTenants = async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const skip = (page - 1) * limit;

  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } }
    }),
    prisma.tenant.count({ where })
  ]);

  return res.json({
    success: true,
    data: { tenants, total, page: parseInt(page), limit: parseInt(limit) }
  });
};

// Get single tenant with admin credentials
export const getTenant = async (req, res) => {
  const { id } = req.params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: parseInt(id) },
    include: {
      _count: { select: { users: true, departments: true, locations: true } },
      roles: { select: { id: true, name: true, code: true } }
    }
  });

  if (!tenant) {
    return res.status(404).json({ success: false, message: 'Tenant not found' });
  }

  // Get admin users (no passwords returned for security)
  const adminUsers = await prisma.user.findMany({
    where: {
      tenantId: parseInt(id),
      role: { code: 'ADMIN' }
    },
    select: { id: true, email: true, firstName: true, lastName: true, employeeCode: true, createdAt: true }
  });

  return res.json({ success: true, data: { ...tenant, adminUsers } });
};

// Update tenant
export const updateTenant = async (req, res) => {
  const { id } = req.params;

  const tenant = await prisma.tenant.update({
    where: { id: parseInt(id) },
    data: req.body
  });

  return res.json({ success: true, data: tenant });
};

// Change tenant status
export const changeTenantStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TRIAL'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const tenant = await prisma.tenant.update({
    where: { id: parseInt(id) },
    data: { status }
  });

  return res.json({ success: true, data: tenant, message: `Tenant ${status.toLowerCase()}` });
};

// Delete tenant (soft - set to INACTIVE)
export const deleteTenant = async (req, res) => {
  const { id } = req.params;

  await prisma.tenant.update({
    where: { id: parseInt(id) },
    data: { status: 'INACTIVE' }
  });

  return res.json({ success: true, message: 'Tenant deactivated' });
};

// Permanently delete tenant
export const permanentlyDeleteTenant = async (req, res) => {
  const { id } = req.params;

  await prisma.tenant.delete({
    where: { id: parseInt(id) }
  });

  return res.json({ success: true, message: 'Tenant permanently deleted' });
};

// Dashboard stats
export const getDashboardStats = async (req, res) => {
  const [totalTenants, activeTenants, totalUsers] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count()
  ]);

  return res.json({
    success: true,
    data: { totalTenants, activeTenants, totalUsers }
  });
};
