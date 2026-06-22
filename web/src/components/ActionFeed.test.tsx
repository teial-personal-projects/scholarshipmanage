import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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

    const { container } = renderFeed([
      makeApplication({ id: 1, scholarshipName: 'Late Scholarship', dueDate: '2026-06-18' }),
      makeApplication({
        id: 2,
        scholarshipName: 'Waiting Scholarship',
        dueDate: '2026-06-22',
        currentAction: 'Waiting for recommendation letter',
      }),
      makeApplication({ id: 5, scholarshipName: 'Soon Scholarship', dueDate: '2026-06-24' }),
      makeApplication({ id: 3, scholarshipName: 'Warning Scholarship', dueDate: '2026-07-02' }),
      makeApplication({ id: 6, scholarshipName: 'No Deadline Scholarship', dueDate: '' }),
      makeApplication({ id: 4, scholarshipName: 'Submitted Scholarship', status: 'Submitted' }),
    ]);

    expect(screen.getByRole('heading', { name: 'Overdue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Due this week' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Next two weeks' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No deadline set' })).toBeInTheDocument();
    expect(screen.getByText('Late Scholarship')).toBeInTheDocument();
    expect(screen.getByText('3 days overdue')).toBeInTheDocument();
    expect(screen.getByText('Soon Scholarship')).toBeInTheDocument();
    expect(screen.getByText('Waiting Scholarship')).toBeInTheDocument();
    expect(screen.getByText('Warning Scholarship')).toBeInTheDocument();
    expect(screen.getByText('No Deadline Scholarship')).toBeInTheDocument();
    expect(screen.getByText('No deadline')).toBeInTheDocument();
    expect(screen.queryByText('Submitted Scholarship')).not.toBeInTheDocument();
    expect(screen.getByText(/1 submitted or decided/)).toBeInTheDocument();

    const feedText = container.textContent ?? '';
    expect(feedText.indexOf('Soon Scholarship')).toBeLessThan(feedText.indexOf('Waiting Scholarship'));
    expect(feedText.indexOf('No deadline set')).toBeGreaterThan(feedText.indexOf('Next two weeks'));
    expect(feedText.indexOf('1 submitted or decided')).toBeGreaterThan(feedText.indexOf('No deadline set'));

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

  it('includes ready-to-start applications in deadline groups when no separate section is rendered', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));

    const { container } = renderFeed([
      makeApplication({
        id: 1,
        scholarshipName: 'Pinned Scholarship',
        status: 'Not Started',
        dueDate: '2026-07-20',
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Urgent Start Scholarship',
        status: 'Not Started',
        dueDate: '2026-06-28',
      }),
    ]);

    expect(screen.queryByRole('heading', { name: 'Ready to start' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Due this week' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Later' })).toBeInTheDocument();
    expect(screen.getByText('Pinned Scholarship')).toBeInTheDocument();
    expect(screen.getByText('Urgent Start Scholarship')).toBeInTheDocument();

    const text = container.textContent ?? '';
    expect(text.indexOf('Urgent Start Scholarship')).toBeGreaterThan(text.indexOf('Due this week'));
    expect(text.indexOf('Pinned Scholarship')).toBeGreaterThan(text.indexOf('Later'));

    vi.useRealTimers();
  });

  it('previews long later groups and expands on request', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));

    renderFeed([
      makeApplication({ id: 1, scholarshipName: 'Later Scholarship A', dueDate: '2026-07-20' }),
      makeApplication({ id: 2, scholarshipName: 'Later Scholarship B', dueDate: '2026-07-21' }),
      makeApplication({ id: 3, scholarshipName: 'Later Scholarship C', dueDate: '2026-07-22' }),
      makeApplication({ id: 4, scholarshipName: 'Later Scholarship D', dueDate: '2026-07-23' }),
      makeApplication({ id: 5, scholarshipName: 'Later Scholarship E', dueDate: '2026-07-24' }),
      makeApplication({ id: 6, scholarshipName: 'Later Scholarship F', dueDate: '2026-07-25' }),
    ]);

    expect(screen.queryByRole('heading', { name: 'Later (6)' })).not.toBeInTheDocument();
    expect(screen.getByText('Later Scholarship A')).toBeInTheDocument();
    expect(screen.getByText('Later Scholarship D')).toBeInTheDocument();
    expect(screen.queryByText('Later Scholarship E')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));

    expect(screen.getByText('Later Scholarship E')).toBeInTheDocument();
    expect(screen.getByText('Later Scholarship F')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();

    vi.useRealTimers();
  });
});
