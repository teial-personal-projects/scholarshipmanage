import type { ApplicationStatusMetric } from '../utils/dashboardMetrics';

interface ApplicationStatusChartProps {
  metrics: readonly ApplicationStatusMetric[];
}

const STATUS_STYLES = {
  'Not Started': {
    dotClassName: 'bg-gray-300',
    progressClassName: 'dashboard-progress-gray',
  },
  'In Progress': {
    dotClassName: 'bg-accent-500',
    progressClassName: 'dashboard-progress-accent',
  },
  Submitted: {
    dotClassName: 'bg-brand-500',
    progressClassName: 'dashboard-progress-brand',
  },
  Awarded: {
    dotClassName: 'bg-emerald-500',
    progressClassName: 'dashboard-progress-emerald',
  },
  'Not Awarded': {
    dotClassName: 'bg-gray-700',
    progressClassName: 'dashboard-progress-dark',
  },
} as const;

function ApplicationStatusChart({ metrics }: ApplicationStatusChartProps) {
  const hasApplications = metrics.some((metric) => metric.value > 0);

  if (!hasApplications) return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm" aria-labelledby="application-status-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="application-status-heading" className="section-heading">
          Application Status
        </h2>
        <p className="text-xs text-gray-500">Progress by current application stage</p>
      </div>

      <div className="mt-4 space-y-3">
        {metrics.map((metric) => (
          <div key={metric.status} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_STYLES[metric.status].dotClassName}`} />
                  <span className="truncate font-medium text-gray-800">{metric.label}</span>
                </div>
                <span className="shrink-0 text-xs text-gray-500">{metric.percentage}%</span>
              </div>
              <progress
                className={`dashboard-progress mt-1 ${STATUS_STYLES[metric.status].progressClassName}`}
                value={metric.percentage}
                max={100}
                aria-label={`${metric.label} applications`}
              />
            </div>
            <div className="text-right text-sm font-semibold text-gray-900">{metric.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ApplicationStatusChart;
