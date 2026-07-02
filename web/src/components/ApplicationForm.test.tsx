import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import toast from 'react-hot-toast';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ApplicationForm from './ApplicationForm';
import { apiGet, apiPost } from '../services/api';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../services/api', () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

const renderApplicationForm = (initialEntries = ['/applications/new']) => {
  const router = createMemoryRouter([
    { path: '/dashboard', element: <div>Dashboard</div> },
    { path: '/applications/new', element: <ApplicationForm /> },
    { path: '/applications/:id', element: <div>Application Detail</div> },
  ], { initialEntries, initialIndex: initialEntries.length - 1 });

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
};

describe('ApplicationForm', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('shows an error toast when creating an application fails', async () => {
    vi.mocked(apiPost).mockRejectedValue(new Error('Unable to create application'));

    renderApplicationForm();

    fireEvent.change(screen.getByLabelText('Scholarship Name *'), {
      target: { value: 'Failed Save Scholarship' },
    });
    fireEvent.change(screen.getByLabelText('Due Date *'), {
      target: { value: '2026-07-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error: Unable to create application',
        { duration: 5000 },
      );
    });
  });

  it('creates an application with essay and recommendation drafts', async () => {
    const user = userEvent.setup();
    vi.mocked(apiGet).mockResolvedValue([{
      id: 7,
      userId: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      emailAddress: 'ada@example.com',
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    }]);
    vi.mocked(apiPost)
      .mockResolvedValueOnce({ id: 42, scholarshipName: 'New Scholarship' })
      .mockResolvedValue({});

    renderApplicationForm();

    await user.type(screen.getByLabelText('Scholarship Name *'), 'New Scholarship');
    await user.type(screen.getByLabelText('Due Date *'), '2026-07-01');
    await user.click(screen.getByRole('button', { name: /Essays & Recommendations/ }));
    await user.click(screen.getByRole('button', { name: 'Add Essay' }));
    await user.type(screen.getByPlaceholderText('Essay prompt or topic'), 'Leadership essay');
    await user.click(screen.getByRole('button', { name: 'Add Recommender' }));
    await user.selectOptions(screen.getByLabelText('Recommender'), '7');
    await user.type(screen.getByLabelText('Due Date'), '2026-06-20');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/applications', expect.objectContaining({
      scholarshipName: 'New Scholarship',
      dueDate: '2026-07-01',
    })));
    expect(apiPost).toHaveBeenCalledWith('/applications/42/essays', expect.objectContaining({
      theme: 'Leadership essay',
      status: 'not_started',
    }));
    expect(apiPost).toHaveBeenCalledWith('/collaborations', expect.objectContaining({
      applicationId: 42,
      collaboratorId: 7,
      collaborationType: 'recommendation',
      nextActionDueDate: '2026-06-20',
    }));
  });

  it('restores unsaved add application edits after the form remounts', async () => {
    const user = userEvent.setup();
    vi.mocked(apiGet).mockImplementation(() => new Promise(() => undefined));

    const { unmount } = renderApplicationForm();

    await user.type(screen.getByLabelText('Scholarship Name *'), 'Draft Scholarship');
    await user.type(screen.getByLabelText('Due Date *'), '2026-07-01');
    await user.click(screen.getByRole('button', { name: /Essays & Recommendations/ }));
    await user.click(screen.getByRole('button', { name: 'Add Essay' }));
    await user.type(screen.getByPlaceholderText('Essay prompt or topic'), 'Community impact essay');

    await waitFor(() => expect(window.localStorage.length).toBe(1));

    unmount();
    renderApplicationForm();

    expect(screen.getByLabelText('Scholarship Name *')).toHaveValue('Draft Scholarship');
    expect(screen.getByLabelText('Due Date *')).toHaveValue('2026-07-01');
    expect(screen.getByPlaceholderText('Essay prompt or topic')).toHaveValue('Community impact essay');
  });

  it('warns before navigating back from an unsaved new application and can discard the draft', async () => {
    const user = userEvent.setup();
    vi.mocked(apiGet).mockResolvedValue([]);

    const { router } = renderApplicationForm(['/dashboard', '/applications/new']);

    await user.type(screen.getByLabelText('Scholarship Name *'), 'Back Button Scholarship');
    await user.type(screen.getByLabelText('Due Date *'), '2026-07-01');
    await waitFor(() => expect(window.localStorage.length).toBe(1));

    await act(async () => {
      await router.navigate(-1);
    });

    expect(screen.getByRole('dialog', { name: 'Save this application?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Scholarship Name *')).toHaveValue('Back Button Scholarship');

    await user.click(screen.getByRole('button', { name: 'Cancel Draft' }));

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(window.localStorage.length).toBe(0);
  });

  it('saves from the unsaved navigation warning instead of restoring the stale draft later', async () => {
    const user = userEvent.setup();
    vi.mocked(apiGet).mockResolvedValue([]);
    vi.mocked(apiPost).mockResolvedValue({ id: 42, scholarshipName: 'Saved Scholarship' });

    const { router } = renderApplicationForm(['/dashboard', '/applications/new']);

    await user.type(screen.getByLabelText('Scholarship Name *'), 'Saved Scholarship');
    await user.type(screen.getByLabelText('Due Date *'), '2026-07-01');
    await waitFor(() => expect(window.localStorage.length).toBe(1));

    await act(async () => {
      await router.navigate(-1);
    });

    const dialog = screen.getByRole('dialog', { name: 'Save this application?' });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/applications', expect.objectContaining({
      scholarshipName: 'Saved Scholarship',
      dueDate: '2026-07-01',
    })));
    await waitFor(() => expect(screen.getByText('Application Detail')).toBeInTheDocument());
    expect(window.localStorage.length).toBe(0);
  });
});
