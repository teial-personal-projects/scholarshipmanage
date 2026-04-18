/**
 * Reminders Service
 * Handles automated reminder emails for applications and collaborations
 */

import { supabase } from '../config/supabase.js';
import * as emailService from './email.service.js';

export interface ReminderStats {
  applicationReminders: number;
  collaborationReminders: number;
  errors: number;
  totalProcessed: number;
}

/**
 * Reminder configuration
 * Defines when reminders should be sent relative to due dates
 */
interface ReminderConfig {
  type: 'application' | 'collaboration';
  intervals: number[]; // Days before due date to send reminder (e.g., [7, 3, 1])
  overdueIntervals: number[]; // Days after due date (e.g., [1, 3, 7])
}

// Default reminder configuration
const REMINDER_CONFIG: Record<'application' | 'collaboration', ReminderConfig> = {
  application: {
    type: 'application',
    intervals: [7, 3, 1], // Remind 7, 3, and 1 day(s) before due date
    overdueIntervals: [1, 3, 7], // Remind 1, 3, and 7 day(s) after overdue
  },
  collaboration: {
    type: 'collaboration',
    intervals: [7, 3, 1], // Remind 7, 3, and 1 day(s) before due date
    overdueIntervals: [1, 3], // Remind 1 and 3 day(s) after overdue
  },
};

/**
 * Calculate if a reminder should be sent based on due date and last reminder
 * @param dueDate The due date
 * @param lastReminderSent When the last reminder was sent (null if never sent)
 * @param intervals Array of day intervals to check
 * @returns true if a reminder should be sent
 */
function shouldSendReminder(
  dueDate: Date,
  lastReminderSent: Date | null,
  intervals: number[]
): boolean {
  const now = new Date();
  const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check if we're at one of the reminder intervals
  const atInterval = intervals.includes(Math.abs(daysDiff));
  if (!atInterval) {
    return false;
  }

  // If no reminder has been sent yet, send one
  if (!lastReminderSent) {
    return true;
  }

  // Prevent duplicate reminders within 24 hours
  const hoursSinceLastReminder =
    (now.getTime() - lastReminderSent.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastReminder >= 24;
}

/**
 * Process application reminders
 * Finds applications with upcoming or overdue due dates and sends reminders
 */
async function processApplicationReminders(): Promise<number> {
  let count = 0;

  try {
    const config = REMINDER_CONFIG.application;
    const now = new Date();

    // Calculate date ranges to check
    // For upcoming: check furthest interval forward
    const maxFutureDays = Math.max(...config.intervals);
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + maxFutureDays);

    // For overdue: check furthest interval backward
    const maxOverdueDays = Math.max(...config.overdueIntervals);
    const overdueDate = new Date(now);
    overdueDate.setDate(overdueDate.getDate() - maxOverdueDays);

    // Query applications with due dates in the reminder window
    // Exclude already submitted applications
    // Include user notification preferences and last reminder timestamp
    const { data: applications, error } = await supabase
      .from('applications')
      .select(
        `
        id,
        user_id,
        scholarship_name,
        due_date,
        status,
        last_reminder_sent_at,
        user_profiles!inner (
          id,
          first_name,
          last_name,
          email,
          application_reminders_enabled,
          reminder_intervals
        )
      `
      )
      .gte('due_date', overdueDate.toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .not('status', 'in', '("Submitted","Awarded","Not Awarded")');

    if (error) {
      console.error('[reminders.service] Error querying applications:', error);
      return count;
    }

    if (!applications || applications.length === 0) {
      console.log('[reminders.service] No applications found needing reminders');
      return count;
    }

    console.log(`[reminders.service] Found ${applications.length} applications to check`);

    // Check each application to see if it needs a reminder
    for (const app of applications) {
      try {
        const userProfile = app.user_profiles as any;

        // Check if user has disabled application reminders
        if (userProfile.application_reminders_enabled === false) {
          console.log(`[reminders.service] Skipping application ${app.id} - user has disabled application reminders`);
          continue;
        }

        const dueDate = new Date(app.due_date);
        const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Use user's custom intervals if available, otherwise use defaults
        let intervals = daysDiff >= 0 ? config.intervals : config.overdueIntervals;
        if (userProfile.reminder_intervals?.application) {
          intervals = userProfile.reminder_intervals.application;
        }

        // Get last reminder timestamp
        const lastReminderSent = app.last_reminder_sent_at
          ? new Date(app.last_reminder_sent_at)
          : null;

        // Check if we should send a reminder
        if (shouldSendReminder(dueDate, lastReminderSent, intervals)) {
          // Send reminder email
          const userProfile = app.user_profiles as any;
          const emailSent = await emailService.sendApplicationReminder({
            studentEmail: userProfile.email,
            studentName: `${userProfile.first_name} ${userProfile.last_name}`,
            scholarshipName: app.scholarship_name,
            dueDate: app.due_date,
            daysUntilDue: daysDiff,
            applicationId: app.id,
          });

          if (emailSent) {
            console.log(
              `[reminders.service] Application reminder sent for "${app.scholarship_name}" (${daysDiff} days, Email ID: ${emailSent})`
            );

            // Update last_reminder_sent_at timestamp
            try {
              await supabase
                .from('applications')
                .update({ last_reminder_sent_at: new Date().toISOString() })
                .eq('id', app.id);

              console.log(`[reminders.service] Updated last_reminder_sent_at for application ${app.id}`);
            } catch (updateError) {
              console.error(`[reminders.service] Failed to update last_reminder_sent_at:`, updateError);
              // Don't fail the reminder process if updating timestamp fails
            }

            count++;
          } else {
            console.warn(
              `[reminders.service] Failed to send application reminder for "${app.scholarship_name}"`
            );
          }
        }
      } catch (err) {
        console.error(
          `[reminders.service] Error processing application ${app.id}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error('[reminders.service] Error in processApplicationReminders:', err);
  }

  return count;
}

/**
 * Process collaboration reminders
 * Finds collaborations with upcoming or overdue action dates and sends reminders
 */
async function processCollaborationReminders(): Promise<number> {
  let count = 0;

  try {
    const config = REMINDER_CONFIG.collaboration;
    const now = new Date();

    // Calculate date ranges to check
    const maxFutureDays = Math.max(...config.intervals);
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + maxFutureDays);

    const maxOverdueDays = Math.max(...config.overdueIntervals);
    const overdueDate = new Date(now);
    overdueDate.setDate(overdueDate.getDate() - maxOverdueDays);

    // Query collaborations with action due dates in the reminder window
    // Only include collaborations that are in progress or invited
    // Include user notification preferences and last reminder timestamp
    const { data: collaborations, error } = await supabase
      .from('collaborations')
      .select(
        `
        id,
        user_id,
        collaborator_id,
        application_id,
        collaboration_type,
        status,
        next_action_due_date,
        next_action_description,
        last_reminder_sent_at,
        collaborators!inner (
          id,
          first_name,
          last_name,
          email
        ),
        applications!inner (
          id,
          scholarship_name,
          user_profiles!inner (
            id,
            first_name,
            last_name,
            email,
            collaboration_reminders_enabled,
            reminder_intervals
          )
        )
      `
      )
      .not('next_action_due_date', 'is', null)
      .gte('next_action_due_date', overdueDate.toISOString().split('T')[0])
      .lte('next_action_due_date', futureDate.toISOString().split('T')[0])
      .in('status', ['invited', 'accepted', 'in_progress']);

    if (error) {
      console.error('[reminders.service] Error querying collaborations:', error);
      return count;
    }

    if (!collaborations || collaborations.length === 0) {
      console.log('[reminders.service] No collaborations found needing reminders');
      return count;
    }

    console.log(`[reminders.service] Found ${collaborations.length} collaborations to check`);

    // Check each collaboration to see if it needs a reminder
    for (const collab of collaborations) {
      try {
        const application = collab.applications as any;
        const student = application.user_profiles as any;

        // Check if student has disabled collaboration reminders
        if (student.collaboration_reminders_enabled === false) {
          console.log(`[reminders.service] Skipping collaboration ${collab.id} - student has disabled collaboration reminders`);
          continue;
        }

        const dueDate = new Date(collab.next_action_due_date!);
        const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Use student's custom intervals if available, otherwise use defaults
        let intervals = daysDiff >= 0 ? config.intervals : config.overdueIntervals;
        if (student.reminder_intervals?.collaboration) {
          intervals = student.reminder_intervals.collaboration;
        }

        // Get last reminder timestamp
        const lastReminderSent = collab.last_reminder_sent_at
          ? new Date(collab.last_reminder_sent_at)
          : null;

        // Check if we should send a reminder
        if (shouldSendReminder(dueDate, lastReminderSent, intervals)) {
          // Send reminder email to collaborator
          const collaborator = collab.collaborators as any;
          const application = collab.applications as any;
          const student = application.user_profiles as any;

          const emailSent = await emailService.sendCollaborationReminder({
            recipientEmail: collaborator.email,
            recipientName: `${collaborator.first_name} ${collaborator.last_name}`,
            collaborationType: collab.collaboration_type as any,
            studentName: `${student.first_name} ${student.last_name}`,
            dueDate: collab.next_action_due_date!,
            daysUntilDue: daysDiff,
            applicationName: application.scholarship_name,
            collaborationId: collab.id,
          });

          if (emailSent) {
            console.log(
              `[reminders.service] Collaboration reminder sent for ${collab.collaboration_type} (${daysDiff} days, Email ID: ${emailSent})`
            );

            // Update last_reminder_sent_at timestamp
            try {
              await supabase
                .from('collaborations')
                .update({ last_reminder_sent_at: new Date().toISOString() })
                .eq('id', collab.id);

              console.log(`[reminders.service] Updated last_reminder_sent_at for collaboration ${collab.id}`);
            } catch (updateError) {
              console.error(`[reminders.service] Failed to update last_reminder_sent_at:`, updateError);
              // Don't fail the reminder process if updating timestamp fails
            }

            // Log reminder in collaboration_history table
            try {
              const isOverdue = daysDiff < 0;
              const details = isOverdue
                ? `Overdue reminder sent (${Math.abs(daysDiff)} days overdue). Email ID: ${emailSent}`
                : `Due soon reminder sent (${daysDiff} days remaining). Email ID: ${emailSent}`;

              await supabase
                .from('collaboration_history')
                .insert({
                  collaboration_id: collab.id,
                  action: 'reminder_sent',
                  details,
                });

              console.log(`[reminders.service] Logged reminder to collaboration_history for collaboration ${collab.id}`);
            } catch (historyError) {
              console.error(`[reminders.service] Failed to log reminder to collaboration_history:`, historyError);
              // Don't fail the reminder process if logging fails
            }

            count++;
          } else {
            console.warn(
              `[reminders.service] Failed to send collaboration reminder for ${collab.collaboration_type}`
            );
          }
        }
      } catch (err) {
        console.error(
          `[reminders.service] Error processing collaboration ${collab.id}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error('[reminders.service] Error in processCollaborationReminders:', err);
  }

  return count;
}

/**
 * Process all pending reminders
 * Called by the cron job endpoint
 */
export const processReminders = async (): Promise<ReminderStats> => {
  console.log('[reminders.service] Starting reminder processing...');
  const startTime = Date.now();

  const stats: ReminderStats = {
    applicationReminders: 0,
    collaborationReminders: 0,
    errors: 0,
    totalProcessed: 0,
  };

  try {
    // Process application reminders
    console.log('[reminders.service] Processing application reminders...');
    stats.applicationReminders = await processApplicationReminders();

    // Process collaboration reminders
    console.log('[reminders.service] Processing collaboration reminders...');
    stats.collaborationReminders = await processCollaborationReminders();
  } catch (error) {
    console.error('[reminders.service] Error processing reminders:', error);
    stats.errors++;
  }

  stats.totalProcessed =
    stats.applicationReminders + stats.collaborationReminders + stats.errors;

  const duration = Date.now() - startTime;
  console.log(
    `[reminders.service] Reminder processing completed in ${duration}ms:`,
    stats
  );

  return stats;
};
