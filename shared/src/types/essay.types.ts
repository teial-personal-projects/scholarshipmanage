export type EssayStatus = 'not_started' | 'in_progress' | 'completed';

export interface Essay {
  essayId?: number;
  applicationId: number;
  theme?: string;
  units?: string;
  essayLink?: string;
  wordCount?: number;
  status?: EssayStatus;
  createdAt?: Date;
  updatedAt?: Date;
}