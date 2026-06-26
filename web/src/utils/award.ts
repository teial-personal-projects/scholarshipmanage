import type { ApplicationResponse } from '@scholarshipmanage/shared';

export function formatMinimumAwardAmount(application: Pick<ApplicationResponse, 'minAward'>): string {
  return application.minAward == null ? '-' : `$${application.minAward.toLocaleString()}`;
}
