import { describe, expect, it, vi } from 'vitest';

import { getDashboardMetrics } from './dashboardMetrics';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

const makeApplication = (
  overrides: Partial<ApplicationResponse>,
): ApplicationResponse => ({
  id: 1,
  userId: 1,
  scholarshipName: 'Example Scholarship',
  organization: 'Example Org',
  targetType: 'Merit',
  status: 'In Progress',
  dueDate: '2026-06-30',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  ...overrides,
});

describe('getDashboardMetrics', () => {
  it('summarizes application progress and status distribution', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 23));

    const metrics = getDashboardMetrics([
      makeApplication({ id: 1, status: 'In Progress', dueDate: '2026-06-25' }),
      makeApplication({ id: 2, status: 'In Progress', dueDate: '2026-07-04' }),
      makeApplication({ id: 3, status: 'Submitted', dueDate: '2026-06-24' }),
      makeApplication({ id: 4, status: 'Not Started', dueDate: '2026-06-28' }),
      makeApplication({ id: 5, status: 'In Progress', dueDate: '2026-05-01' }),
      makeApplication({ id: 6, status: 'Not Awarded', dueDate: '2026-05-02' }),
      makeApplication({ id: 9, status: 'Awarded', dueDate: '2026-05-03' }),
      makeApplication({
        id: 7,
        status: 'In Progress',
        dueDate: '2026-07-20',
        collaborations: [{ collaborationType: 'recommendation', status: 'pending' }],
      }),
      makeApplication({
        id: 8,
        status: 'Not Started',
        dueDate: '2026-07-21',
        essays: [{ status: 'not_started' }],
      }),
    ]);

    expect(metrics.summary).toEqual([
      { label: 'Total Applications', value: 9 },
      { label: 'Dependencies', value: 2 },
      { label: 'Overdue', value: 1 },
      { label: 'Due this week', value: 2 },
      { label: 'Due next 2 weeks', value: 1 },
      { label: 'Not started', value: 2 },
      { label: 'Submitted', value: 1 },
      { label: 'Awarded', value: 1 },
    ]);
    expect(metrics.statusMetrics).toEqual([
      { status: 'Not Started', label: 'Not Started', value: 2, percentage: 22 },
      { status: 'In Progress', label: 'In Progress', value: 4, percentage: 44 },
      { status: 'Submitted', label: 'Submitted', value: 1, percentage: 11 },
      { status: 'Awarded', label: 'Awarded', value: 1, percentage: 11 },
      { status: 'Not Awarded', label: 'Closed', value: 1, percentage: 11 },
    ]);

    vi.useRealTimers();
  });
});
