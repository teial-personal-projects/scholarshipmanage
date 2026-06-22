import {
  essayProgress,
  isApplicationDone,
  type ApplicationResponse,
  type Essay,
  type Recommendation,
} from '@scholarshipmanage/shared';

export type ActionKind = 'essays' | 'submit' | 'start' | 'waiting' | 'none';

export interface NextAction {
  label: string;
  kind: ActionKind;
  actionable: boolean;
}

type ApplicationWithEssays = ApplicationResponse & {
  essays?: readonly Pick<Essay, 'status'>[] | null;
  recommendations?: readonly Pick<Recommendation, 'status'>[] | null;
};

const WAITING_KEYWORDS = ['waiting', 'recommendation', 'pending'];

function getPendingRecommendationCount(app: ApplicationWithEssays): number {
  return (app.recommendations ?? [])
    .filter((recommendation) => recommendation.status !== 'Submitted')
    .length;
}

export function looksLikeWaiting(text: string | null | undefined): text is string {
  if (!text) return false;

  const normalizedText = text.toLowerCase();
  return WAITING_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
}

export function deriveNextAction(app: ApplicationWithEssays): NextAction {
  if (isApplicationDone(app.status)) {
    return { label: '', kind: 'none', actionable: false };
  }

  const pendingRecommendations = getPendingRecommendationCount(app);
  if (pendingRecommendations > 0) {
    return {
      label: pendingRecommendations === 1 ? 'Waiting for recommendation' : `Waiting for ${pendingRecommendations} recommendations`,
      kind: 'waiting',
      actionable: false,
    };
  }

  const { done, total } = essayProgress(app);
  const essaysLeft = total - done;
  if (essaysLeft > 0) {
    const tail = essaysLeft === 1 ? ', then submit' : '';

    return {
      label: `Finish ${essaysLeft} of ${total} essays${tail}`,
      kind: 'essays',
      actionable: true,
    };
  }

  if (looksLikeWaiting(app.currentAction)) {
    return { label: app.currentAction, kind: 'waiting', actionable: false };
  }

  if (app.status === 'Not Started') {
    return { label: 'Start application', kind: 'start', actionable: true };
  }

  return { label: 'Review and submit', kind: 'submit', actionable: true };
}
