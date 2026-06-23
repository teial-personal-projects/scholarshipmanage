import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ApplicationStatusChart from './ApplicationStatusChart';

describe('ApplicationStatusChart', () => {
  it('renders status labels and values', () => {
    render(
      <ApplicationStatusChart
        metrics={[
          { status: 'Not Started', label: 'Not Started', value: 3, percentage: 8 },
          { status: 'In Progress', label: 'In Progress', value: 22, percentage: 58 },
          { status: 'Submitted', label: 'Submitted', value: 10, percentage: 26 },
          { status: 'Awarded', label: 'Awarded', value: 1, percentage: 3 },
          { status: 'Not Awarded', label: 'Closed', value: 2, percentage: 5 },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Application Status' })).toBeInTheDocument();
    expect(screen.getByText('Not Started')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Awarded')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  it('does not render when all status counts are zero', () => {
    const { container } = render(
      <ApplicationStatusChart
        metrics={[
          { status: 'Not Started', label: 'Not Started', value: 0, percentage: 0 },
          { status: 'In Progress', label: 'In Progress', value: 0, percentage: 0 },
          { status: 'Submitted', label: 'Submitted', value: 0, percentage: 0 },
          { status: 'Awarded', label: 'Awarded', value: 0, percentage: 0 },
          { status: 'Not Awarded', label: 'Closed', value: 0, percentage: 0 },
        ]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
