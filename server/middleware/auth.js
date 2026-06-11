// server/middleware/auth.js
// WP3: Authentication Middleware

/**
 * Require authentication - returns 401 if not logged in
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      loginUrl: '/login.html'
    });
  }
  next();
}

/**
 * Optional authentication - attaches user if logged in, continues if not
 */
export function optionalAuth(req, res, next) {
  // User may or may not be logged in - just continue
  next();
}

/**
 * Require specific role
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }
    
    next();
  };
}

/**
 * Check if user owns the resource
 */
export function requireOwnership(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    try {
      const ownerId = await getOwnerId(req);
      
      if (ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Not authorized to access this resource',
          code: 'FORBIDDEN'
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
}

export default { requireAuth, optionalAuth, requireRole, requireOwnership };
