import { Router } from 'express';
import express from 'express';
import * as webhooksController from '../controllers/webhooks.controller.js';
import { webhookLimiter } from '../config/rate-limit.js';

const router = Router();

// Webhook routes - NO auth middleware (webhooks use signature verification instead)
// Use raw body parser for signature verification (Svix needs raw body)
// POST /api/webhooks/resend - Handle Resend webhook events
// Rate limit: 100 requests per 15 minutes
router.post(
  '/resend',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  webhooksController.handleResendWebhook
);

export default router;

