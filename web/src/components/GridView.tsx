import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, SquarePen } from 'lucide-react';

import { isApplicationDone, type ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { deriveNextAction } from '../utils/deriveNextAction';

interface GridViewProps {
  applications: ApplicationResponse[];
  onApplicationOpen: (application: ApplicationResponse) => void;
}

type SortDirection = 'asc' | 'desc';
type SortKey = 'scholarshipName' | 'organization' | 'status' | 'dueDate' | 'awardAmount' | 'currentAction';
type QuickFilter = 'needsAction' | 'waiting' | 'all';

const ITEMS_PER_PAGE = 10;

const STATUS_BADGE: Record<string, string> = {
  'In Progress': 'badge badge-blue',
  'Submitted': 'badge badge-green',
  'Awarded': 'badge badge-green',
  'Not Awarded': 'badge badge-red',
  'Not Started': 'badge badge-gray',
};

const GRID_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'scholarshipName', label: 'Scholarship Name' },
  { key: 'organization', label: 'Organization' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'awardAmount', label: 'Award Amount' },
  { key: 'currentAction', label: 'Current Action' },
];

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'needsAction', label: 'Needs action' },
  { key: 'waiting', label: 'Waiting on others' },
  { key: 'all', label: 'All' },
];

const urgencyRowStyles: Record<DeadlineUrgency, string> = {
  overdue: 'bg-red-50/70 hover:bg-red-50',
  critical: 'bg-orange-50/70 hover:bg-orange-50',
  warning: 'bg-amber-50/70 hover:bg-amber-50',
  normal: 'hover:bg-[#F2F4EC]',
};

const urgencyDueDateStyles: Record<DeadlineUrgency, string> = {
  overdue: 'text-red-700 font-semibold',
  critical: 'text-orange-700 font-semibold',
  warning: 'text-amber-700 font-semibold',
  normal: 'text-gray-700',
};

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString() : '-';
}

function formatAwardAmount(application: ApplicationResponse): string {
  if (application.minAward && application.maxAward) {
    return `$${application.minAward.toLocaleString()} - $${application.maxAward.toLocaleString()}`;
  }
  if (application.maxAward) return `Up to $${application.maxAward.toLocaleString()}`;
  if (application.minAward) return `$${application.minAward.toLocaleString()}+`;
  return '-';
}

function getCurrentAction(application: ApplicationResponse): string {
  return application.currentAction || deriveNextAction(application).label || '-';
}

function getSortValue(application: ApplicationResponse, sortKey: SortKey): string | number {
  switch (sortKey) {
    case 'scholarshipName':
      return application.scholarshipName.toLowerCase();
    case 'organization':
      return (application.organization ?? '').toLowerCase();
    case 'status':
      return application.status.toLowerCase();
    case 'dueDate':
      return application.dueDate ? new Date(application.dueDate).getTime() : Number.POSITIVE_INFINITY;
    case 'awardAmount':
      return application.maxAward ?? application.minAward ?? 0;
    case 'currentAction':
      return getCurrentAction(application).toLowerCase();
  }
}

function compareSortValues(first: string | number, second: string | number): number {
  if (typeof first === 'number' && typeof second === 'number') return first - second;
  return String(first).localeCompare(String(second));
}

function sortByCreatedDesc(first: ApplicationResponse, second: ApplicationResponse): number {
  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}

function matchesQuickFilter(application: ApplicationResponse, quickFilter: QuickFilter): boolean {
  if (quickFilter === 'all') return true;
  if (isApplicationDone(application.status)) return false;

  const nextAction = deriveNextAction(application);
  if (quickFilter === 'needsAction') return nextAction.actionable;
  return nextAction.kind === 'waiting';
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1,
  );

  return (
    <div className="flex items-center justify-center gap-1 pt-4 border-t border-gray-200 flex-wrap">
      <button
        className="btn-outline px-2 py-1 text-xs"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ‹
      </button>
      {pages.map((page, index) => {
        const previousPage = pages[index - 1];
        return (
          <span key={page} className="flex items-center">
            {previousPage && page - previousPage > 1 && <span className="px-2 text-gray-400 text-sm">...</span>}
            <button
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                currentPage === page
                  ? 'bg-brand-800 text-white border-brand-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </span>
        );
      })}
      <button
        className="btn-outline px-2 py-1 text-xs"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        ›
      </button>
    </div>
  );
}

export default function GridView({ applications, onApplicationOpen }: GridViewProps) {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('needsAction');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const quickFilterCounts = useMemo(() => ({
    needsAction: applications.filter((application) => matchesQuickFilter(application, 'needsAction')).length,
    waiting: applications.filter((application) => matchesQuickFilter(application, 'waiting')).length,
    all: applications.length,
  }), [applications]);

  const filteredApplications = useMemo(() => (
    applications.filter((application) => matchesQuickFilter(application, quickFilter))
  ), [applications, quickFilter]);

  const sortedApplications = useMemo(() => (
    [...filteredApplications].sort((first, second) => {
      if (!sortKey) return sortByCreatedDesc(first, second);

      const comparison = compareSortValues(getSortValue(first, sortKey), getSortValue(second, sortKey));
      return sortDirection === 'asc' ? comparison : -comparison;
    })
  ), [filteredApplications, sortDirection, sortKey]);

  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);
  const pageApplications = sortedApplications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [applications.length, quickFilter]);

  const handleSort = (nextSortKey: SortKey) => {
    setCurrentPage(1);

    if (sortKey !== nextSortKey) {
      setSortKey(nextSortKey);
      setSortDirection('asc');
      return;
    }

    if (sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }

    setSortKey(null);
    setSortDirection('asc');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_FILTERS.map((filter) => {
          const isActive = quickFilter === filter.key;

          return (
            <button
              key={filter.key}
              type="button"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-700'
              }`}
              aria-pressed={isActive}
              onClick={() => setQuickFilter(filter.key)}
            >
              {filter.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                isActive ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
              }`}
              >
                {quickFilterCounts[filter.key]}
              </span>
            </button>
          );
        })}
      </div>

      {filteredApplications.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-600 text-sm">
            No applications match {QUICK_FILTERS.find((filter) => filter.key === quickFilter)?.label.toLowerCase()}.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="table-root">
              <thead>
                <tr className="table-header-row">
                  {GRID_COLUMNS.map((column) => {
                    const isActive = sortKey === column.key;

                    return (
                      <th key={column.key} className="table-th">
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 transition-colors ${
                            isActive ? 'text-brand-800' : 'hover:text-brand-800'
                          }`}
                          onClick={() => handleSort(column.key)}
                        >
                          {column.label}
                          {isActive && (
                            sortDirection === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                          )}
                        </button>
                      </th>
                    );
                  })}
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageApplications.map((application) => {
                  const urgency = getDeadlineUrgency(application.dueDate, application.status);

                  return (
                    <tr
                      key={application.id}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${urgencyRowStyles[urgency]}`}
                      onClick={() => onApplicationOpen(application)}
                    >
                      <td className="table-td font-medium text-brand-700">
                        <span className="block truncate">{application.scholarshipName}</span>
                      </td>
                      <td className="table-td text-gray-600">{application.organization || '-'}</td>
                      <td className="table-td">
                        <span className={STATUS_BADGE[application.status] ?? 'badge badge-gray'}>
                          {application.status}
                        </span>
                      </td>
                      <td className={`table-td ${urgencyDueDateStyles[urgency]}`}>
                        {formatDate(application.dueDate)}
                      </td>
                      <td className="table-td text-gray-700">{formatAwardAmount(application)}</td>
                      <td className="table-td text-gray-700 max-w-xs">
                        <span className="line-clamp-2">{getCurrentAction(application)}</span>
                      </td>
                      <td className="table-td">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                          aria-label={`Edit ${application.scholarshipName}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onApplicationOpen(application);
                          }}
                        >
                          <SquarePen size={15} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {pageApplications.map((application) => {
              const urgency = getDeadlineUrgency(application.dueDate, application.status);

              return (
                <button
                  key={application.id}
                  type="button"
                  className={`rounded-lg border border-gray-200 p-4 text-left shadow-sm transition-all ${urgencyRowStyles[urgency]}`}
                  onClick={() => onApplicationOpen(application)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-brand-700 truncate">{application.scholarshipName}</p>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">
                        {application.organization || 'No organization set'}
                      </p>
                    </div>
                    <span className={STATUS_BADGE[application.status] ?? 'badge badge-gray'}>
                      {application.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                    <div>
                      <span className="block text-xs font-semibold uppercase text-gray-500">Due date</span>
                      <span className={urgencyDueDateStyles[urgency]}>{formatDate(application.dueDate)}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold uppercase text-gray-500">Award</span>
                      <span>{formatAwardAmount(application)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-700">{getCurrentAction(application)}</p>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          )}
        </>
      )}

    </div>
  );
}
