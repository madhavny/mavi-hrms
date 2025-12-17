import jwt from 'jsonwebtoken';
import redis from '@shared/config/redis.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-admin-secret';

export const verifySuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check Redis
    const cached = await redis.get(`superadmin:${token}`);
    if (!cached || cached === 'Invalid') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    req.superAdmin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
