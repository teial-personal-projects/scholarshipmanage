/**
 * Collaborations Service
 * Business logic for collaboration management
 */

import { randomBytes } from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';
import { sendCollaborationInvite } from './email.service.js';
import { sanitizeNote } from '../utils/sanitize-html.js';

/**
 * Verify that a collaborator belongs to the user
 */
const verifyCollaboratorOwnership = async (collaboratorId: number, userId: number) => {
  const { data, error } = await supabase
    .from('collaborators')
    .select('id')
    .eq('id', collaboratorId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new AppError('Collaborator not found', 404);
  }
};

/**
 * Verify that an application belongs to the user
 */
const verifyApplicationOwnership = async (applicationId: number, userId: number) => {
  const { data, error } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new AppError('Application not found', 404);
  }
};

/**
 * Get all collaborations for a specific application (with invite data)
 */
export const getCollaborationsByApplicationId = async (
  applicationId: number,
  userId: number
) => {
  // Verify application ownership
  await verifyApplicationOwnership(applicationId, userId);

  const { data, error } = await supabase
    .from('collaborations')
    .select(`
      *,
      collaborators(
        id,
        first_name,
        last_name,
        email_address,
        relationship,
        phone_number
      ),
      collaboration_invites(
        id,
        invite_token,
        sent_at,
        expires_at,
        delivery_status,
        opened_at,
        clicked_at,
        resend_email_id
      )
    `)
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Flatten the invite data and include collaborator info
  const collaborations = (data || []).map((collab: any) => {
    const { collaboration_invites, collaborators, ...collabData } = collab;
    const mostRecentInvite = collaboration_invites && collaboration_invites.length > 0
      ? collaboration_invites[collaboration_invites.length - 1]
      : null;

    // Flatten collaborator data (should be a single object, not array)
    const collaborator = Array.isArray(collaborators) ? collaborators[0] : collaborators;

    return {
      ...collabData,
      collaborator: collaborator || null,
      invite: mostRecentInvite,
    };
  });

  return collaborations;
};

/**
 * Get a single collaboration by ID (with ownership verification)
 */
export const getCollaborationById = async (collaborationId: number, userId: number) => {
  const { data, error } = await supabase
    .from('collaborations')
    .select(`
      *,
      collaborators!inner(
        id,
        first_name,
        last_name,
        email_address,
        relationship,
        phone_number,
        user_id
      )
    `)
    .eq('id', collaborationId)
    .eq('collaborators.user_id', userId)
    .single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
      throw new AppError('Collaboration not found', 404);
    }
    throw error;
  }

  // Extract and flatten collaborator data
  const { collaborators, ...collaboration } = data as any;
  const collaborator = Array.isArray(collaborators) ? collaborators[0] : collaborators;

  // Fetch type-specific data based on collaboration_type
  const typeSpecificData = await getTypeSpecificData(
    collaboration.id,
    collaboration.collaboration_type
  );

  return {
    ...collaboration,
    collaborator: collaborator || null,
    ...typeSpecificData,
  };
};

/**
 * Get type-specific data for a collaboration
 */
const getTypeSpecificData = async (collaborationId: number, collaborationType: string) => {
  switch (collaborationType) {
    case 'essayReview': {
      const { data } = await supabase
        .from('essay_review_collaborations')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .single();

      // Essay review collaborations are now one-to-one with collaborations (no essay_id link)
      const row = data as any;
      if (!row) return {};

      return {
        currentDraftVersion: row.current_draft_version ?? undefined,
        feedbackRounds: row.feedback_rounds ?? undefined,
        lastFeedbackAt: row.last_feedback_at ?? undefined,
      };
    }
    case 'recommendation': {
      const { data } = await supabase
        .from('recommendation_collaborations')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .single();
      return data || {};
    }
    case 'guidance': {
      const { data } = await supabase
        .from('guidance_collaborations')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .single();
      return data || {};
    }
    default:
      return {};
  }
};

/**
 * Create a new collaboration
 */
export const createCollaboration = async (
  userId: number,
  collaborationData: {
    collaboratorId: number;
    applicationId: number;
    collaborationType: 'recommendation' | 'essayReview' | 'guidance';
    status?: string;
    awaitingActionFrom?: string;
    awaitingActionType?: string;
    nextActionDescription?: string;
    nextActionDueDate?: string;
    notes?: string;
    // Type-specific fields
    currentDraftVersion?: number; // For essayReview
    feedbackRounds?: number; // For essayReview
    lastFeedbackAt?: string; // For essayReview
    portalUrl?: string; // For recommendation
    sessionType?: string; // For guidance
    meetingUrl?: string; // For guidance
    scheduledFor?: string; // For guidance
  }
) => {
  // Verify ownership
  await verifyCollaboratorOwnership(collaborationData.collaboratorId, userId);
  await verifyApplicationOwnership(collaborationData.applicationId, userId);

  // Validate: Due date is required for recommendation collaborations
  if (collaborationData.collaborationType === 'recommendation' && !collaborationData.nextActionDueDate) {
    throw new AppError('nextActionDueDate is required for recommendation collaborations', 400);
  }

  // Convert camelCase to snake_case for base collaboration
  const dbData: Record<string, unknown> = {
    user_id: userId, // Required: owner of the collaboration (student)
    collaborator_id: collaborationData.collaboratorId,
    application_id: collaborationData.applicationId,
    collaboration_type: collaborationData.collaborationType,
  };

  if (collaborationData.status !== undefined) dbData.status = collaborationData.status;
  if (collaborationData.awaitingActionFrom !== undefined)
    dbData.awaiting_action_from = collaborationData.awaitingActionFrom;
  if (collaborationData.awaitingActionType !== undefined)
    dbData.awaiting_action_type = collaborationData.awaitingActionType;
  if (collaborationData.nextActionDescription !== undefined)
    dbData.next_action_description = collaborationData.nextActionDescription;
  if (collaborationData.nextActionDueDate !== undefined) {
    // Store DATE fields as date-only (YYYY-MM-DD) to avoid timezone shifts.
    dbData.next_action_due_date = collaborationData.nextActionDueDate.split('T')[0];
  }
  if (collaborationData.notes !== undefined) {
    // Sanitize HTML notes to prevent XSS attacks
    dbData.notes = sanitizeNote(collaborationData.notes);
  }

  // Create base collaboration
  const { data: collaboration, error } = await supabase
    .from('collaborations')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    // Log error with context for troubleshooting (sanitized for production)
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Failed to create base collaboration:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        data: {
          collaboratorId: collaborationData.collaboratorId,
          applicationId: collaborationData.applicationId,
          collaborationType: collaborationData.collaborationType,
          userId,
        },
        dbData,
      });
    } else {
      // Production: log minimal info without sensitive data
      console.error('❌ Failed to create base collaboration:', {
        error: error.message,
        code: error.code,
        collaborationType: collaborationData.collaborationType,
      });
    }
    throw error;
  }

  // Create type-specific data
  try {
    if (collaborationData.collaborationType === 'essayReview') {
      const essayReviewData: Record<string, unknown> = {
        collaboration_id: collaboration.id,
      };
      if (collaborationData.currentDraftVersion !== undefined) {
        essayReviewData.current_draft_version = collaborationData.currentDraftVersion;
      }
      if (collaborationData.feedbackRounds !== undefined) {
        essayReviewData.feedback_rounds = collaborationData.feedbackRounds;
      }
      if (collaborationData.lastFeedbackAt !== undefined) {
        essayReviewData.last_feedback_at = collaborationData.lastFeedbackAt;
      }

      const { error: essayError } = await supabase
        .from('essay_review_collaborations')
        .insert(essayReviewData);
      if (essayError) {
        // Log error (minimal in production)
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Failed to create essay review collaboration:', {
            error: essayError.message,
            code: essayError.code,
            collaborationId: collaboration.id,
            essayReviewData,
          });
        } else {
          console.error('❌ Failed to create essay review collaboration:', {
            error: essayError.message,
            code: essayError.code,
          });
        }
        throw essayError;
      }
    } else if (collaborationData.collaborationType === 'recommendation') {
      const recData: Record<string, unknown> = {
        collaboration_id: collaboration.id,
      };
      if (collaborationData.portalUrl !== undefined) recData.portal_url = collaborationData.portalUrl;
      const { error: recError } = await supabase.from('recommendation_collaborations').insert(recData);
      if (recError) {
        // Log error (minimal in production, avoid logging portal URLs)
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Failed to create recommendation collaboration:', {
            error: recError.message,
            code: recError.code,
            details: recError.details,
            hint: recError.hint,
            collaborationId: collaboration.id,
            recData,
          });
        } else {
          console.error('❌ Failed to create recommendation collaboration:', {
            error: recError.message,
            code: recError.code,
          });
        }
        throw recError;
      }
    } else if (collaborationData.collaborationType === 'guidance') {
      const guidanceData: Record<string, unknown> = {
        collaboration_id: collaboration.id,
      };
      if (collaborationData.sessionType !== undefined)
        guidanceData.session_type = collaborationData.sessionType;
      if (collaborationData.meetingUrl !== undefined) guidanceData.meeting_url = collaborationData.meetingUrl;
      if (collaborationData.scheduledFor !== undefined)
        guidanceData.scheduled_for = collaborationData.scheduledFor;
      const { error: guidanceError } = await supabase.from('guidance_collaborations').insert(guidanceData);
      if (guidanceError) {
        // Log error (minimal in production, avoid logging meeting URLs)
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Failed to create guidance collaboration:', {
            error: guidanceError.message,
            code: guidanceError.code,
            collaborationId: collaboration.id,
            guidanceData,
          });
        } else {
          console.error('❌ Failed to create guidance collaboration:', {
            error: guidanceError.message,
            code: guidanceError.code,
          });
        }
        throw guidanceError;
      }
    }
  } catch (typeError) {
    // If type-specific insert fails, delete the base collaboration to maintain consistency
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Type-specific insert failed, rolling back base collaboration:', {
        collaborationId: collaboration.id,
        collaborationType: collaborationData.collaborationType,
        error: typeError instanceof Error ? typeError.message : String(typeError),
      });
    } else {
      console.error('❌ Type-specific insert failed, rolling back base collaboration:', {
        collaborationType: collaborationData.collaborationType,
        error: typeError instanceof Error ? typeError.message : String(typeError),
      });
    }
    await supabase.from('collaborations').delete().eq('id', collaboration.id);
    throw typeError;
  }

  // Log creation in history for complete tracking
  const { error: historyError } = await supabase.from('collaboration_history').insert({
    collaboration_id: collaboration.id,
    action: 'created',
    details: `Collaboration created for ${collaborationData.collaborationType}`,
  });

  if (historyError) {
    // Log error but don't fail the collaboration creation
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Failed to create history entry:', {
        error: historyError.message,
        collaborationId: collaboration.id,
      });
    }
  }

  // Fetch full collaboration with type-specific data
  return getCollaborationById(collaboration.id, userId);
};

/**
 * Update a collaboration
 */
export const updateCollaboration = async (
  collaborationId: number,
  userId: number,
  updates: {
    status?: string;
    awaitingActionFrom?: string;
    awaitingActionType?: string;
    nextActionDescription?: string;
    nextActionDueDate?: string;
    notes?: string;
    // Type-specific fields
    currentDraftVersion?: number; // For essayReview
    feedbackRounds?: number; // For essayReview
    lastFeedbackAt?: string; // For essayReview
    portalUrl?: string; // For recommendation
    questionnaireCompleted?: boolean; // For recommendation
    sessionType?: string; // For guidance
    meetingUrl?: string; // For guidance
    scheduledFor?: string; // For guidance
  }
) => {
  // First verify ownership
  const existing = await getCollaborationById(collaborationId, userId);

  // Validate: Due date is required for recommendation collaborations
  if (existing.collaboration_type === 'recommendation' && 
      updates.nextActionDueDate === undefined && 
      !existing.next_action_due_date) {
    throw new AppError('nextActionDueDate is required for recommendation collaborations', 400);
  }

  // Convert camelCase to snake_case for base collaboration
  const dbUpdates: Record<string, unknown> = {};

  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.awaitingActionFrom !== undefined)
    dbUpdates.awaiting_action_from = updates.awaitingActionFrom;
  if (updates.awaitingActionType !== undefined)
    dbUpdates.awaiting_action_type = updates.awaitingActionType;
  if (updates.nextActionDescription !== undefined)
    dbUpdates.next_action_description = updates.nextActionDescription;
  if (updates.nextActionDueDate !== undefined) {
    // Store DATE fields as date-only (YYYY-MM-DD) to avoid timezone shifts.
    dbUpdates.next_action_due_date = updates.nextActionDueDate.split('T')[0];
  }
  if (updates.notes !== undefined) {
    // Sanitize HTML notes to prevent XSS attacks
    dbUpdates.notes = sanitizeNote(updates.notes);
  }

  // Update base collaboration
  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase
      .from('collaborations')
      .update(dbUpdates)
      .eq('id', collaborationId);

    if (error) throw error;
  }

  // Update type-specific data
  if (existing.collaboration_type === 'essayReview') {
    const essayUpdates: Record<string, unknown> = {};
    if (updates.currentDraftVersion !== undefined) {
      essayUpdates.current_draft_version = updates.currentDraftVersion;
    }
    if (updates.feedbackRounds !== undefined) {
      essayUpdates.feedback_rounds = updates.feedbackRounds;
    }
    if (updates.lastFeedbackAt !== undefined) {
      // Ensure date is stored as UTC midnight to prevent timezone shifts
      const dateValue = updates.lastFeedbackAt.includes('T')
        ? updates.lastFeedbackAt
        : `${updates.lastFeedbackAt}T00:00:00Z`;
      essayUpdates.last_feedback_at = dateValue;
    }

    if (Object.keys(essayUpdates).length > 0) {
      const { error } = await supabase
        .from('essay_review_collaborations')
        .update(essayUpdates)
        .eq('collaboration_id', collaborationId);

      if (error) throw error;
    }
  } else if (existing.collaboration_type === 'recommendation') {
    const recUpdates: Record<string, unknown> = {};
    if (updates.portalUrl !== undefined) {
      recUpdates.portal_url = updates.portalUrl;
    }
    if (updates.questionnaireCompleted !== undefined) {
      recUpdates.questionnaire_completed = updates.questionnaireCompleted;
    }

    if (Object.keys(recUpdates).length > 0) {
      const { error } = await supabase
        .from('recommendation_collaborations')
        .update(recUpdates)
        .eq('collaboration_id', collaborationId);

      if (error) throw error;
    }
  } else if (existing.collaboration_type === 'guidance') {
    const guidanceUpdates: Record<string, unknown> = {};
    if (updates.sessionType !== undefined) {
      guidanceUpdates.session_type = updates.sessionType;
    }
    if (updates.meetingUrl !== undefined) {
      guidanceUpdates.meeting_url = updates.meetingUrl;
    }
    if (updates.scheduledFor !== undefined) {
      // Ensure date is stored as UTC midnight to prevent timezone shifts
      const dateValue = updates.scheduledFor.includes('T')
        ? updates.scheduledFor
        : `${updates.scheduledFor}T00:00:00Z`;
      guidanceUpdates.scheduled_for = dateValue;
    }

    if (Object.keys(guidanceUpdates).length > 0) {
      const { error } = await supabase
        .from('guidance_collaborations')
        .update(guidanceUpdates)
        .eq('collaboration_id', collaborationId);

      if (error) throw error;
    }
  }

  // Re-fetch after updates so we only log when the DB actually changed.
  const updated = await getCollaborationById(collaborationId, userId);

  // Track ALL changes (base + type-specific) in a single array
  const allChanges: string[] = [];

  // Base fields (only if included in request)
  if (updates.status !== undefined && updated.status !== existing.status) {
    allChanges.push(`status: ${existing.status} → ${updated.status}`);
  }
  if (
    updates.awaitingActionFrom !== undefined &&
    updated.awaiting_action_from !== existing.awaiting_action_from
  ) {
    allChanges.push(
      `awaiting action from: ${existing.awaiting_action_from || 'none'} → ${updated.awaiting_action_from || 'none'}`
    );
  }
  if (
    updates.awaitingActionType !== undefined &&
    updated.awaiting_action_type !== existing.awaiting_action_type
  ) {
    allChanges.push(
      `awaiting action type: ${existing.awaiting_action_type || 'none'} → ${updated.awaiting_action_type || 'none'}`
    );
  }
  if (
    updates.nextActionDescription !== undefined &&
    updated.next_action_description !== existing.next_action_description
  ) {
    allChanges.push(
      `next action: ${existing.next_action_description || 'none'} → ${updated.next_action_description || 'none'}`
    );
  }
  if (updates.nextActionDueDate !== undefined) {
    const oldDate = existing.next_action_due_date ? String(existing.next_action_due_date).split('T')[0] : null;
    const newDate = updated.next_action_due_date ? String(updated.next_action_due_date).split('T')[0] : null;
    if (oldDate !== newDate) {
      allChanges.push(`due date: ${oldDate || 'none'} → ${newDate || 'none'}`);
    }
  }
  if (updates.notes !== undefined) {
    const oldNotes = existing.notes ?? null;
    const newNotes = updated.notes ?? null;
    if (oldNotes !== newNotes) allChanges.push('notes updated');
  }

  // Type-specific (only if included in request)
  if (existing.collaboration_type === 'essayReview') {
    if (updates.currentDraftVersion !== undefined && updated.currentDraftVersion !== existing.currentDraftVersion) {
      allChanges.push(`draft version updated to ${updated.currentDraftVersion ?? 'none'}`);
    }
    if (updates.feedbackRounds !== undefined && updated.feedbackRounds !== existing.feedbackRounds) {
      allChanges.push(`feedback rounds updated to ${updated.feedbackRounds ?? 'none'}`);
    }
    if (updates.lastFeedbackAt !== undefined && updated.lastFeedbackAt !== existing.lastFeedbackAt) {
      const dateOnly = String(updated.lastFeedbackAt).split('T')[0];
      allChanges.push(`feedback received on ${dateOnly}`);
    }
  } else if (existing.collaboration_type === 'recommendation') {
    if (updates.portalUrl !== undefined && (updated as any).portal_url !== (existing as any).portal_url) {
      allChanges.push(`portal URL ${(updated as any).portal_url ? 'updated' : 'removed'}`);
    }
    if (
      updates.questionnaireCompleted !== undefined &&
      (updated as any).questionnaire_completed !== (existing as any).questionnaire_completed
    ) {
      allChanges.push(
        `questionnaire ${(updated as any).questionnaire_completed ? 'completed' : 'marked incomplete'}`
      );
    }
  } else if (existing.collaboration_type === 'guidance') {
    if (updates.sessionType !== undefined && (updated as any).session_type !== (existing as any).session_type) {
      allChanges.push(`session type updated to ${(updated as any).session_type ?? 'none'}`);
    }
    if (updates.meetingUrl !== undefined && (updated as any).meeting_url !== (existing as any).meeting_url) {
      allChanges.push(`meeting URL ${(updated as any).meeting_url ? 'updated' : 'removed'}`);
    }
    if (updates.scheduledFor !== undefined && (updated as any).scheduled_for !== (existing as any).scheduled_for) {
      const dateOnly = String((updated as any).scheduled_for).split('T')[0];
      allChanges.push(`scheduled for ${dateOnly}`);
    }
  }

  // Create a single history record with ALL changes from this save operation
  if (allChanges.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Creating update history:', {
        collaborationId,
        changes: allChanges,
      });
    }

    const action = updates.status !== undefined && updates.status !== existing.status
      ? updates.status
      : 'updated';

    const details = allChanges.join(', ');

    const { error: historyError } = await supabase.from('collaboration_history').insert({
      collaboration_id: collaborationId,
      action,
      details,
    });

    if (historyError) {
      console.error('❌ Failed to create history entry:', {
        error: historyError.message,
        code: historyError.code,
        collaborationId,
        changes: allChanges,
      });
      throw historyError;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Update history created successfully');
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log('⏭️  No substantive changes detected, skipping history');
  }

  // Return updated collaboration
  return updated;
};

/**
 * Delete a collaboration
 */
export const deleteCollaboration = async (collaborationId: number, userId: number) => {
  // First verify ownership
  await getCollaborationById(collaborationId, userId);

  // Delete will cascade to type-specific tables
  const { data, error } = await supabase
    .from('collaborations')
    .delete()
    .eq('id', collaborationId)
    .select();

  if (error) {
    // Log error with context for troubleshooting
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Failed to delete collaboration:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        collaborationId,
        userId,
      });
    } else {
      console.error('❌ Failed to delete collaboration:', {
        error: error.message,
        code: error.code,
        collaborationId,
      });
    }
    throw error;
  }

  // Verify deletion succeeded
  if (process.env.NODE_ENV === 'development' && data) {
    console.log('✅ Collaboration deleted:', { collaborationId, deletedRows: data.length });
  }
};

/**
 * Add history entry to a collaboration
 */
export const addCollaborationHistory = async (
  collaborationId: number,
  userId: number,
  historyData: {
    action: string;
    details?: string;
  }
) => {
  // Verify ownership
  await getCollaborationById(collaborationId, userId);

  const { data, error } = await supabase
    .from('collaboration_history')
    .insert({
      collaboration_id: collaborationId,
      action: historyData.action,
      details: historyData.details,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Get collaboration history
 */
export const getCollaborationHistory = async (collaborationId: number, userId: number) => {
  // Verify ownership
  await getCollaborationById(collaborationId, userId);

  const { data, error } = await supabase
    .from('collaboration_history')
    .select('*')
    .eq('collaboration_id', collaborationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

/**
 * Generate a secure random token for invitation
 */
function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get collaboration with related data for sending invite
 */
async function getCollaborationForInvite(
  collaborationId: number,
  userId: number
) {
  const { data, error } = await supabase
    .from('collaborations')
    .select(`
      *,
      collaborators!inner(
        id,
        first_name,
        last_name,
        email,
        user_id
      ),
      applications!inner(
        id,
        scholarship_name,
        due_date,
        user_id
      )
    `)
    .eq('id', collaborationId)
    .single();

  if (error || !data) {
    throw new AppError('Collaboration not found', 404);
  }

  // Verify ownership through the application's user_id
  if (data.applications.user_id !== userId) {
    throw new AppError('Unauthorized', 403);
  }

  return data;
}

/**
 * Send collaboration invitation
 */
export const sendCollaborationInvitation = async (
  collaborationId: number,
  userId: number
) => {
  // Get collaboration with related data
  const collaboration = await getCollaborationForInvite(collaborationId, userId);

  // Generate secure token
  const inviteToken = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Get student name for email
  const { data: studentProfile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('id', userId)
    .single();

  const studentName =
    studentProfile?.first_name && studentProfile?.last_name
      ? `${studentProfile.first_name} ${studentProfile.last_name}`
      : 'A student';

  const collaboratorName =
    collaboration.collaborators.first_name && collaboration.collaborators.last_name
      ? `${collaboration.collaborators.first_name} ${collaboration.collaborators.last_name}`
      : collaboration.collaborators.email_address;

  // Send email via Resend
  const resendEmailId = await sendCollaborationInvite({
    collaboratorEmail: collaboration.collaborators.email_address,
    collaboratorName,
    collaborationType: collaboration.collaboration_type as 'recommendation' | 'essayReview' | 'guidance',
    studentName,
    applicationName: collaboration.applications.scholarship_name,
    inviteToken,
    // Pass through the stored date string to avoid timezone shifts in formatting
    dueDate: (collaboration.next_action_due_date as string | null) || (collaboration.applications.due_date as string | null) || undefined,
    notes: collaboration.notes || undefined,
  });

  // Create invite record
  const { data: invite, error: inviteError } = await supabase
    .from('collaboration_invites')
    .insert({
      collaboration_id: collaborationId,
      user_id: userId,
      invite_token: inviteToken,
      expires_at: expiresAt.toISOString(),
      resend_email_id: resendEmailId,
      delivery_status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (inviteError) {
    throw new AppError(`Failed to create invite record: ${inviteError.message}`, 500);
  }

  // Update collaboration status to 'invited'
  const { error: updateError } = await supabase
    .from('collaborations')
    .update({
      status: 'invited',
      awaiting_action_from: 'collaborator',
      awaiting_action_type: 'accept_invitation',
    })
    .eq('id', collaborationId);

  if (updateError) {
    throw new AppError(`Failed to update collaboration status: ${updateError.message}`, 500);
  }

  // Log action in history
  await addCollaborationHistory(collaborationId, userId, {
    action: 'invited',
    details: `Invitation sent to ${collaboration.collaborators.email_address}`,
  });

  return invite;
};

/**
 * Schedule collaboration invitation for later
 */
export const scheduleCollaborationInvitation = async (
  collaborationId: number,
  userId: number,
  scheduledFor: string
) => {
  // Verify collaboration exists and user owns it
  await getCollaborationForInvite(collaborationId, userId);

  // Generate secure token
  const inviteToken = generateInviteToken();
  const expiresAt = new Date(scheduledFor);
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from scheduled date

  // Create invite record (not sent yet)
  const { data: invite, error: inviteError } = await supabase
    .from('collaboration_invites')
    .insert({
      collaboration_id: collaborationId,
      user_id: userId,
      invite_token: inviteToken,
      expires_at: expiresAt.toISOString(),
      delivery_status: 'pending',
      // sent_at will be null until email is actually sent
    })
    .select()
    .single();

  if (inviteError) {
    throw new AppError(`Failed to create invite record: ${inviteError.message}`, 500);
  }

  // Log action in history
  await addCollaborationHistory(collaborationId, userId, {
    action: 'invite_scheduled',
    details: `Invitation scheduled for ${new Date(scheduledFor).toLocaleString()}`,
  });

  return invite;
};

/**
 * Resend collaboration invitation
 */
export const resendCollaborationInvitation = async (
  collaborationId: number,
  userId: number
) => {
  // Get collaboration with related data
  const collaboration = await getCollaborationForInvite(collaborationId, userId);

  // Find existing invite (get the most recent one)
  const { data: existingInvites, error: findError } = await supabase
    .from('collaboration_invites')
    .select('*')
    .eq('collaboration_id', collaborationId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (findError || !existingInvites || existingInvites.length === 0) {
    throw new AppError('No existing invitation found to resend', 404);
  }

  const existingInvite = existingInvites[0];

  // Check if invite is expired
  if (new Date(existingInvite.expires_at) < new Date()) {
    throw new AppError('Invitation has expired. Please send a new invitation.', 400);
  }

  // Generate new token (invalidate old one)
  const newInviteToken = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Get student name for email
  const { data: studentProfile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('id', userId)
    .single();

  const studentName =
    studentProfile?.first_name && studentProfile?.last_name
      ? `${studentProfile.first_name} ${studentProfile.last_name}`
      : 'A student';

  const collaboratorName =
    collaboration.collaborators.first_name && collaboration.collaborators.last_name
      ? `${collaboration.collaborators.first_name} ${collaboration.collaborators.last_name}`
      : collaboration.collaborators.email_address;

  // Send new email via Resend
  const resendEmailId = await sendCollaborationInvite({
    collaboratorEmail: collaboration.collaborators.email_address,
    collaboratorName,
    collaborationType: collaboration.collaboration_type as 'recommendation' | 'essayReview' | 'guidance',
    studentName,
    applicationName: collaboration.applications.scholarship_name,
    inviteToken: newInviteToken,
    // Pass through the stored date string to avoid timezone shifts in formatting
    dueDate: (collaboration.next_action_due_date as string | null) || (collaboration.applications.due_date as string | null) || undefined,
    notes: collaboration.notes || undefined,
  });

  // Update existing invite record with new token and email info
  const { data: updatedInvite, error: updateError } = await supabase
    .from('collaboration_invites')
    .update({
      invite_token: newInviteToken,
      expires_at: expiresAt.toISOString(),
      resend_email_id: resendEmailId,
      delivery_status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', existingInvite.id)
    .select()
    .single();

  if (updateError) {
    throw new AppError(`Failed to update invite record: ${updateError.message}`, 500);
  }

  // Log resend action in history
  await addCollaborationHistory(collaborationId, userId, {
    action: 'resend',
    details: `Invitation resent to ${collaboration.collaborators.email_address}`,
  });

  return updatedInvite;
};

