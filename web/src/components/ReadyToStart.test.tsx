import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ReadyToStart from './ReadyToStart';

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

function renderReadyToStart(applications: ApplicationResponse[]) {
  return render(
    <MemoryRouter>
      <ReadyToStart applications={applications} />
    </MemoryRouter>,
  );
}

describe('ReadyToStart', () => {
  it('renders not-started applications outside the fourteen-day window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));

    renderReadyToStart([
      makeApplication({ id: 1, scholarshipName: 'Future Scholarship', dueDate: '2026-07-20' }),
      makeApplication({ id: 2, scholarshipName: 'Urgent Scholarship', dueDate: '2026-06-28' }),
      makeApplication({ id: 3, scholarshipName: 'Active Scholarship', status: 'In Progress', dueDate: '2026-07-20' }),
    ]);

    expect(screen.getByRole('heading', { name: 'Ready to start' })).toBeInTheDocument();
    expect(screen.getByText('Future Scholarship')).toBeInTheDocument();
    expect(screen.queryByText('Urgent Scholarship')).not.toBeInTheDocument();
    expect(screen.queryByText('Active Scholarship')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('sorts dated items by soonest deadline, then newest created date, with no-deadline items last', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));

    const { container } = renderReadyToStart([
      makeApplication({
        id: 1,
        scholarshipName: 'No Deadline Scholarship',
        dueDate: '',
        createdAt: '2026-06-20T00:00:00Z',
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Later Scholarship',
        dueDate: '2026-07-30',
        createdAt: '2026-06-20T00:00:00Z',
      }),
      makeApplication({
        id: 3,
        scholarshipName: 'Newest Same Deadline',
        dueDate: '2026-07-20',
        createdAt: '2026-06-19T00:00:00Z',
      }),
      makeApplication({
        id: 4,
        scholarshipName: 'Older Same Deadline',
        dueDate: '2026-07-20',
        createdAt: '2026-06-10T00:00:00Z',
      }),
    ]);

    const text = container.textContent ?? '';
    expect(text.indexOf('Newest Same Deadline')).toBeLessThan(text.indexOf('Older Same Deadline'));
    expect(text.indexOf('Older Same Deadline')).toBeLessThan(text.indexOf('Later Scholarship'));
    expect(text.indexOf('Later Scholarship')).toBeLessThan(text.indexOf('No Deadline Scholarship'));
    expect(screen.getByText('No deadline')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows a new badge for applications created within the last seven days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));

    renderReadyToStart([
      makeApplication({
        id: 1,
        scholarshipName: 'New Scholarship',
        createdAt: '2026-06-20T00:00:00Z',
      }),
    ]);

    expect(screen.getByText('New')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
