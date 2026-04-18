/**
 * API Response Types
 * These types represent the actual shape of data returned from API endpoints
 * after snake_case to camelCase conversion
 */

import type { TApplicationStatus, TTargetType } from './application.constants.js';
import type {
  CollaborationType,
  CollaborationStatus,
  ActionOwner,
  CollaborationActionType
} from './collaborator.types.js';

/**
 * User Profile (from GET /api/users/me)
 */
export interface UserProfile {
  id: number;
  authUserId: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string;
  phoneNumber: string | null;
  applicationRemindersEnabled?: boolean;
  collaborationRemindersEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  searchPreferences?: UserSearchPreferencesResponse | null;
}

/**
 * User Search Preferences (from GET /api/users/me/search-preferences)
 */
export interface UserSearchPreferencesResponse {
  id: number;
  userId: number;
  targetType?: string | null;
  subjectAreas?: string[] | null;
  gender?: string | null;
  ethnicity?: string | null;
  minAward?: number | null;
  geographicRestrictions?: string | null;
  essayRequired?: boolean | null;
  recommendationRequired?: boolean | null;
  academicLevel?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Application (from GET /api/applications)
 */
export interface ApplicationResponse {
  id: number;
  userId: number;
  scholarshipName: string;
  targetType: TTargetType | null;
  organization: string | null;
  orgWebsite?: string | null;
  platform?: string | null;
  applicationLink?: string | null;
  theme?: string | null;
  minAward?: number | null;
  maxAward?: number | null;
  requirements?: string | null;
  renewable?: boolean | null;
  renewableTerms?: string | null;
  currentAction?: string | null;
  status: TApplicationStatus;
  submissionDate?: string | null;
  openDate?: string | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Collaboration Invite (from collaboration_invites table)
 */
export interface CollaborationInvite {
  id: number;
  inviteToken: string;
  sentAt: string | null;
  expiresAt: string;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  openedAt?: string | null;
  clickedAt?: string | null;
  resendEmailId?: string | null;
}

/**
 * Collaboration (from GET /api/collaborations)
 */
export interface CollaborationResponse {
  id: number;
  collaborationId?: number; // Alias for id for backwards compatibility
  collaboratorId: number;
  applicationId: number;
  userId: number;
  collaborationType: CollaborationType;
  status: CollaborationStatus;
  awaitingActionFrom: ActionOwner;
  awaitingActionType?: CollaborationActionType | null;
  nextActionDescription?: string | null;
  nextActionDueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  // Essay review specific
  currentDraftVersion?: number;
  feedbackRounds?: number;
  lastFeedbackAt?: string;
  // Recommendation specific
  portalUrl?: string;
  questionnaireCompleted?: boolean;
  letterSubmittedAt?: string;
  // Guidance specific
  sessionType?: 'initial' | 'followup' | 'final';
  meetingUrl?: string;
  scheduledFor?: string;
  // Invitation data (most recent invite)
  invite?: CollaborationInvite | null;
}

/**
 * Collaboration response with potential snake_case field names
 * Used for defensive handling of API responses that may use either camelCase or snake_case
 */
export type CollaborationResponseWithSnakeCase = CollaborationResponse & {
  collaboration_type?: string;
};

/**
 * Collaborator (from GET /api/collaborators)
 */
export interface CollaboratorResponse {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  relationship?: string | null;
  phoneNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Essay (from GET /api/essays)
 */
export interface EssayResponse {
  id: number;
  applicationId: number;
  theme?: string | null;
  wordCount?: number | null;
  essayLink?: string | null;
  status?: 'not_started' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt?: string;
}

/**
 * Recommendation (from GET /api/recommendations)
 */
export interface RecommendationResponse {
  id: number;
  applicationId: number;
  recommenderId: number;
  status: 'Pending' | 'Submitted';
  submittedAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt?: string;
}
