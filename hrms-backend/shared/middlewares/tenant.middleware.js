import jwt from 'jsonwebtoken';
import redis from '@shared/config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tenant-secret';

/**
 * Verify Tenant User Token
 */
export const verifyTenantUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check Redis
    const cached = await redis.get(`tenant:${token}`);
    if (!cached || cached === 'Invalid') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'tenant_user') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

/**
 * Extract Tenant from authenticated user
 */
export const extractTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (req.user.type === 'SUPER_ADMIN' || req.user.userType === 'SUPER_ADMIN') {
    req.tenantId = null;
    return next();
  }

  const tenantId = req.user.tenantId;
  if (!tenantId) {
    return res.status(403).json({ success: false, message: 'No organization access' });
  }

  req.tenantId = tenantId;
  next();
};

/**
 * Require Tenant context
 */
export const requireTenant = (req, res, next) => {
  if (!req.tenantId) {
    return res.status(403).json({ success: false, message: 'Organization context required' });
  }
  next();
};
