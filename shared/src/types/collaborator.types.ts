export type CollaborationType = 'recommendation' | 'essayReview' | 'guidance';
export type CollaborationStatus =
  | 'pending'
  | 'invited'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'declined';

export type ActionOwner = 'student' | 'collaborator' | null;

// Type-specific action types
export type EssayActionType =
  | 'acceptance'
  | 'essayDraft'
  | 'essayFeedback'
  | 'essayRevision'
  | 'finalApproval';

export type RecommendationActionType =
  | 'acceptance'
  | 'completeQuestionnaire'
  | 'providePortalUrl'
  | 'uploadLetter'
  | 'submitToPortal'
  | 'confirmation';

export type GuidanceActionType =
  | 'acceptance'
  | 'scheduleSession'
  | 'attendSession'
  | 'followUp'
  | 'reviewProgress';

export type CollaborationActionType =
  | EssayActionType
  | RecommendationActionType
  | GuidanceActionType;

export interface Collaborator {
  collaboratorId?: number;
  userId?: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  relationship?: string;
  phoneNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Base collaboration interface with common fields
export interface BaseCollaboration {
  collaborationId?: number;
  userId: number;
  collaboratorId: number;
  applicationId: number;
  collaborationType: CollaborationType;
  status: CollaborationStatus;

  // Action tracking - who needs to act next
  awaitingActionFrom: ActionOwner;
  awaitingActionType?: CollaborationActionType;
  nextActionDescription?: string;
  nextActionDueDate?: Date;

  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Essay Review specific collaboration
export interface EssayReviewCollaboration extends BaseCollaboration {
  collaborationType: 'essayReview';
  awaitingActionType?: EssayActionType;

  // Essay-specific tracking fields
  currentDraftVersion?: number;
  feedbackRounds?: number;
  lastFeedbackAt?: Date;
}

// Recommendation specific collaboration
export interface RecommendationCollaboration extends BaseCollaboration {
  collaborationType: 'recommendation';
  awaitingActionType?: RecommendationActionType;

  // Recommendation-specific fields
  portalUrl?: string;
  questionnaireCompleted?: boolean;
  letterSubmittedAt?: Date;
  
  // Due date is required for recommendations
  nextActionDueDate: Date;
}

// Guidance/Counseling specific collaboration
export interface GuidanceCollaboration extends BaseCollaboration {
  collaborationType: 'guidance';
  awaitingActionType?: GuidanceActionType;

  // Guidance-specific fields
  sessionType?: 'initial' | 'followup' | 'final';
  meetingUrl?: string;
  scheduledFor?: Date;
}

// Discriminated union type for all collaborations
export type Collaboration =
  | EssayReviewCollaboration
  | RecommendationCollaboration
  | GuidanceCollaboration;

export interface CollaborationHistory {
  id?: number;
  collaborationId: number;
  action: string;
  details?: string;
  createdAt?: Date;
}
