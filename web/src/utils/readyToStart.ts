import { DEADLINE_URGENCY_DAYS, type ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineDaysRemaining } from './deadline';

export function isReadyToStartApplication(application: ApplicationResponse): boolean {
  if (application.status !== 'Not Started') return false;

  const daysRemaining = getDeadlineDaysRemaining(application.dueDate);
  return daysRemaining === null || daysRemaining > DEADLINE_URGENCY_DAYS.WARNING;
}

export function sortReadyToStartApplications(
  applications: ApplicationResponse[],
): ApplicationResponse[] {
  return [...applications].sort((first, second) => {
    const firstDaysRemaining = getDeadlineDaysRemaining(first.dueDate);
    const secondDaysRemaining = getDeadlineDaysRemaining(second.dueDate);

    if (firstDaysRemaining !== null && secondDaysRemaining !== null && firstDaysRemaining !== secondDaysRemaining) {
      return firstDaysRemaining - secondDaysRemaining;
    }

    if (firstDaysRemaining !== null && secondDaysRemaining === null) return -1;
    if (firstDaysRemaining === null && secondDaysRemaining !== null) return 1;

    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
}
