import type { ApplicationResponse, CollaborationResponse } from './api-responses.types.js';

/**
 * Dashboard reminders interface
 * Contains all upcoming and overdue items for a user
 */
export interface DashboardReminders {
  applications: {
    dueSoon: ApplicationResponse[];    // Due within 7 days
    overdue: ApplicationResponse[];     // Past due date and not submitted
  };
  collaborations: {
    pendingResponse: CollaborationResponse[];  // Waiting for collaborator to accept/respond
    dueSoon: CollaborationResponse[];          // Due within 7 days
    overdue: CollaborationResponse[];          // Past due date
  };
  stats: {
    totalUpcoming: number;   // Total items due soon
    totalOverdue: number;    // Total overdue items
  };
}
