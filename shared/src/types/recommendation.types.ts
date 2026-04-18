import type { TRecommendationStatus } from './application.constants.js';

export interface Recommendation {
  recommendationId?: number;
  applicationId: number;
  recommenderId: number;
  submittedAt?: Date | null;
  dueDate?: Date | null;
  status: TRecommendationStatus;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface RecommendationHistory {
  id?: number;
  recommendationId: number;
  action: string; // 'invited', 'reminder_sent', 'viewed', 'uploaded', etc.
  details?: string;
  createdAt?: Date;
}