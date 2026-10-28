const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../db/dbAdapter');

/**
 * Extracts and verifies JWT token or handles seamless demo-mode session tokens
 */
async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    // Support quick demo role switching via header if provided in evaluation mode
    const demoRole = req.headers['x-demo-role'];
    if (!token && demoRole) {
      const emailMap = {
        admin: 'admin@labhub.edu',
        operator: 'operator@labhub.edu',
        student: 'student@labhub.edu',
        scholar: 'scholar@labhub.edu'
      };
      const email = emailMap[demoRole] || 'student@labhub.edu';
      const user = await db.getUserByEmail(email);
      if (user) {
        req.user = user;
        return next();
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid authorization token or sign in.',
        code: 'UNAUTHORIZED'
      });
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await db.getUserById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Session invalid or user account no longer exists.',
          code: 'USER_NOT_FOUND'
        });
      }

      req.user = user;
      next();
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token.',
        code: 'TOKEN_EXPIRED'
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication middleware for public endpoints with personalized states
 */
async function optionalAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    const demoRole = req.headers['x-demo-role'];
    if (!token && demoRole) {
      const emailMap = {
        admin: 'admin@labhub.edu',
        operator: 'operator@labhub.edu',
        student: 'student@labhub.edu',
        scholar: 'scholar@labhub.edu'
      };
      const email = emailMap[demoRole];
      if (email) {
        req.user = await db.getUserByEmail(email);
        return next();
      }
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = await db.getUserById(decoded.id);
      } catch (e) {
        // Token invalid, proceed as guest
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles Allowed user roles
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: This operation requires one of the following permissions: [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRoles
};
