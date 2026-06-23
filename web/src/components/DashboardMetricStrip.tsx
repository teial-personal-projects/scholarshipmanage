import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CircleDashed,
  FileText,
  SendHorizonal,
  type LucideIcon,
} from 'lucide-react';

import type { DashboardMetric } from '../utils/dashboardMetrics';

interface DashboardMetricStripProps {
  metrics: readonly DashboardMetric[];
  variant?: 'default' | 'rail';
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

function DashboardMetricStrip({ metrics, variant = 'default' }: DashboardMetricStripProps) {
  const containerClass = variant === 'rail'
    ? 'grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm'
    : 'grid grid-cols-2 gap-3 lg:grid-cols-4';
  const itemBaseClass = variant === 'rail'
    ? 'min-h-20 rounded-lg border px-2.5 py-2.5'
    : 'min-h-28 rounded-lg border px-4 py-4 shadow-sm';
  const valueClass = variant === 'rail' ? 'text-2xl' : 'text-3xl';
  const iconClass = variant === 'rail' ? 'h-7 w-7' : 'h-8 w-8';
  const iconSize = variant === 'rail' ? 14 : 16;

  return (
    <section
      className={containerClass}
      aria-label="Application progress metrics"
    >
      {metrics.map((metric) => {
        const visual = METRIC_VISUALS[metric.label] ?? DEFAULT_METRIC_VISUAL;
        const Icon = visual.Icon;

        return (
          <div key={metric.label} className={`${itemBaseClass} ${visual.cardClass}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`${valueClass} font-bold leading-none ${visual.valueClass}`}>{metric.value}</div>
                <div className="mt-1.5 text-xs font-bold leading-tight text-gray-900">
                  {metric.label}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-gray-500">
                  {visual.helperText}
                </div>
              </div>
              <div className={`flex ${iconClass} shrink-0 items-center justify-center rounded-md ${visual.iconClass}`}>
                <Icon size={iconSize} aria-hidden />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default DashboardMetricStrip;
