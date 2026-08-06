import {
  APPLICATION_STATUSES,
  type ApplicationResponse,
  type TApplicationStatus,
} from '@scholarshipmanage/shared';

import { filterApplicationsByRadar } from './deadlineRadar';
import { applicationNeedsAction } from './needsAction';

export interface DashboardMetric {
  label: string;
  value: number;
}

export interface ApplicationStatusMetric {
  status: TApplicationStatus;
  label: string;
  value: number;
  percentage: number;
}

export interface DashboardMetrics {
  totalApplications: number;
  overdue: number;
  needsAction: number;
  dueThisWeek: number;
  dueNextTwoWeeks: number;
  notStarted: number;
  submitted: number;
  awarded: number;
  inProgress: number;
  summary: DashboardMetric[];
  statusMetrics: ApplicationStatusMetric[];
}

const STATUS_LABELS: Record<TApplicationStatus, string> = {
  'Not Started': 'Not Started',
  'In Progress': 'In Progress',
  Submitted: 'Submitted',
  Awarded: 'Awarded',
  'Not Awarded': 'Closed',
};

function countByStatus(
  applications: readonly ApplicationResponse[],
  status: TApplicationStatus,
): number {
  return applications.filter((application) => application.status === status).length;
}

export function getDashboardMetrics(
  applications: readonly ApplicationResponse[],
): DashboardMetrics {
  const totalApplications = applications.length;
  const overdue = filterApplicationsByRadar([...applications], 'overdue').length;
  const needsAction = applications.filter(applicationNeedsAction).length;
  const dueThisWeek = filterApplicationsByRadar([...applications], 'dueThisWeek').length;
  const dueNextTwoWeeks = filterApplicationsByRadar([...applications], 'nextTwoWeeks').length;
  const notStarted = filterApplicationsByRadar([...applications], 'notStarted').length;
  const submitted = countByStatus(applications, 'Submitted');
  const awarded = countByStatus(applications, 'Awarded');
  const inProgress = countByStatus(applications, 'In Progress');

  const summary = [
    { label: 'Total Applications', value: totalApplications },
    { label: 'Dependencies', value: needsAction },
    { label: 'Overdue', value: overdue },
    { label: 'Due this week', value: dueThisWeek },
    { label: 'Due next 2 weeks', value: dueNextTwoWeeks },
    { label: 'Not started', value: notStarted },
    { label: 'Submitted', value: submitted },
    { label: 'Awarded', value: awarded },
  ];

  const statusMetrics = APPLICATION_STATUSES.map((status) => {
    const value = countByStatus(applications, status);
    const percentage = totalApplications === 0 ? 0 : Math.round((value / totalApplications) * 100);

    return {
      status,
      label: STATUS_LABELS[status],
      value,
      percentage,
    };
  });

  return {
    totalApplications,
    overdue,
    needsAction,
    dueThisWeek,
    dueNextTwoWeeks,
    notStarted,
    submitted,
    awarded,
    inProgress,
    summary,
    statusMetrics,
  };
}
