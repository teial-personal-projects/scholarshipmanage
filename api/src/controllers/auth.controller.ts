import { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { AppError } from '../middleware/error-handler.js';
import {
  registerInputSchema,
  loginInputSchema,
  refreshTokenInputSchema,
} from '../schemas/auth.schemas.js';
import { httpResponse } from '../utils/http-response.js';

/**
 * POST /api/auth/register
 * Register a new user
 * Creates user in Supabase Auth, creates profile, and assigns default 'student' role
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const validationResult = registerInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    throw new AppError(
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      400
    );
  }

  const { email, password, firstName, lastName } = validationResult.data;

  try {
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
    });

    // Return user data and session
    httpResponse.created(res, {
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      profile: {
        id: result.profile.id,
        emailAddress: result.profile.email_address,
        firstName: result.profile.first_name,
        lastName: result.profile.last_name,
      },
      session: result.session
        ? {
            accessToken: result.session.access_token,
            refreshToken: result.session.refresh_token,
            expiresAt: result.session.expires_at,
            expiresIn: result.session.expires_in,
          }
        : null,
    });
  } catch (error: unknown) {
    // Handle Supabase errors
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      // Check for duplicate email
      if (
        error.message.includes('already registered') ||
        error.message.includes('User already registered')
      ) {
        throw new AppError('Email is already registered', 409);
      }

      // Check for weak password
      if (error.message.includes('Password')) {
        throw new AppError(error.message, 400);
      }
    }

    throw error;
  }
});

/**
 * POST /api/auth/login
 * Login user (proxy to Supabase Auth)
 * Note: Frontend typically handles login directly with Supabase client
 * This endpoint is provided for backend-to-backend auth scenarios
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const validationResult = loginInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    throw new AppError(
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      400
    );
  }

  const { email, password } = validationResult.data;

  try {
    const result = await authService.login({ email, password });

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      session: {
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
        expiresAt: result.session.expires_at,
        expiresIn: result.session.expires_in,
      },
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      if (
        error.message.includes('Invalid login') ||
        error.message.includes('invalid')
      ) {
        throw new AppError('Invalid email or password', 401);
      }
    }

    throw error;
  }
});

/**
 * POST /api/auth/logout
 * Logout user (proxy to Supabase Auth)
 * Invalidates the current session
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Missing authorization header', 401);
  }

  const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    await authService.logout(accessToken);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: unknown) {
    // Even if logout fails, we can return success since the client can clear tokens
    console.error('Logout error:', error);
    res.json({ success: true, message: 'Logged out successfully' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh session token
 * Gets a new access token using the refresh token
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const validationResult = refreshTokenInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    throw new AppError(
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      400
    );
  }

  const { refreshToken } = validationResult.data;

  try {
    const result = await authService.refreshSession(refreshToken);

    if (!result.user) {
      throw new AppError('Failed to refresh session', 401);
    }

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
      },
      session: {
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
        expiresAt: result.session.expires_at,
        expiresIn: result.session.expires_in,
      },
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      if (
        error.message.includes('refresh_token') ||
        error.message.includes('expired') ||
        error.message.includes('invalid')
      ) {
        throw new AppError('Invalid or expired refresh token', 401);
      }
    }

    throw error;
  }
});

