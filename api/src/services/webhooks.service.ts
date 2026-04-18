/**
 * Webhooks Service
 * Handles processing webhook events from Resend
 */

import { Webhook } from 'svix';
import { config } from '../config/index.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';

/**
 * Webhook signature headers
 */
interface WebhookHeaders {
  signature: string;
  timestamp: string;
  svixId: string;
}

/**
 * Resend webhook event types
 */
type ResendWebhookEvent =
  | 'email.sent'
  | 'email.delivered'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked';

/**
 * Resend webhook payload structure
 */
interface ResendWebhookPayload {
  type: ResendWebhookEvent;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    created_at: string;
    subject?: string;
    // For opened/clicked events
    opened_at?: string;
    clicked_at?: string;
  };
}

/**
 * Verify webhook signature and process the event
 */
export const processResendWebhook = async (
  rawBody: Buffer,
  headers: WebhookHeaders
): Promise<void> => {
  const { signature, timestamp, svixId } = headers;

  // Verify webhook secret is configured
  if (!config.resend.webhookSecret) {
    throw new AppError('Webhook secret not configured', 500);
  }

  // Create Svix webhook verifier
  const wh = new Webhook(config.resend.webhookSecret);

  // Verify the signature using the raw body
  let payload: ResendWebhookPayload;
  try {
    payload = wh.verify(rawBody.toString('utf8'), {
      'svix-id': svixId,
      'svix-signature': signature,
      'svix-timestamp': timestamp,
    }) as ResendWebhookPayload;
  } catch (error) {
    console.error('[webhooks.service] Signature verification error:', error);
    throw new AppError('Invalid webhook signature', 401);
  }

  // Extract event data
  const { type, data } = payload;
  const emailId = data.email_id;

  if (!emailId) {
    throw new AppError('Missing email_id in webhook payload', 400);
  }

  // Find the collaboration_invites record by resend_email_id
  const { data: invite, error: findError } = await supabase
    .from('collaboration_invites')
    .select('*')
    .eq('resend_email_id', emailId)
    .single();

  if (findError || !invite) {
    // Log but don't fail - webhook might be for an email we don't track
    console.warn(`[webhooks.service] No invite found for email_id: ${emailId}`);
    return;
  }

  // Update based on event type
  const updates: Record<string, unknown> = {};

  switch (type) {
    case 'email.sent':
      updates.delivery_status = 'sent';
      break;

    case 'email.delivered':
      updates.delivery_status = 'delivered';
      break;

    case 'email.bounced':
      updates.delivery_status = 'bounced';
      break;

    case 'email.opened':
      updates.opened_at = data.opened_at
        ? new Date(data.opened_at).toISOString()
        : new Date().toISOString();
      // Don't change delivery_status if already delivered
      if (invite.delivery_status === 'sent') {
        updates.delivery_status = 'delivered';
      }
      break;

    case 'email.clicked':
      updates.clicked_at = data.clicked_at
        ? new Date(data.clicked_at).toISOString()
        : new Date().toISOString();
      // Don't change delivery_status if already delivered
      if (invite.delivery_status === 'sent') {
        updates.delivery_status = 'delivered';
      }
      break;

    default:
      console.warn(`[webhooks.service] Unknown webhook event type: ${type}`);
      return;
  }

  // Update the invite record
  const { error: updateError } = await supabase
    .from('collaboration_invites')
    .update(updates)
    .eq('id', invite.id);

  if (updateError) {
    console.error('[webhooks.service] Error updating invite:', updateError);
    throw new AppError('Failed to update invite record', 500);
  }

  // Optionally log webhook event in collaboration_history
  try {
    const { error: historyError } = await supabase
      .from('collaboration_history')
      .insert({
        collaboration_id: invite.collaboration_id,
        user_id: invite.user_id,
        action: 'webhook_event',
        details: `Webhook event: ${type} for email ${emailId}`,
      });

    if (historyError) {
      // Don't fail the webhook if history logging fails
      console.warn('[webhooks.service] Failed to log webhook event in history:', historyError);
    }
  } catch (err) {
    // Ignore history logging errors
    console.warn('[webhooks.service] Error logging webhook event:', err);
  }

  console.log(`[webhooks.service] Processed webhook event: ${type} for email ${emailId}`);
};

