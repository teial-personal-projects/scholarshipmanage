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

function renderGrid(applications: ApplicationResponse[], onDelete?: (id: number) => Promise<void>) {
  return render(
    <MemoryRouter>
      <GridView applications={applications} onApplicationOpen={vi.fn()} onDelete={onDelete} />
    </MemoryRouter>,
  );
}

describe('GridView', () => {
  it('defaults to all applications when no applications need action', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Future Scholarship',
        status: 'Not Started',
        dueDate: '2026-07-20',
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Submitted Scholarship',
        status: 'Submitted',
        dueDate: '2026-07-20',
      }),
    ]);

    expect(screen.getByRole('button', { name: 'Needs action (0)' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'All (2)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Future Scholarship').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Submitted Scholarship').length).toBeGreaterThan(0);
  });

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

  it('shows pending essay and recommendation counts in application rows', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Pending Work Scholarship',
        status: 'In Progress',
        essays: [
          { status: 'completed' },
          { status: 'not_started' },
        ],
        recommendations: [
          { status: 'Pending' },
        ],
      }),
    ]);

    expect(screen.getAllByText('Essays 1 left').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recs 1 pending').length).toBeGreaterThan(0);
  });

  it('shows delete controls when deletion is available', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Deletable Scholarship',
        status: 'Not Started',
      }),
    ], vi.fn());

    expect(screen.getAllByRole('button', { name: 'Delete Deletable Scholarship' }).length).toBeGreaterThan(0);
  });

  it('includes pending recommendations in waiting on others', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Recommendation Scholarship',
        status: 'In Progress',
        essays: [{ status: 'completed' }],
        recommendations: [{ status: 'Pending' }],
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Action Scholarship',
        status: 'In Progress',
        dueDate: '2026-07-21',
      }),
    ]);

    expect(screen.getByRole('button', { name: 'Waiting on others (1)' })).toBeInTheDocument();
    expect(screen.queryByText('Recommendation Scholarship')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Waiting on others (1)' }));

    expect(screen.getAllByText('Recommendation Scholarship').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Waiting for recommendation').length).toBeGreaterThan(0);
    expect(screen.queryByText('Action Scholarship')).not.toBeInTheDocument();
  });
});
