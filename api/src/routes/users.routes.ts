import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import * as usersController from '../controllers/users.controller.js';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/users/me - Get current user profile
router.get('/me', usersController.getMe);

// PATCH /api/users/me - Update current user profile
router.patch('/me', usersController.updateMe);

// GET /api/users/me/roles - Get user roles
router.get('/me/roles', usersController.getMyRoles);

// GET /api/users/me/reminders - Get dashboard reminders (students only)
router.get('/me/reminders', requireRole(['student']), usersController.getMyReminders);

export default router;
