import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GridView from './GridView';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

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
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to all applications with submitted applications visible', () => {
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
    expect(screen.getByLabelText('Show Submitted')).toBeChecked();
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
    expect(screen.getAllByText('Future Scholarship').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Urgent Scholarship').length).toBeGreaterThan(0);

    expect(screen.getByRole('button', { name: 'Not Started (2)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Not Started (2)' }));

    expect(screen.getAllByText('Future Scholarship').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Urgent Scholarship').length).toBeGreaterThan(0);
    expect(screen.queryByText('Active Scholarship')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hides submitted applications when show submitted is turned off', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Draft Scholarship',
        status: 'In Progress',
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Submitted Scholarship',
        status: 'Submitted',
      }),
    ]);

    fireEvent.click(screen.getByLabelText('Show Submitted'));

    expect(screen.getAllByText('Draft Scholarship').length).toBeGreaterThan(0);
    expect(screen.queryByText('Submitted Scholarship')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (1)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters by due date presets', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21));
    renderGrid([
      makeApplication({ id: 1, scholarshipName: 'Soon Scholarship', dueDate: '2026-06-28' }),
      makeApplication({ id: 2, scholarshipName: 'Later Scholarship', dueDate: '2026-07-25' }),
    ]);

    fireEvent.change(screen.getByLabelText('Due date range'), { target: { value: 'next7' } });

    expect(screen.getAllByText('Soon Scholarship').length).toBeGreaterThan(0);
    expect(screen.queryByText('Later Scholarship')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('searches scholarship and organization names with partial matching', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'STEM Scholarship',
        organization: 'Northstar Foundation',
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Arts Award',
        organization: 'Microsoft',
      }),
    ]);

    fireEvent.change(screen.getByLabelText('Search scholarship or company'), { target: { value: 'soft' } });

    expect(screen.getAllByText('Arts Award').length).toBeGreaterThan(0);
    expect(screen.queryByText('STEM Scholarship')).not.toBeInTheDocument();
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
        collaborations: [
          { collaborationType: 'recommendation', status: 'pending' },
        ],
      }),
    ]);

    expect(screen.getAllByText('Essays 1 left').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recs 1 pending').length).toBeGreaterThan(0);
  });

  it('shows minimum amount in the grid without a desktop organization column', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Minimum Amount Scholarship',
        minAward: 2500,
        maxAward: 10000,
      }),
    ]);

    expect(screen.queryByRole('button', { name: 'Organization' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Min Amount' })).toBeInTheDocument();
    expect(screen.getAllByText('$2,500').length).toBeGreaterThan(0);
    expect(screen.queryByText('$10,000')).not.toBeInTheDocument();
  });

  it('shows organization beneath the scholarship name in grid rows', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Named Scholarship',
        organization: 'Named Foundation',
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Hyundai Women in STEM',
        organization: null,
      }),
    ]);

    expect(screen.getAllByText('Named Foundation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hyundai').length).toBeGreaterThan(0);
  });

  it('shows delete controls when deletion is available', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Deletable Scholarship',
        status: 'Not Started',
      }),
    ], vi.fn());

    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete Deletable Scholarship' }).length).toBeGreaterThan(0);
  });

  it('shows an error toast when grid delete fails', async () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Failing Delete Scholarship',
        status: 'Not Started',
      }),
    ], vi.fn().mockRejectedValue(new Error('rate limited')));

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Failing Delete Scholarship' })[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Delete failed: We could not delete that application. Please try again.',
        { duration: 5000 },
      );
    });
  });

  it('includes pending recommendations in needs action', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Recommendation Scholarship',
        status: 'In Progress',
        essays: [{ status: 'completed' }],
        collaborations: [{ collaborationType: 'recommendation', status: 'pending' }],
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Action Scholarship',
        status: 'In Progress',
        dueDate: '2026-07-21',
      }),
    ]);

    expect(screen.queryByRole('button', { name: /Waiting on others/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Needs action (2)' })).toBeInTheDocument();
    expect(screen.getAllByText('Recommendation Scholarship').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Needs action (2)' }));

    expect(screen.getAllByText('Recommendation Scholarship').length).toBeGreaterThan(0);
    expect(screen.queryByText('Waiting for recommendation')).not.toBeInTheDocument();
    expect(screen.getAllByText('Recs 1 pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Action Scholarship').length).toBeGreaterThan(0);
  });

  it('includes pending essays and recommendations in needs action even when not started', () => {
    renderGrid([
      makeApplication({
        id: 1,
        scholarshipName: 'Pending Essay Scholarship',
        status: 'Not Started',
        essays: [
          { status: 'not_started' },
        ],
        collaborations: [
          { collaborationType: 'recommendation', status: 'pending' },
        ],
      }),
      makeApplication({
        id: 2,
        scholarshipName: 'Plain Not Started Scholarship',
        status: 'Not Started',
      }),
    ]);

    expect(screen.getByRole('button', { name: 'Needs action (1)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Needs action (1)' }));

    expect(screen.getAllByText('Pending Essay Scholarship').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Essays 1 left').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recs 1 pending').length).toBeGreaterThan(0);
    expect(screen.queryByText('Plain Not Started Scholarship')).not.toBeInTheDocument();
  });

  it('applies an external filter request from dashboard metrics', () => {
    render(
      <MemoryRouter>
        <GridView
          applications={[
            makeApplication({
              id: 1,
              scholarshipName: 'Draft Scholarship',
              status: 'In Progress',
            }),
            makeApplication({
              id: 2,
              scholarshipName: 'Submitted Scholarship',
              status: 'Submitted',
            }),
          ]}
          onApplicationOpen={vi.fn()}
          filterRequest={{
            id: 1,
            statusFilter: 'submitted',
            dueDateFilter: 'all',
            showSubmitted: true,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Submitted (1)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('Submitted Scholarship').length).toBeGreaterThan(0);
    expect(screen.queryByText('Draft Scholarship')).not.toBeInTheDocument();
  });
});
