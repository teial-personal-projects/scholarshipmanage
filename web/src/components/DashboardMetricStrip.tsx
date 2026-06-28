import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CircleDashed,
  FileText,
  ListTodo,
  SendHorizonal,
  type LucideIcon,
} from 'lucide-react';

import type { DashboardMetric } from '../utils/dashboardMetrics';

interface DashboardMetricStripProps {
  metrics: readonly DashboardMetric[];
  variant?: 'default' | 'rail';
  onMetricSelect?: (metric: DashboardMetric) => void;
}

interface MetricVisual {
  Icon: LucideIcon;
  cardClass: string;
  iconClass: string;
  valueClass: string;
  helperText: string;
}

const METRIC_VISUALS: Record<string, MetricVisual> = {
  'Total Applications': {
    Icon: FileText,
    cardClass: 'border-blue-100 bg-blue-50/70',
    iconClass: 'bg-blue-100 text-blue-700',
    valueClass: 'text-blue-700',
    helperText: 'All time',
  },
  'Needs action': {
    Icon: ListTodo,
    cardClass: 'border-orange-100 bg-orange-50/70',
    iconClass: 'bg-orange-100 text-orange-700',
    valueClass: 'text-orange-700',
    helperText: 'Work to do',
  },
  Overdue: {
    Icon: AlertTriangle,
    cardClass: 'border-red-100 bg-red-50/70',
    iconClass: 'bg-red-100 text-red-700',
    valueClass: 'text-red-700',
    helperText: 'Needs attention',
  },
  'Due this week': {
    Icon: CalendarClock,
    cardClass: 'border-orange-100 bg-orange-50/70',
    iconClass: 'bg-orange-100 text-orange-700',
    valueClass: 'text-orange-700',
    helperText: 'Keep it up!',
  },
  'Due next 2 weeks': {
    Icon: CalendarDays,
    cardClass: 'border-yellow-100 bg-yellow-50/70',
    iconClass: 'bg-yellow-100 text-yellow-700',
    valueClass: 'text-yellow-700',
    helperText: 'Plan ahead',
  },
  'Not started': {
    Icon: CircleDashed,
    cardClass: 'border-sky-100 bg-sky-50/70',
    iconClass: 'bg-sky-100 text-sky-700',
    valueClass: 'text-sky-700',
    helperText: 'Ready to begin',
  },
  Submitted: {
    Icon: SendHorizonal,
    cardClass: 'border-green-100 bg-green-50/70',
    iconClass: 'bg-green-100 text-green-700',
    valueClass: 'text-green-700',
    helperText: 'Sent in',
  },
};

const DEFAULT_METRIC_VISUAL: MetricVisual = {
  Icon: FileText,
  cardClass: 'border-gray-100 bg-gray-50',
  iconClass: 'bg-gray-100 text-gray-700',
  valueClass: 'text-gray-900',
  helperText: 'Current total',
};

function DashboardMetricStrip({ metrics, variant = 'default', onMetricSelect }: DashboardMetricStripProps) {
  const containerClass = variant === 'rail'
    ? 'space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm'
    : 'grid grid-cols-2 gap-3 lg:grid-cols-4';
  const itemBaseClass = 'min-h-28 rounded-lg border px-4 py-4 shadow-sm';
  const clickableClass = onMetricSelect ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1' : '';

  return (
    <section
      className={containerClass}
      aria-label="Application progress metrics"
    >
      {variant === 'rail' && (
        <div className="flex items-center justify-between px-1 pb-1">
          <h2 className="text-sm font-bold text-gray-900">Overview</h2>
        </div>
      )}
      {metrics.map((metric) => {
        const visual = METRIC_VISUALS[metric.label] ?? DEFAULT_METRIC_VISUAL;
        const Icon = visual.Icon;

        if (variant === 'rail') {
          const content = (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${visual.iconClass}`}>
                  <Icon size={12} aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold leading-tight text-gray-900">
                    {metric.label}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-500">
                    {visual.helperText}
                  </div>
                </div>
              </div>
              <div className={`text-lg font-bold leading-none ${visual.valueClass}`}>{metric.value}</div>
            </div>
          );

          return onMetricSelect ? (
            <button
              key={metric.label}
              type="button"
              className={`w-full rounded-md border px-3 py-2 text-left ${visual.cardClass} ${clickableClass}`}
              onClick={() => onMetricSelect(metric)}
            >
              {content}
            </button>
          ) : (
            <div key={metric.label} className={`rounded-md border px-3 py-2 ${visual.cardClass}`}>
              {content}
            </div>
          );
        }

        const content = (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-3xl font-bold leading-none ${visual.valueClass}`}>{metric.value}</div>
              <div className="mt-1.5 text-xs font-bold leading-tight text-gray-900">
                {metric.label}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-gray-500">
                {visual.helperText}
              </div>
            </div>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${visual.iconClass}`}>
              <Icon size={16} aria-hidden />
            </div>
          </div>
        );

        return onMetricSelect ? (
          <button
            key={metric.label}
            type="button"
            className={`text-left ${itemBaseClass} ${visual.cardClass} ${clickableClass}`}
            onClick={() => onMetricSelect(metric)}
          >
            {content}
          </button>
        ) : (
          <div key={metric.label} className={`${itemBaseClass} ${visual.cardClass}`}>
            {content}
          </div>
        );
      })}
    </section>
  );
}

export default DashboardMetricStrip;
