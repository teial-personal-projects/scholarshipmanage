export type EssayStatus = 'not_started' | 'in_progress' | 'awaiting_review' | 'completed';

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

export const isEssayComplete = (essay: Pick<Essay, 'status'>): boolean => essay.status === 'completed';

export const essayProgress = (
  source: { essays?: readonly Pick<Essay, 'status'>[] | null },
): { done: number; total: number } => {
  const essays = source.essays ?? [];

  return {
    done: essays.filter(isEssayComplete).length,
    total: essays.length,
  };
};
