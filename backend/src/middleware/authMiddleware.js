/**
 * Auth Middleware
 * CS 308 Online Ticketing Project
 *
 * JWT token verification middleware
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token from Authorization header
 * Adds decoded user data to req.user
 *
 * Usage: router.get('/profile', authMiddleware, profileController)
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token bulunamadı.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token geçersiz veya süresi dolmuş.'
    });
  }
};

/**
 * Middleware to check if user has required role(s)
 * Must be used after authMiddleware
 *
 * Usage: router.get('/admin', authMiddleware, requireRole(['sales_manager']), handler)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Yetkilendirme gerekli.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Bu işlem için yetkiniz bulunmamaktadır.'
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole
};
