import type { CollaborationStatus, EssayStatus } from '@scholarshipmanage/shared';

export interface EssayDraft {
  localId: string;
  id?: number;
  theme: string;
  status: EssayStatus;
  wordCount: string;
  essayLink: string;
  isDeleted: boolean;
}

export interface RecommendationDraft {
  localId: string;
  id?: number;
  recommenderId: number | '';
  status: CollaborationStatus;
  dueDate: string;
  isDeleted: boolean;
}

export function createBlankEssayDraft(): EssayDraft {
  return {
    localId: `new-essay-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    theme: '',
    status: 'not_started',
    wordCount: '',
    essayLink: '',
    isDeleted: false,
  };
}

export function createBlankRecommendationDraft(): RecommendationDraft {
  return {
    localId: `new-rec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    recommenderId: '',
    status: 'pending',
    dueDate: '',
    isDeleted: false,
  };
}

export function toOptionalNumber(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;
  const parsedValue = Number(trimmedValue);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

export function toEssayPayload(draft: EssayDraft) {
  const wordCount = toOptionalNumber(draft.wordCount);

  return {
    theme: draft.theme.trim() || undefined,
    status: draft.status,
    wordCount: wordCount && wordCount > 0 ? wordCount : undefined,
    essayLink: draft.essayLink.trim() || undefined,
  };
}

export function getComparableEssayDrafts(drafts: EssayDraft[]): EssayDraft[] {
  return drafts.map((draft) => ({
    ...draft,
    localId: draft.id ? `essay-${draft.id}` : draft.localId,
  }));
}
