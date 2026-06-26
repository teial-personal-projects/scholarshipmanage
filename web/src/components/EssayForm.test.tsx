import toast from 'react-hot-toast';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EssayForm from './EssayForm';
import { apiPost } from '../services/api';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../services/api', () => ({
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

describe('EssayForm', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error toast when creating an essay fails', async () => {
    vi.mocked(apiPost).mockRejectedValue(new Error('Unable to create essay'));

    render(
      <EssayForm
        isOpen
        onClose={vi.fn()}
        applicationId={1}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('e.g., Leadership Experience, Community Service'), {
      target: { value: 'Leadership essay' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error: Unable to create essay',
        { duration: 5000 },
      );
    });
  });
});
