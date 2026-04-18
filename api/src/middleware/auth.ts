import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { getUserProfileByAuthId } from '../utils/supabase.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        authUserId: string;
        userId: number;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies Supabase JWT token and attaches user to request
 */
export const auth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Get user profile from database
    const userProfile = await getUserProfileByAuthId(user.id);

    if (!userProfile) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found',
      });
      return;
    }

    // Attach user info to request
    req.user = {
      authUserId: user.id,
      userId: userProfile.id,
      email: userProfile.email_address,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};
