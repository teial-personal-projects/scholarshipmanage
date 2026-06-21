import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ViewToggle from './ViewToggle';
import { DASHBOARD_VIEW_STORAGE_KEY, getStoredDashboardView } from '../utils/dashboardView';

describe('ViewToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to feed when no stored view exists', () => {
    expect(getStoredDashboardView()).toBe('feed');
  });

  it('returns a valid stored dashboard view', () => {
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, 'grid');

    expect(getStoredDashboardView()).toBe('grid');
  });

  it('falls back to feed for invalid stored values', () => {
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, 'kanban');

    expect(getStoredDashboardView()).toBe('feed');
  });

  it('persists changes and notifies the parent', () => {
    const handleChange = vi.fn();
    render(<ViewToggle view="feed" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));

    expect(window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY)).toBe('grid');
    expect(handleChange).toHaveBeenCalledWith('grid');
  });
});
