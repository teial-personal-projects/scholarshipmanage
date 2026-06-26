import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ApplicationForm from './ApplicationForm';
import { apiPost } from '../services/api';

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
});
