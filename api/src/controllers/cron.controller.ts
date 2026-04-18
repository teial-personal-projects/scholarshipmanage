import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { AppError } from '../middleware/error-handler.js';
import * as remindersService from '../services/reminders.service.js';
import { httpResponse } from '../utils/http-response.js';

/**
 * Middleware to verify cron secret token
 * Protects endpoints from unauthorized access
 */
const verifyCronSecret = (req: Request, res: Response, next: () => void) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // Check if CRON_SECRET is configured
  if (!cronSecret) {
    console.error('[cron.controller] CRON_SECRET not configured in environment variables');
    httpResponse.serverError(res, 'Server configuration error');
    return;
  }

  // Check if authorization header is present
  if (!authHeader) {
    httpResponse.unauthorized(res, 'Missing authorization header');
    return;
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  // Verify token matches secret
  if (token !== cronSecret) {
    httpResponse.forbidden(res, 'Invalid cron secret');
    return;
  }

  // Token is valid, continue
  next();
};

/**
 * POST /api/cron/send-reminders
 * Send automated reminder emails for applications and collaborations
 *
 * This endpoint is called by scheduled jobs (GitHub Actions)
 * Protected with CRON_SECRET token
 *
 * Authorization: Bearer <CRON_SECRET>
 */
export const sendReminders = asyncHandler(async (req: Request, res: Response) => {
  // Verify cron secret first
  verifyCronSecret(req, res, async () => {
    try {
      console.log('[cron.controller] Starting reminder job...');

      // Process reminders
      const result = await remindersService.processReminders();

      console.log('[cron.controller] Reminder job completed:', result);

      // Return success response with stats
      httpResponse.ok(res, {
        success: true,
        timestamp: new Date().toISOString(),
        stats: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[cron.controller] Error processing reminders:', error);
      httpResponse.serverError(res, 'Failed to process reminders');
    }
  });
});
