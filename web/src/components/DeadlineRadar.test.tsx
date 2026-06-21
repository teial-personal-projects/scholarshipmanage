import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DeadlineRadar from './DeadlineRadar';
import { filterApplicationsByRadar } from '../utils/deadlineRadar';

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
  dueDate: '2026-06-21',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  ...overrides,
});

const applications: ApplicationResponse[] = [
  makeApplication({ id: 1, dueDate: '2026-06-20' }),
  makeApplication({ id: 2, dueDate: '2026-06-24' }),
  makeApplication({ id: 3, dueDate: '2026-07-02' }),
  makeApplication({ id: 4, status: 'Not Started', dueDate: '2026-07-30' }),
  makeApplication({ id: 5, status: 'Submitted', dueDate: '2026-06-20' }),
];

describe('filterApplicationsByRadar', () => {
  it('filters applications by radar group', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));

    expect(filterApplicationsByRadar(applications, 'overdue').map((app) => app.id)).toEqual([1]);
    expect(filterApplicationsByRadar(applications, 'dueThisWeek').map((app) => app.id)).toEqual([2]);
    expect(filterApplicationsByRadar(applications, 'nextTwoWeeks').map((app) => app.id)).toEqual([3]);
    expect(filterApplicationsByRadar(applications, 'notStarted').map((app) => app.id)).toEqual([4]);

    vi.useRealTimers();
  });
});

describe('DeadlineRadar', () => {
  it('renders compact count tiles', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));

    render(<DeadlineRadar applications={applications} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Due this week')).toBeInTheDocument();
    expect(screen.getByText('Next two weeks')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(4);

    vi.useRealTimers();
  });

  it('toggles the selected filter when a tile is clicked', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <DeadlineRadar
        applications={applications}
        selectedFilter="overdue"
        onFilterChange={onFilterChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /overdue/i }));

    expect(onFilterChange).toHaveBeenCalledWith(null);
  });
});
