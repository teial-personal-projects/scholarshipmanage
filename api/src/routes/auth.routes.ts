import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authRateLimiters } from '../config/rate-limit.js';

const router = Router();

// POST /api/auth/register - Register new user
// Rate limit: 3 requests per hour
router.post('/register', authRateLimiters.register, authController.register);

// POST /api/auth/login - Login user (proxy to Supabase Auth)
// Rate limit: 5 requests per 15 minutes
router.post('/login', authRateLimiters.login, authController.login);

// POST /api/auth/logout - Logout user
router.post('/logout', authController.logout);

// POST /api/auth/refresh - Refresh session token
router.post('/refresh', authController.refresh);

export default router;

