import prisma from '@shared/config/database.js';
import { hashPassword, comparePassword } from '@shared/utilities/password.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import redis from '@shared/config/redis.js';
import { auditLogin, auditLoginFailed, auditCreate, auditUpdate, auditDelete, auditPasswordReset } from '@shared/utilities/audit.js';
import { sendEmail, emailTemplates } from '@shared/utilities/email.js';
import { deleteFile } from '@shared/middlewares/upload.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tenant-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Tenant User Login
export const login = async (req, res) => {
  const { email, password, tenant: tenantSlug } = req.body;

  // Find tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant || tenant.status !== 'ACTIVE') {
    await auditLoginFailed({ tenantId: tenant?.id, userEmail: email, reason: 'Invalid tenant or tenant inactive', req });
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
    await auditLoginFailed({ tenantId: tenant.id, userEmail: email, reason: 'Invalid credentials or user inactive', req });
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    await auditLoginFailed({ tenantId: tenant.id, userEmail: email, reason: 'Invalid password', req });
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

  // Log successful login
  await auditLogin({ tenantId: tenant.id, userId: user.id, userEmail: user.email, req });

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
        avatar: user.avatar,
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
        phone: true, avatar: true, isActive: true, dateOfJoining: true,
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

  // Log user creation
  await auditCreate({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'User',
    entityId: user.id,
    data: { ...userData, email },
    req
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

  // Log user update
  await auditUpdate({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'User',
    entityId: user.id,
    oldData: existingUser,
    newData: { ...updateData, email },
    req
  });

  return res.json({ success: true, data: user });
};

// Delete user (soft - deactivate)
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  // Get user before deactivating for audit log
  const user = await prisma.user.findFirst({
    where: { id: parseInt(id), tenantId: req.user.tenantId }
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  await prisma.user.updateMany({
    where: { id: parseInt(id), tenantId: req.user.tenantId },
    data: { isActive: false }
  });

  // Log user deactivation (soft delete)
  await auditDelete({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'User',
    entityId: parseInt(id),
    data: { firstName: user.firstName, lastName: user.lastName, email: user.email },
    req
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

// ==================== PASSWORD RESET ====================

const RESET_TOKEN_EXPIRY_MINUTES = 60; // 1 hour

// Generate secure random token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash token for storage (don't store plain tokens)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Request password reset (Forgot Password)
export const forgotPassword = async (req, res) => {
  const { email, tenant: tenantSlug } = req.body;

  // Find tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant || tenant.status !== 'ACTIVE') {
    // Don't reveal if tenant exists or not
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.'
    });
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } }
  });

  if (!user || !user.isActive) {
    // Don't reveal if user exists or not (security)
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.'
    });
  }

  // Invalidate any existing tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    data: { usedAt: new Date() } // Mark as used (invalidated)
  });

  // Generate new token
  const plainToken = generateResetToken();
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Save token to database
  await prisma.passwordResetToken.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      token: hashedToken,
      expiresAt
    }
  });

  // Build reset URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/${tenant.slug}/reset-password?token=${plainToken}`;

  // Send email
  try {
    const emailContent = emailTemplates.passwordReset({
      resetUrl,
      userName: user.firstName,
      tenantName: tenant.name,
      expiryMinutes: RESET_TOKEN_EXPIRY_MINUTES
    });

    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html
    });

    console.log(`Password reset email sent to ${user.email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    // Don't fail the request - token is still valid
  }

  return res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent.'
  });
};

// Verify reset token (check if valid before showing reset form)
export const verifyResetToken = async (req, res) => {
  const { token, tenant: tenantSlug } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  // Find tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant || tenant.status !== 'ACTIVE') {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  // Hash the token to compare with stored hash
  const hashedToken = hashToken(token);

  // Find valid token
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tenantId: tenant.id,
      token: hashedToken,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        select: { id: true, email: true, firstName: true }
      }
    }
  });

  if (!resetToken) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  return res.json({
    success: true,
    data: {
      email: resetToken.user.email,
      firstName: resetToken.user.firstName
    }
  });
};

// Reset password with token
export const resetPassword = async (req, res) => {
  const { token, password, tenant: tenantSlug } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }

  // Find tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant || tenant.status !== 'ACTIVE') {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  // Hash the token to compare with stored hash
  const hashedToken = hashToken(token);

  // Find valid token
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tenantId: tenant.id,
      token: hashedToken,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        select: { id: true, email: true, firstName: true }
      }
    }
  });

  if (!resetToken) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  // Hash new password
  const hashedPassword = await hashPassword(password);

  // Update password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    })
  ]);

  // Log password reset
  await auditPasswordReset({
    tenantId: tenant.id,
    userId: resetToken.userId,
    userEmail: resetToken.user.email,
    req
  });

  // Send confirmation email
  try {
    const emailContent = emailTemplates.passwordResetSuccess({
      userName: resetToken.user.firstName,
      tenantName: tenant.name
    });

    await sendEmail({
      to: resetToken.user.email,
      subject: emailContent.subject,
      html: emailContent.html
    });
  } catch (error) {
    console.error('Failed to send password reset confirmation email:', error);
  }

  return res.json({
    success: true,
    message: 'Password has been reset successfully. You can now log in with your new password.'
  });
};

// ==================== AVATAR UPLOAD ====================

// Upload avatar
export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const userId = req.user.id;

  // Get current user to check for existing avatar
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true }
  });

  // Delete old avatar file if exists
  if (currentUser?.avatar) {
    try {
      await deleteFile(currentUser.avatar);
    } catch (err) {
      console.error('Failed to delete old avatar:', err);
    }
  }

  // Store relative path for the avatar
  const avatarPath = `uploads/avatars/${req.file.filename}`;

  // Update user with new avatar path
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarPath },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true
    }
  });

  // Log avatar update
  await auditUpdate({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'User',
    entityId: userId,
    oldData: { avatar: currentUser?.avatar },
    newData: { avatar: avatarPath },
    req
  });

  return res.json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: {
      avatar: avatarPath,
      avatarUrl: `/${avatarPath}`
    }
  });
};

// Delete avatar
export const deleteAvatar = async (req, res) => {
  const userId = req.user.id;

  // Get current user to check for existing avatar
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true }
  });

  if (!currentUser?.avatar) {
    return res.status(400).json({ success: false, message: 'No avatar to delete' });
  }

  // Delete avatar file
  try {
    await deleteFile(currentUser.avatar);
  } catch (err) {
    console.error('Failed to delete avatar file:', err);
  }

  // Clear avatar path in database
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null }
  });

  // Log avatar deletion
  await auditUpdate({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    userEmail: req.user.email,
    entity: 'User',
    entityId: userId,
    oldData: { avatar: currentUser.avatar },
    newData: { avatar: null },
    req
  });

  return res.json({
    success: true,
    message: 'Avatar deleted successfully'
  });
};
