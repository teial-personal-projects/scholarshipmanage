import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const renderApplicationForm = () => render(
  <MemoryRouter>
    <ApplicationForm />
  </MemoryRouter>,
);

describe('ApplicationForm', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
});
