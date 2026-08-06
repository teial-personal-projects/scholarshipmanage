import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ApplicationPanel from './ApplicationPanel';

import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';

import type {
  ApplicationResponse,
  CollaborationResponse,
  CollaboratorResponse,
  EssayResponse,
} from '@scholarshipmanage/shared';

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

const collaborations: CollaborationResponse[] = [];
const collaborators: CollaboratorResponse[] = [];
const collaborator: CollaboratorResponse = {
  id: 7,
  userId: 1,
  firstName: 'Ada',
  lastName: 'Lovelace',
  emailAddress: 'ada@example.com',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const application: ApplicationResponse & { essays: EssayResponse[] } = {
  id: 1,
  userId: 1,
  scholarshipName: 'Merit Scholarship',
  organization: 'State University',
  targetType: 'Merit',
  status: 'In Progress',
  minAward: 1000,
  maxAward: 5000,
  dueDate: '2026-06-30',
  orgWebsite: 'state.example.edu',
  applicationLink: 'https://apply.example.edu/merit',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  essays,
};

async function openWorkItemsSection(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Essays & Recommendations/ }));
}

describe('ApplicationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(apiGet).mockImplementation(async (endpoint) => {
      if (endpoint === '/applications/1/essays') return essays;
      if (endpoint === '/applications/1/collaborations') return collaborations;
      if (endpoint === '/collaborators') return collaborators;
      throw new Error(`Unexpected API call: ${endpoint}`);
    });
    vi.mocked(apiDelete).mockResolvedValue({});
    vi.mocked(apiPatch).mockResolvedValue(application);
    vi.mocked(apiPost).mockResolvedValue(essays[0]);
    vi.stubGlobal('open', vi.fn());
  });

  it('renders the drawer title and read-only smart summary', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Merit Scholarship' })).toBeInTheDocument();
    expect(screen.getByText('State University')).toBeInTheDocument();
    expect(screen.getByText('Finish 1 of 2 essays, then submit')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 essays/ })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Leadership prompt')).not.toBeInTheDocument();

    await openWorkItemsSection(user);

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

  it('preserves dirty edits when refreshed application props arrive', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Organization'));
    await user.type(screen.getByLabelText('Organization'), 'Unsaved University');

    rerender(
      <ApplicationPanel
        application={{ ...application, organization: 'Server Refresh University', updatedAt: '2026-06-02T00:00:00Z' }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Organization')).toHaveValue('Unsaved University');

    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByLabelText('Organization')).toHaveValue('Server Refresh University');
  });

  it('restores unsaved edits after the panel remounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText('Organization'));
    await user.type(screen.getByLabelText('Organization'), 'Remount University');

    await waitFor(() => expect(window.localStorage.length).toBe(1));
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(3));

    unmount();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Organization')).toHaveValue('Remount University');
    expect(screen.getByText('Unsaved changes are present.')).toBeInTheDocument();
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(6));
  });

  it('saves changed application fields through the applications API', async () => {
    const user = userEvent.setup();
    const onSaveSuccess = vi.fn();
    render(<ApplicationPanel application={application} onClose={vi.fn()} onSaveSuccess={onSaveSuccess} />);

    await user.clear(screen.getByLabelText('Organization'));
    await user.type(screen.getByLabelText('Organization'), 'Updated University');
    await openWorkItemsSection(user);
    await user.clear(screen.getByLabelText('Number of Recommendations'));
    await user.type(screen.getByLabelText('Number of Recommendations'), '2');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/applications/1', expect.objectContaining({
      organization: 'Updated University',
      scholarshipName: 'Merit Scholarship',
      dueDate: '2026-06-30',
      recommendationCount: 2,
    })));
    expect(onSaveSuccess).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Unsaved changes are present.')).not.toBeInTheDocument();
  });

  it('confirms before closing with unsaved changes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);

    render(<ApplicationPanel application={application} onClose={onClose} />);

    await user.clear(screen.getByLabelText('Organization'));
    await user.type(screen.getByLabelText('Organization'), 'Updated University');
    await user.click(screen.getByRole('button', { name: 'Close panel' }));

    expect(confirm).toHaveBeenCalledWith('Discard unsaved changes?');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('updates essay completion live from the status dropdown', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await openWorkItemsSection(user);
    await screen.findByDisplayValue('Service prompt');

    const statusSelects = screen.getAllByLabelText('Status');
    await user.selectOptions(statusSelects[2], 'completed');

    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('Review and submit')).toBeInTheDocument();
  });

  it('completes unfinished essays when the application is submitted', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await openWorkItemsSection(user);
    await screen.findByDisplayValue('Service prompt');
    await user.selectOptions(screen.getAllByLabelText('Status')[0], 'Submitted');

    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Status')[2]).toHaveValue('completed');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/essays/11', expect.objectContaining({
      status: 'completed',
    })));
  });

  it('opens linked Google Docs in a new tab', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await openWorkItemsSection(user);
    await screen.findByDisplayValue('Leadership prompt');
    await user.click(screen.getAllByRole('button', { name: 'Open' })[0]);

    expect(window.open).toHaveBeenCalledWith(
      'https://docs.google.com/document/d/leadership',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('renders application resource URLs as clickable links in the dialog', async () => {
    const user = userEvent.setup();
    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Open organization website' })).toHaveAttribute(
      'href',
      'https://state.example.edu',
    );
    expect(screen.getByRole('link', { name: 'Open application portal' })).toHaveAttribute(
      'href',
      'https://apply.example.edu/merit',
    );

    await user.click(screen.getByRole('button', { name: /Links & Resources/ }));

    expect(screen.getByRole('link', { name: 'Open organization website' })).toHaveAttribute(
      'href',
      'https://state.example.edu',
    );
    expect(screen.getByRole('link', { name: 'Open application portal' })).toHaveAttribute(
      'href',
      'https://apply.example.edu/merit',
    );
  });

  it('creates and deletes essay metadata through the essays API', async () => {
    const user = userEvent.setup();
    let essayFetchCount = 0;
    vi.mocked(apiGet).mockImplementation(async (endpoint) => {
      if (endpoint === '/applications/1/essays') {
        essayFetchCount += 1;
        if (essayFetchCount >= 2) {
          return [
            ...essays,
            { ...essays[0], id: 12, theme: 'New essay prompt', status: 'not_started' },
          ];
        }
        return essays;
      }
      if (endpoint === '/applications/1/collaborations') return collaborations;
      if (endpoint === '/collaborators') return collaborators;
      throw new Error(`Unexpected API call: ${endpoint}`);
    });

    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await openWorkItemsSection(user);
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

  it('moves a not-started application to in-progress when adding an essay from the panel', async () => {
    const user = userEvent.setup();
    vi.mocked(apiGet).mockImplementation(async (endpoint) => {
      if (endpoint === '/applications/1/essays') return [];
      if (endpoint === '/applications/1/collaborations') return collaborations;
      if (endpoint === '/collaborators') return collaborators;
      throw new Error(`Unexpected API call: ${endpoint}`);
    });

    render(
      <ApplicationPanel
        application={{ ...application, status: 'Not Started', essays: [] }}
        onClose={vi.fn()}
      />,
    );

    await openWorkItemsSection(user);
    await user.click(screen.getByRole('button', { name: 'Add Essay' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/applications/1', expect.objectContaining({
      status: 'In Progress',
    })));
  });

  it('persists updating an existing recommendation collaboration status', async () => {
    const user = userEvent.setup();
    vi.mocked(apiGet).mockImplementation(async (endpoint) => {
      if (endpoint === '/applications/1/essays') return essays;
      if (endpoint === '/applications/1/collaborations') {
        return [{
          id: 20,
          userId: 1,
          applicationId: 1,
          collaboratorId: collaborator.id,
          collaborationType: 'recommendation',
          status: 'pending',
          awaitingActionFrom: 'student',
          nextActionDueDate: '2026-06-25',
          createdAt: '2026-06-01T00:00:00Z',
          updatedAt: '2026-06-01T00:00:00Z',
        }];
      }
      if (endpoint === '/collaborators') return [collaborator];
      throw new Error(`Unexpected API call: ${endpoint}`);
    });

    render(<ApplicationPanel application={application} onClose={vi.fn()} />);

    await openWorkItemsSection(user);
    await screen.findByDisplayValue('2026-06-25');
    await user.selectOptions(screen.getAllByLabelText('Status')[3], 'submitted');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith('/collaborations/20', {
      status: 'submitted',
      nextActionDueDate: '2026-06-25',
      awaitingActionFrom: 'student',
      nextActionDescription: 'Review submitted recommendation',
    }));
  });
});
