import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ApplicationPanel from './ApplicationPanel';

import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';

import type { ApplicationResponse, EssayResponse } from '@scholarshipmanage/shared';

vi.mock('../services/api', () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('../utils/toast', () => ({
  useToastHelpers: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

const essays: EssayResponse[] = [
  {
    id: 10,
    applicationId: 1,
    theme: 'Leadership prompt',
    wordCount: 500,
    essayLink: 'https://docs.google.com/document/d/leadership',
    status: 'completed',
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 11,
    applicationId: 1,
    theme: 'Service prompt',
    wordCount: 250,
    essayLink: 'https://docs.google.com/document/d/service',
    status: 'in_progress',
    createdAt: '2026-06-01T00:00:00Z',
  },
];

const application: ApplicationResponse & { essays: EssayResponse[] } = {
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
  essays,
};

describe('ApplicationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiGet).mockResolvedValue(essays);
    vi.mocked(apiDelete).mockResolvedValue({});
    vi.mocked(apiPatch).mockResolvedValue(application);
    vi.mocked(apiPost).mockResolvedValue(essays[0]);
    vi.stubGlobal('open', vi.fn());
  });

  it('renders the drawer title and read-only smart summary', async () => {
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Merit Scholarship' })).toBeInTheDocument();
    expect(screen.getByText('State University')).toBeInTheDocument();
    expect(screen.getByText('Finish 1 of 2 essays, then submit')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Leadership prompt')).toBeInTheDocument();
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

  it('saves changed application fields through the applications API', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Current Action'));
    await user.type(screen.getByLabelText('Current Action'), 'Submit application');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/applications/1', expect.objectContaining({
      currentAction: 'Submit application',
      scholarshipName: 'Merit Scholarship',
      dueDate: '2026-06-30',
    })));
    expect(screen.queryByText('Unsaved changes are present.')).not.toBeInTheDocument();
  });

  it('updates essay completion live from the status dropdown', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await screen.findByDisplayValue('Service prompt');

    const statusSelects = screen.getAllByLabelText('Status');
    await user.selectOptions(statusSelects[2], 'completed');

    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('Review and submit')).toBeInTheDocument();
  });

  it('opens linked Google Docs in a new tab', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await screen.findByDisplayValue('Leadership prompt');
    await user.click(screen.getAllByRole('button', { name: 'Open' })[0]);

    expect(window.open).toHaveBeenCalledWith(
      'https://docs.google.com/document/d/leadership',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('creates and deletes essay metadata through the essays API', async () => {
    const user = userEvent.setup();
    vi.mocked(apiGet).mockResolvedValueOnce(essays).mockResolvedValueOnce([
      ...essays,
      { ...essays[0], id: 12, theme: 'New essay prompt', status: 'not_started' },
    ]);

    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await screen.findByDisplayValue('Leadership prompt');
    await user.click(screen.getByRole('button', { name: 'Add Essay' }));
    await user.type(screen.getAllByPlaceholderText('Essay prompt or topic')[2], 'New essay prompt');
    await user.type(screen.getAllByLabelText('Word Count')[2], '750');
    await user.type(
      screen.getAllByPlaceholderText('https://docs.google.com/document/...')[2],
      'https://docs.google.com/document/d/new',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/applications/1/essays', {
      theme: 'New essay prompt',
      status: 'not_started',
      wordCount: 750,
      essayLink: 'https://docs.google.com/document/d/new',
    }));

    await user.click(screen.getByRole('button', { name: 'Delete essay 1' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/essays/10'));
  });
});
