import { Request, Response, NextFunction } from 'express';
import { getUserRoles } from '../services/users.service.js';

/**
 * User role types matching the database enum
 */
export type UserRole = 'student' | 'recommender' | 'collaborator';

/**
 * Role-based access control middleware
 * Checks if the authenticated user has one of the required roles
 * 
 * Usage:
 *   router.get('/admin', auth, requireRole(['recommender']), controller.handler);
 *   router.post('/api', auth, requireRole(['student', 'recommender']), controller.handler);
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ensure user is authenticated (auth middleware should run first)
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      // Get user roles from database
      const userRoles = await getUserRoles(req.user.userId);

      // Check if user has at least one of the required roles
      const hasRequiredRole = allowedRoles.some((role) => userRoles.includes(role));

      if (!hasRequiredRole) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
        });
        return;
      }

      // User has required role, continue to next middleware
      next();
    } catch (err) {
      console.error('Role middleware error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify user role',
      });
    }
  };
};

