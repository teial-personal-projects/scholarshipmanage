import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineUrgency } from './deadline';

export type DeadlineRadarFilter = 'overdue' | 'dueThisWeek' | 'nextTwoWeeks' | 'notStarted';

export function filterApplicationsByRadar(
  applications: ApplicationResponse[],
  filter: DeadlineRadarFilter | null,
): ApplicationResponse[] {
  if (!filter) return applications;

  return applications.filter((application) => {
    if (filter === 'notStarted') return application.status === 'Not Started';

    const urgency = getDeadlineUrgency(application.dueDate, application.status);
    if (filter === 'overdue') return urgency === 'overdue';
    if (filter === 'dueThisWeek') return urgency === 'critical';
    return urgency === 'warning';
  });
}
