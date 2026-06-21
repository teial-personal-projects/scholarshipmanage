import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ActionFeed from './ActionFeed';

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

function renderFeed(applications: ApplicationResponse[]) {
  return render(
    <MemoryRouter>
      <ActionFeed applications={applications} />
    </MemoryRouter>,
  );
}

describe('ActionFeed', () => {
  it('groups active applications by deadline tier and hides decided applications', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));

    renderFeed([
      makeApplication({ id: 1, scholarshipName: 'Late Scholarship', dueDate: '2026-06-20' }),
      makeApplication({ id: 2, scholarshipName: 'Soon Scholarship', dueDate: '2026-06-24' }),
      makeApplication({ id: 3, scholarshipName: 'Warning Scholarship', dueDate: '2026-07-02' }),
      makeApplication({ id: 4, scholarshipName: 'Submitted Scholarship', status: 'Submitted' }),
    ]);

    expect(screen.getByRole('heading', { name: 'Overdue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Due this week' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Next two weeks' })).toBeInTheDocument();
    expect(screen.getByText('Late Scholarship')).toBeInTheDocument();
    expect(screen.getByText('Soon Scholarship')).toBeInTheDocument();
    expect(screen.getByText('Warning Scholarship')).toBeInTheDocument();
    expect(screen.queryByText('Submitted Scholarship')).not.toBeInTheDocument();
    expect(screen.getByText(/1 submitted or decided/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders waiting rows with the manual next action', () => {
    renderFeed([
      makeApplication({
        id: 1,
        currentAction: 'Waiting for recommendation letter',
      }),
    ]);

    expect(screen.getByText('Waiting for recommendation letter')).toBeInTheDocument();
  });
});
