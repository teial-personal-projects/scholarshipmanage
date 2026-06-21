import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ApplicationPanel from './ApplicationPanel';

import { apiPatch } from '../services/api';

import type { ApplicationResponse, Essay } from '@scholarshipmanage/shared';

vi.mock('../services/api', () => ({
  apiPatch: vi.fn(),
}));

vi.mock('../utils/toast', () => ({
  useToastHelpers: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

const application: ApplicationResponse & { essays: Pick<Essay, 'status'>[] } = {
  id: 1,
  userId: 1,
  scholarshipName: 'Merit Scholarship',
  organization: 'State University',
  targetType: 'Merit',
  status: 'In Progress',
  currentAction: 'Review requirements',
  minAward: 1000,
  maxAward: 5000,
  dueDate: '2026-06-30',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  essays: [{ status: 'completed' }, { status: 'in_progress' }],
};

describe('ApplicationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the drawer title and read-only smart summary', () => {
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Merit Scholarship' })).toBeInTheDocument();
    expect(screen.getByText('State University')).toBeInTheDocument();
    expect(screen.getByText('Finish 1 of 2 essays, then submit')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('shows and clears the sticky save bar when a field changes and is discarded', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    expect(screen.queryByText('Unsaved changes are present.')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Organization'));
    await user.type(screen.getByLabelText('Organization'), 'Updated University');

    expect(screen.getByText('Unsaved changes are present.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.queryByText('Unsaved changes are present.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Organization')).toHaveValue('State University');
  });

  it('saves changed fields through the applications API', async () => {
    const user = userEvent.setup();
    vi.mocked(apiPatch).mockResolvedValue(application);

    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Current Action'));
    await user.type(screen.getByLabelText('Current Action'), 'Submit application');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(apiPatch).toHaveBeenCalledWith('/applications/1', expect.objectContaining({
      currentAction: 'Submit application',
      scholarshipName: 'Merit Scholarship',
      dueDate: '2026-06-30',
    }));
    expect(screen.queryByText('Unsaved changes are present.')).not.toBeInTheDocument();
  });
});
