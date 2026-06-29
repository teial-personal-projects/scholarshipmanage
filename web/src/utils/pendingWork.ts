import { essayProgress, type ApplicationResponse } from '@scholarshipmanage/shared';

export interface PendingWorkChip {
  key: 'essays' | 'recommendations' | 'essayReviews';
  label: string;
}

export function getPendingWorkChips(application: ApplicationResponse): PendingWorkChip[] {
  const chips: PendingWorkChip[] = [];
  const essayCounts = essayProgress(application);
  const essaysLeft = essayCounts.total - essayCounts.done;
  const recommendationsPending = (application.collaborations ?? [])
    .filter((collaboration) =>
      collaboration.collaborationType === 'recommendation' &&
      collaboration.status !== 'completed' &&
      collaboration.status !== 'declined'
    )
    .length;
  const essayReviewsPending = (application.collaborations ?? [])
    .filter((collaboration) =>
      collaboration.collaborationType === 'essayReview' &&
      collaboration.status !== 'completed' &&
      collaboration.status !== 'declined'
    )
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

  if (essayReviewsPending > 0) {
    chips.push({
      key: 'essayReviews',
      label: essayReviewsPending === 1 ? 'Essay feedback pending' : `Essay feedback ${essayReviewsPending} pending`,
    });
  }

  return chips;
}
