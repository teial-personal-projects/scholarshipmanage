import { essayProgress, type ApplicationResponse } from '@scholarshipmanage/shared';

export interface PendingWorkChip {
  key: 'essays' | 'recommendations';
  label: string;
}

export function getPendingWorkChips(application: ApplicationResponse): PendingWorkChip[] {
  const chips: PendingWorkChip[] = [];
  const essayCounts = essayProgress(application);
  const essaysLeft = essayCounts.total - essayCounts.done;
  const recommendationsPending = (application.recommendations ?? [])
    .filter((recommendation) => recommendation.status !== 'Submitted')
    .length;

  if (essaysLeft > 0) {
    chips.push({
      key: 'essays',
      label: `Essays ${essaysLeft} left`,
    });
  }

  if (recommendationsPending > 0) {
    chips.push({
      key: 'recommendations',
      label: `Recs ${recommendationsPending} pending`,
    });
  }

  return chips;
}
