import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, SquarePen, Trash2 } from 'lucide-react';

import { isApplicationDone, type ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { deriveNextAction } from '../utils/deriveNextAction';
import { formatMinimumAwardAmount } from '../utils/award';
import { getApplicationOrganizationLabel } from '../utils/applicationOrganization';
import { getPendingWorkChips } from '../utils/pendingWork';
import { useToastHelpers } from '../utils/toast';

interface GridViewProps {
  applications: ApplicationResponse[];
  onApplicationOpen: (application: ApplicationResponse) => void;
  onDelete?: (id: number) => Promise<void>;
}

type SortDirection = 'asc' | 'desc';
type SortKey = 'scholarshipName' | 'status' | 'dueDate' | 'awardAmount' | 'currentAction';
type QuickFilter = 'needsAction' | 'waiting' | 'notStarted' | 'all';

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
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'awardAmount', label: 'Min Amount' },
  { key: 'currentAction', label: 'Current Action' },
];

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'needsAction', label: 'Needs action' },
  { key: 'waiting', label: 'Waiting on others' },
  { key: 'notStarted', label: 'Not Started' },
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

function getCurrentAction(application: ApplicationResponse): string {
  return application.currentAction || deriveNextAction(application).label || '-';
}

function getSortValue(application: ApplicationResponse, sortKey: SortKey): string | number {
  switch (sortKey) {
    case 'scholarshipName':
      return application.scholarshipName.toLowerCase();
    case 'status':
      return application.status.toLowerCase();
    case 'dueDate':
      return application.dueDate ? new Date(application.dueDate).getTime() : Number.POSITIVE_INFINITY;
    case 'awardAmount':
      return application.minAward ?? 0;
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
  if (quickFilter === 'notStarted') return application.status === 'Not Started';
  if (isApplicationDone(application.status)) return false;
  if (quickFilter === 'needsAction' && application.status === 'Not Started') return false;

  const nextAction = deriveNextAction(application);
  if (quickFilter === 'needsAction') return nextAction.actionable;
  return nextAction.kind === 'waiting';
}

function getDefaultQuickFilter(applications: ApplicationResponse[]): QuickFilter {
  return applications.some((application) => matchesQuickFilter(application, 'needsAction')) ? 'needsAction' : 'all';
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

export default function GridView({ applications, onApplicationOpen, onDelete }: GridViewProps) {
  const { showError } = useToastHelpers();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() => getDefaultQuickFilter(applications));
  const [userSelectedQuickFilter, setUserSelectedQuickFilter] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch {
      showError('Delete failed', 'We could not delete that application. Please try again.', 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const quickFilterCounts = useMemo(() => ({
    needsAction: applications.filter((application) => matchesQuickFilter(application, 'needsAction')).length,
    waiting: applications.filter((application) => matchesQuickFilter(application, 'waiting')).length,
    notStarted: applications.filter((application) => matchesQuickFilter(application, 'notStarted')).length,
    all: applications.length,
  }), [applications]);

  useEffect(() => {
    if (userSelectedQuickFilter || quickFilter !== 'needsAction' || quickFilterCounts.needsAction > 0) return;
    setQuickFilter('all');
  }, [quickFilter, quickFilterCounts.needsAction, userSelectedQuickFilter]);

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
          const count = quickFilterCounts[filter.key];

          return (
            <button
              key={filter.key}
              type="button"
              aria-label={`${filter.label} (${count})`}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-700'
              }`}
              aria-pressed={isActive}
              onClick={() => {
                setUserSelectedQuickFilter(true);
                setQuickFilter(filter.key);
              }}
            >
              {filter.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                isActive ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
              }`}
              >
                {count}
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
            <table className="table-root table-fixed">
              <colgroup>
                <col className="w-[43%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[19%]" />
              </colgroup>
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
                </tr>
              </thead>
              <tbody>
                {pageApplications.map((application) => {
                  const urgency = getDeadlineUrgency(application.dueDate, application.status);
                  const pendingWorkChips = getPendingWorkChips(application);
                  const currentAction = getCurrentAction(application);
                  const organizationLabel = getApplicationOrganizationLabel(application);

                  return (
                    <tr
                      key={application.id}
                      className={`h-14 border-b border-gray-100 cursor-pointer transition-colors ${urgencyRowStyles[urgency]}`}
                      onClick={() => onApplicationOpen(application)}
                    >
                      <td className="px-4 py-1.5 font-medium text-brand-700">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="block truncate" title={application.scholarshipName}>
                              {application.scholarshipName}
                            </span>
                            {organizationLabel && (
                              <span
                                className="block truncate text-[11px] font-medium leading-3 text-gray-500"
                                title={organizationLabel}
                              >
                                {organizationLabel}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                              aria-label={`Edit ${application.scholarshipName}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onApplicationOpen(application);
                              }}
                            >
                              <SquarePen size={14} aria-hidden />
                            </button>
                            {onDelete && (
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40"
                                aria-label={`Delete ${application.scholarshipName}`}
                                disabled={deletingId === application.id}
                                onClick={(event) => handleDelete(event, application.id)}
                              >
                                <Trash2 size={14} aria-hidden />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-1.5">
                        <span className={STATUS_BADGE[application.status] ?? 'badge badge-gray'}>
                          {application.status}
                        </span>
                      </td>
                      <td className={`px-4 py-1.5 ${urgencyDueDateStyles[urgency]}`}>
                        {formatDate(application.dueDate)}
                      </td>
                      <td className="px-4 py-1.5 text-gray-700">{formatMinimumAwardAmount(application)}</td>
                      <td className="px-4 py-1.5 text-gray-700">
                        <span className="block truncate" title={currentAction}>{currentAction}</span>
                        {pendingWorkChips.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {pendingWorkChips.map((chip) => (
                              <span key={chip.key} className="badge bg-amber-50 text-amber-800 border border-amber-200">
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        )}
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
              const pendingWorkChips = getPendingWorkChips(application);
              const organizationLabel = getApplicationOrganizationLabel(application);

              return (
                <div
                  key={application.id}
                  className={`relative rounded-lg border border-gray-200 shadow-sm transition-all ${urgencyRowStyles[urgency]}`}
                >
                  <button
                    type="button"
                    className="w-full p-3 text-left"
                    onClick={() => onApplicationOpen(application)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-brand-700 truncate">{application.scholarshipName}</p>
                        {organizationLabel && (
                          <p className="truncate text-[11px] font-medium leading-3 text-gray-500">
                            {organizationLabel}
                          </p>
                        )}
                      </div>
                      <span className={STATUS_BADGE[application.status] ?? 'badge badge-gray'}>
                        {application.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700">
                      <div>
                        <span className="block text-xs font-semibold uppercase text-gray-500">Due date</span>
                        <span className={urgencyDueDateStyles[urgency]}>{formatDate(application.dueDate)}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold uppercase text-gray-500">Min amount</span>
                        <span>{formatMinimumAwardAmount(application)}</span>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm text-gray-700">{getCurrentAction(application)}</p>
                    {pendingWorkChips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {pendingWorkChips.map((chip) => (
                          <span key={chip.key} className="badge bg-amber-50 text-amber-800 border border-amber-200">
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      aria-label={`Edit ${application.scholarshipName}`}
                      onClick={() => onApplicationOpen(application)}
                    >
                      <SquarePen size={15} aria-hidden />
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        aria-label={`Delete ${application.scholarshipName}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40"
                        disabled={deletingId === application.id}
                        onClick={(e) => handleDelete(e, application.id)}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
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
