import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { filterApplicationsByRadar, type DeadlineRadarFilter } from '../utils/deadlineRadar';

interface DeadlineRadarProps {
  applications: ApplicationResponse[];
  selectedFilter?: DeadlineRadarFilter | null;
  onFilterChange?: (filter: DeadlineRadarFilter | null) => void;
}

interface RadarTile {
  filter: DeadlineRadarFilter;
  label: string;
  count: number;
  tone: string;
  activeTone: string;
}

function getRadarTiles(applications: ApplicationResponse[]): RadarTile[] {
  const overdue = filterApplicationsByRadar(applications, 'overdue').length;
  const dueThisWeek = filterApplicationsByRadar(applications, 'dueThisWeek').length;
  const nextTwoWeeks = filterApplicationsByRadar(applications, 'nextTwoWeeks').length;
  const notStarted = filterApplicationsByRadar(applications, 'notStarted').length;

  return [
    {
      filter: 'overdue',
      label: 'Overdue',
      count: overdue,
      tone: 'border-red-200 bg-red-50 text-red-700',
      activeTone: 'border-red-500 ring-red-200',
    },
    {
      filter: 'dueThisWeek',
      label: 'Due this week',
      count: dueThisWeek,
      tone: 'border-orange-200 bg-orange-50 text-orange-700',
      activeTone: 'border-orange-500 ring-orange-200',
    },
    {
      filter: 'nextTwoWeeks',
      label: 'Next two weeks',
      count: nextTwoWeeks,
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      activeTone: 'border-amber-500 ring-amber-200',
    },
    {
      filter: 'notStarted',
      label: 'Not started',
      count: notStarted,
      tone: 'border-blue-200 bg-blue-50 text-blue-700',
      activeTone: 'border-blue-500 ring-blue-200',
    },
  ];
}

export default function DeadlineRadar({
  applications,
  selectedFilter = null,
  onFilterChange,
}: DeadlineRadarProps) {
  const tiles = getRadarTiles(applications);

  return (
    <div className="flex flex-wrap gap-2">
      {tiles.map((tile) => {
        const isActive = selectedFilter === tile.filter;

        return (
          <button
            key={tile.filter}
            type="button"
            className={`min-w-28 rounded-lg border px-3 py-1.5 text-left transition-colors ring-2 ring-transparent ${tile.tone} ${
              isActive ? tile.activeTone : 'hover:border-gray-300'
            }`}
            aria-pressed={isActive}
            onClick={() => onFilterChange?.(isActive ? null : tile.filter)}
          >
            <span className="block text-lg font-bold leading-none">{tile.count}</span>
            <span className="block text-[11px] font-semibold mt-0.5">{tile.label}</span>
          </button>
        );
      })}
    </div>
  );
}
