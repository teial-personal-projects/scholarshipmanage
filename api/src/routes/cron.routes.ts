import { Router } from 'express';
import * as cronController from '../controllers/cron.controller.js';

const router = Router();

/**
 * Cron routes - Protected with secret token (not user authentication)
 * These endpoints are called by scheduled jobs (GitHub Actions, etc.)
 */

// POST /api/cron/send-reminders - Send automated reminder emails
router.post('/send-reminders', cronController.sendReminders);

export default router;
