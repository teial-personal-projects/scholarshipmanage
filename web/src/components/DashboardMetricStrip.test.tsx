import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DashboardMetricStrip from './DashboardMetricStrip';

describe('DashboardMetricStrip', () => {
  it('renders metric labels and values', () => {
    render(
      <DashboardMetricStrip
        metrics={[
          { label: 'Applications', value: 38 },
          { label: 'Due This Week', value: 2 },
          { label: 'Submitted', value: 14 },
          { label: 'In Progress', value: 22 },
        ]}
      />,
    );

    expect(screen.getByLabelText('Application progress metrics')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Due This Week')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  it('calls the metric select handler when a metric is clicked', () => {
    const onMetricSelect = vi.fn();
    const metrics = [
      { label: 'Total Applications', value: 12 },
      { label: 'Submitted', value: 3 },
    ];

    render(
      <DashboardMetricStrip
        metrics={metrics}
        variant="rail"
        onMetricSelect={onMetricSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Submitted/ }));

    expect(onMetricSelect).toHaveBeenCalledWith(metrics[1]);
  });
});
