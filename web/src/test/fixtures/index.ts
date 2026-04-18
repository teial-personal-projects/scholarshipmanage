/**
 * Frontend Test Fixtures
 * Sample data for testing components
 */

import type {
  UserProfile,
  ApplicationResponse,
  EssayResponse,
  CollaboratorResponse,
  CollaborationResponse
} from '@scholarship-hub/shared';

/**
 * Mock Users
 */
export const mockUsers: Record<string, UserProfile> = {
  student1: {
    id: 1,
    authUserId: 'auth-user-1',
    emailAddress: 'student1@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    applicationRemindersEnabled: true,
    collaborationRemindersEnabled: true,
  },
};

/**
 * Mock Applications
 */
export const mockApplications: Record<string, ApplicationResponse> = {
  inProgress: {
    id: 1,
    userId: 1,
    scholarshipName: 'Merit Scholarship',
    organization: 'State University',
    targetType: 'Merit',
    maxAward: 5000,
    dueDate: '2024-12-31',
    status: 'In Progress',
    applicationLink: 'https://example.com/scholarship1',
    theme: 'A merit-based scholarship',
    requirements: 'GPA 3.5+, Essay, Two recommendation letters',
    submissionDate: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  submitted: {
    id: 2,
    userId: 1,
    scholarshipName: 'Community Service Award',
    organization: 'Local Foundation',
    targetType: 'Merit',
    maxAward: 2500,
    dueDate: '2024-11-30',
    status: 'Submitted',
    applicationLink: 'https://example.com/scholarship2',
    theme: 'For students with outstanding community service',
    requirements: 'Community service hours, Essay',
    submissionDate: '2024-11-15T00:00:00Z',
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
  },
  merit1: {
    id: 3,
    userId: 1,
    scholarshipName: 'Merit Scholarship',
    targetType: 'Merit' as const,
    organization: 'State University',
    minAward: 5000,
    maxAward: 5000,
    dueDate: '2024-12-31',
    status: 'In Progress' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  need1: {
    id: 4,
    userId: 1,
    scholarshipName: 'Need-Based Grant',
    targetType: 'Need' as const,
    organization: 'Financial Aid Office',
    minAward: 3000,
    maxAward: 3000,
    dueDate: '2024-12-15',
    status: 'In Progress' as const,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  merit2: {
    id: 5,
    userId: 1,
    scholarshipName: 'Academic Excellence Award',
    targetType: 'Merit' as const,
    organization: 'Academic Foundation',
    minAward: 7500,
    maxAward: 7500,
    dueDate: '2025-01-15',
    status: 'In Progress' as const,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
};

/**
 * Mock Essays
 */
export const mockEssays: Record<string, EssayResponse> = {
  personalStatement: {
    id: 1,
    applicationId: 1,
    theme: 'Personal Statement',
    wordCount: 500,
    essayLink: 'https://docs.google.com/document/d/abc123',
    status: 'in_progress',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  draft: {
    id: 2,
    applicationId: 1,
    theme: 'Draft Essay',
    wordCount: 150,
    essayLink: null,
    status: 'not_started',
    createdAt: '2024-01-09T00:00:00Z',
    updatedAt: '2024-01-09T00:00:00Z',
  },
};

/**
 * Mock Collaborators
 */
export const mockCollaborators: Record<string, CollaboratorResponse> = {
  teacher: {
    id: 1,
    userId: 1,
    firstName: 'Sarah',
    lastName: 'Johnson',
    emailAddress: 'teacher@school.edu',
    relationship: 'Teacher',
    phoneNumber: '+1234567891',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  counselor: {
    id: 2,
    userId: 1,
    firstName: 'Michael',
    lastName: 'Brown',
    emailAddress: 'counselor@school.edu',
    relationship: 'Counselor',
    phoneNumber: '+1234567892',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  teacher1: {
    id: 3,
    userId: 1,
    firstName: 'Sarah',
    lastName: 'Johnson',
    emailAddress: 'teacher@school.edu',
    relationship: 'Teacher',
    phoneNumber: '+1234567891',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  counselor1: {
    id: 4,
    userId: 1,
    firstName: 'Michael',
    lastName: 'Brown',
    emailAddress: 'counselor@school.edu',
    relationship: 'Counselor',
    phoneNumber: '+1234567892',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  mentor1: {
    id: 5,
    userId: 1,
    firstName: 'Emily',
    lastName: 'Davis',
    emailAddress: 'mentor@example.com',
    relationship: 'Mentor',
    phoneNumber: '+1234567893',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
};

/**
 * Mock Collaborations
 */
export const mockCollaborations: Record<string, CollaborationResponse> = {
  recommendationPending: {
    id: 1,
    userId: 1,
    collaboratorId: 1,
    applicationId: 1,
    collaborationType: 'recommendation',
    status: 'pending',
    awaitingActionFrom: 'student',
    awaitingActionType: null,
    nextActionDescription: 'Send invitation to collaborator',
    nextActionDueDate: '2024-12-15',
    notes: 'Need letter for Merit Scholarship',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  essayReviewInProgress: {
    id: 2,
    userId: 1,
    collaboratorId: 2,
    applicationId: 1,
    collaborationType: 'essayReview',
    status: 'in_progress',
    awaitingActionFrom: 'collaborator',
    awaitingActionType: 'essayFeedback',
    nextActionDescription: 'Provide feedback on essay',
    nextActionDueDate: '2024-12-18',
    notes: 'Personal statement review',
    createdAt: '2024-01-14T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
};

/**
 * Helper to create mock user
 */
export function createMockUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return { ...mockUsers.student1, ...overrides };
}

/**
 * Helper to create mock application
 */
export function createMockApplication(overrides: Partial<ApplicationResponse> = {}): ApplicationResponse {
  return { ...mockApplications.inProgress, ...overrides };
}

/**
 * Helper to create mock essay
 */
export function createMockEssay(overrides: Partial<EssayResponse> = {}): EssayResponse {
  return { ...mockEssays.personalStatement, ...overrides };
}

/**
 * Helper to create mock collaborator
 */
export function createMockCollaborator(overrides: Partial<CollaboratorResponse> = {}): CollaboratorResponse {
  return { ...mockCollaborators.teacher, ...overrides };
}

/**
 * Helper to create mock collaboration
 */
export function createMockCollaboration(overrides: Partial<CollaborationResponse> = {}): CollaborationResponse {
  return { ...mockCollaborations.recommendationPending, ...overrides };
}
