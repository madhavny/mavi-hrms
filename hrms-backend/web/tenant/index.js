import prisma from '@shared/config/database.js';
import { hashPassword, comparePassword } from '@shared/utilities/password.js';
import jwt from 'jsonwebtoken';
import redis from '@shared/config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tenant-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Tenant User Login
export const login = async (req, res) => {
  const { email, password, tenant: tenantSlug } = req.body;

  // Find tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant || tenant.status !== 'ACTIVE') {
    return res.status(401).json({ success: false, message: 'Invalid tenant or tenant inactive' });
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    include: {
      role: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } }
    }
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  const token = jwt.sign(
    {
      id: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      email: user.email,
      role: user.role.code,
      type: 'tenant_user'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  await redis.set(`tenant:${token}`, 'valid', 'EX', 28800);

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        employeeCode: user.employeeCode,
        role: user.role,
        department: user.department,
        designation: user.designation
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo
      }
    }
  });
};

// Get current user profile
export const getProfile = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      role: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      manager: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });

  return res.json({ success: true, data: user });
};

// List users (for Admin/HR)
export const listUsers = async (req, res) => {
  const { page = 1, limit = 10, search, roleId, departmentId } = req.query;
  const skip = (page - 1) * limit;

  const where = { tenantId: req.user.tenantId };
  if (roleId) where.roleId = parseInt(roleId);
  if (departmentId) where.departmentId = parseInt(departmentId);
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, firstName: true, lastName: true, email: true, employeeCode: true,
        phone: true, isActive: true, dateOfJoining: true,
        role: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } }
      }
    }),
    prisma.user.count({ where })
  ]);

  return res.json({
    success: true,
    data: { users, total, page: parseInt(page), limit: parseInt(limit) }
  });
};

// Create user
export const createUser = async (req, res) => {
  const { email, password, ...userData } = req.body;

  // Check email uniqueness within tenant
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: req.user.tenantId, email } }
  });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      ...userData,
      email,
      password: hashedPassword,
      tenantId: req.user.tenantId,
      createdBy: req.user.id
    },
    include: {
      role: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } }
    }
  });

  return res.status(201).json({ success: true, data: user });
};

// Get roles for tenant
export const getRoles = async (req, res) => {
  const roles = await prisma.role.findMany({
    where: { tenantId: req.user.tenantId, isActive: true },
    select: { id: true, name: true, code: true }
  });

  return res.json({ success: true, data: roles });
};

// Get departments for tenant
export const getDepartments = async (req, res) => {
  const departments = await prisma.department.findMany({
    where: { tenantId: req.user.tenantId, isActive: true },
    select: { id: true, name: true, code: true }
  });

  return res.json({ success: true, data: departments });
};

// Get single user (for Admin/HR/Manager)
export const getUser = async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findFirst({
    where: {
      id: parseInt(id),
      tenantId: req.user.tenantId
    },
    include: {
      role: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      designation: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true, code: true, city: true } },
      manager: { select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true } }
    }
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.json({ success: true, data: user });
};

// Update user (for Admin/HR)
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, password, ...updateData } = req.body;

  // Check user exists in same tenant
  const existingUser = await prisma.user.findFirst({
    where: { id: parseInt(id), tenantId: req.user.tenantId }
  });

  if (!existingUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // If email is being changed, check uniqueness
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: req.user.tenantId, email } }
    });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    updateData.email = email;
  }

  // If password is being changed, hash it
  if (password) {
    updateData.password = await hashPassword(password);
  }

  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      role: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } }
    }
  });

  return res.json({ success: true, data: user });
};

// Delete user (soft - deactivate)
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  await prisma.user.updateMany({
    where: { id: parseInt(id), tenantId: req.user.tenantId },
    data: { isActive: false }
  });

  return res.json({ success: true, message: 'User deactivated' });
};

// Get designations for tenant
export const getDesignations = async (req, res) => {
  const designations = await prisma.designation.findMany({
    where: { tenantId: req.user.tenantId, isActive: true },
    select: { id: true, name: true, code: true, level: true },
    orderBy: { level: 'asc' }
  });

  return res.json({ success: true, data: designations });
};

// Get locations for tenant
export const getLocations = async (req, res) => {
  const locations = await prisma.location.findMany({
    where: { tenantId: req.user.tenantId, isActive: true },
    select: { id: true, name: true, code: true, city: true, state: true }
  });

  return res.json({ success: true, data: locations });
};

// Dashboard stats for tenant
export const getDashboardStats = async (req, res) => {
  const tenantId = req.user.tenantId;

  const [totalUsers, activeUsers, departments] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, isActive: true } }),
    prisma.department.count({ where: { tenantId, isActive: true } })
  ]);

  return res.json({
    success: true,
    data: { totalUsers, activeUsers, departments }
  });
};
