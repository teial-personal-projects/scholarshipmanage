import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GridView from './GridView';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

const makeApplication = (
  overrides: Partial<ApplicationResponse>,
): ApplicationResponse => ({
  id: 1,
  userId: 1,
  scholarshipName: 'Example Scholarship',
  organization: 'Example Org',
  targetType: 'Merit',
  status: 'Not Started',
  dueDate: '2026-07-20',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  ...overrides,
});

function renderGrid(applications: ApplicationResponse[]) {
  return render(
    <MemoryRouter>
      <GridView applications={applications} onApplicationOpen={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('GridView', () => {
  it('filters not-started applications with the same count as the radar', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));
    renderGrid([
      makeApplication({ id: 1, scholarshipName: 'Future Scholarship', dueDate: '2026-07-20' }),
      makeApplication({ id: 2, scholarshipName: 'Urgent Scholarship', dueDate: '2026-06-28' }),
      makeApplication({
        id: 3,
        scholarshipName: 'Active Scholarship',
        status: 'In Progress',
        dueDate: '2026-07-20',
      }),
    ]);

    expect(screen.getByRole('button', { name: 'Needs action (1)' })).toBeInTheDocument();
    expect(screen.getAllByText('Active Scholarship').length).toBeGreaterThan(0);
    expect(screen.queryByText('Future Scholarship')).not.toBeInTheDocument();
    expect(screen.queryByText('Urgent Scholarship')).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Not Started (2)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Not Started (2)' }));

    expect(screen.getAllByText('Future Scholarship').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Urgent Scholarship').length).toBeGreaterThan(0);
    expect(screen.queryByText('Active Scholarship')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
