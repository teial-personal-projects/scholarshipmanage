import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, RotateCcw, Search, SquarePen, Trash2 } from 'lucide-react';

import { isApplicationDone, type ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineDaysRemaining, getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { formatMinimumAwardAmount } from '../utils/award';
import { getApplicationOrganizationLabel } from '../utils/applicationOrganization';
import { getPendingWorkChips } from '../utils/pendingWork';
import { applicationNeedsAction } from '../utils/needsAction';
import { formatDateNoTimezone, parseDateOnlyToLocalDate } from '../utils/date';
import { useToastHelpers } from '../utils/toast';

interface GridViewProps {
  applications: ApplicationResponse[];
  onApplicationOpen: (application: ApplicationResponse) => void;
  onDelete?: (id: number) => Promise<void>;
  filterRequest?: GridFilterRequest | null;
}

type SortDirection = 'asc' | 'desc';
type SortKey = 'scholarshipName' | 'status' | 'dueDate' | 'awardAmount' | 'recommendationCount' | 'currentDependencies';
type DateColumnMode = 'dueDate' | 'updatedAt';
export type StatusFilter = 'all' | 'needsAction' | 'notStarted' | 'inProgress' | 'submitted';
export type DueDateFilter = 'all' | 'overdue' | 'next7' | 'nextTwoWeeks' | 'next30' | 'custom' | 'noDeadline';

export interface GridFilterRequest {
  id: number;
  statusFilter?: StatusFilter;
  dueDateFilter?: DueDateFilter;
  showSubmitted?: boolean;
}

const ITEMS_PER_PAGE = 10;
const DUE_WINDOW_DAYS = {
  next7: 7,
  next14: 14,
  next30: 30,
} as const;

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
  { key: 'recommendationCount', label: 'Recs' },
  { key: 'currentDependencies', label: 'Current Dependencies' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needsAction', label: 'Dependencies' },
  { key: 'notStarted', label: 'Not Started' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'submitted', label: 'Submitted' },
];

const DUE_DATE_FILTERS: { key: DueDateFilter; label: string }[] = [
  { key: 'all', label: 'Any due date' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'next7', label: 'Due in 7 days' },
  { key: 'nextTwoWeeks', label: 'Due next 2 weeks' },
  { key: 'next30', label: 'Due in 30 days' },
  { key: 'custom', label: 'Custom range' },
  { key: 'noDeadline', label: 'No deadline' },
];

const STATUS_FILTER_STYLES: Record<StatusFilter, { dot: string }> = {
  all: {
    dot: 'bg-brand-500',
  },
  needsAction: {
    dot: 'bg-orange-500',
  },
  notStarted: {
    dot: 'bg-gray-400',
  },
  inProgress: {
    dot: 'bg-blue-500',
  },
  submitted: {
    dot: 'bg-green-600',
  },
};

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
  return value ? formatDateNoTimezone(value) : '-';
}

function getDateColumnLabel(dateColumnMode: DateColumnMode): string {
  return dateColumnMode === 'dueDate' ? 'Due Date' : 'Updated';
}

function getDateColumnValue(application: ApplicationResponse, dateColumnMode: DateColumnMode): string {
  return dateColumnMode === 'dueDate'
    ? formatDate(application.dueDate)
    : formatDate(application.updatedAt);
}

function getCurrentDependenciesLabel(application: ApplicationResponse): string {
  const labels = getPendingWorkChips(application).map((chip) => chip.label);
  return labels.length ? labels.join(', ') : '-';
}

function getSortValue(application: ApplicationResponse, sortKey: SortKey, dateColumnMode: DateColumnMode): string | number {
  switch (sortKey) {
    case 'scholarshipName':
      return application.scholarshipName.toLowerCase();
    case 'status':
      return application.status.toLowerCase();
    case 'dueDate':
      return parseDateOnlyToLocalDate(
        dateColumnMode === 'dueDate' ? application.dueDate : application.updatedAt,
      )?.getTime() ?? Number.POSITIVE_INFINITY;
    case 'awardAmount':
      return application.minAward ?? 0;
    case 'recommendationCount':
      return application.recommendationCount ?? 0;
    case 'currentDependencies':
      return getCurrentDependenciesLabel(application).toLowerCase();
  }
}

function compareSortValues(first: string | number, second: string | number): number {
  if (typeof first === 'number' && typeof second === 'number') return first - second;
  return String(first).localeCompare(String(second));
}

function sortByCreatedDesc(first: ApplicationResponse, second: ApplicationResponse): number {
  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}

function matchesStatusFilter(application: ApplicationResponse, statusFilter: StatusFilter): boolean {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'notStarted') return application.status === 'Not Started';
  if (statusFilter === 'inProgress') return application.status === 'In Progress';
  if (statusFilter === 'submitted') return isApplicationDone(application.status);
  return applicationNeedsAction(application);
}

function matchesSearch(application: ApplicationResponse, searchTerm: string): boolean {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;

  return [application.scholarshipName, application.organization]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(query));
}

function matchesDueDateFilter(
  application: ApplicationResponse,
  dueDateFilter: DueDateFilter,
  customStartDate: string,
  customEndDate: string,
): boolean {
  if (dueDateFilter === 'all') return true;
  if (!application.dueDate) return dueDateFilter === 'noDeadline';
  if (dueDateFilter === 'noDeadline') return false;

  const dueDate = parseDateOnlyToLocalDate(application.dueDate);
  if (!dueDate) return false;
  const dueTime = dueDate.getTime();

  if (dueDateFilter === 'custom') {
    const startDate = parseDateOnlyToLocalDate(customStartDate);
    const endDate = parseDateOnlyToLocalDate(customEndDate);
    const startsAfter = startDate ? dueTime >= startDate.getTime() : true;
    const endsBefore = endDate ? dueTime <= endDate.getTime() : true;
    return startsAfter && endsBefore;
  }

  const daysRemaining = getDeadlineDaysRemaining(application.dueDate);
  if (daysRemaining === null) return false;

  if (dueDateFilter === 'overdue') return daysRemaining < 0;
  if (daysRemaining < 0) return false;
  if (dueDateFilter === 'next7') return daysRemaining <= DUE_WINDOW_DAYS.next7;
  if (dueDateFilter === 'nextTwoWeeks') {
    return daysRemaining > DUE_WINDOW_DAYS.next7 && daysRemaining <= DUE_WINDOW_DAYS.next14;
  }
  return daysRemaining <= DUE_WINDOW_DAYS.next30;
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

export default function GridView({ applications, onApplicationOpen, onDelete, filterRequest }: GridViewProps) {
  const { showError } = useToastHelpers();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('all');
  const [dateColumnMode, setDateColumnMode] = useState<DateColumnMode>('dueDate');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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

  const baseFilteredApplications = useMemo(() => (
    applications.filter((application) => (
      matchesSearch(application, searchTerm) &&
      (showSubmitted || !isApplicationDone(application.status)) &&
      matchesDueDateFilter(application, dueDateFilter, customStartDate, customEndDate)
    ))
  ), [applications, customEndDate, customStartDate, dueDateFilter, searchTerm, showSubmitted]);

  const statusFilterCounts = useMemo(() => ({
    all: baseFilteredApplications.length,
    needsAction: baseFilteredApplications.filter((application) => matchesStatusFilter(application, 'needsAction')).length,
    notStarted: baseFilteredApplications.filter((application) => matchesStatusFilter(application, 'notStarted')).length,
    inProgress: baseFilteredApplications.filter((application) => matchesStatusFilter(application, 'inProgress')).length,
    submitted: baseFilteredApplications.filter((application) => matchesStatusFilter(application, 'submitted')).length,
  }), [baseFilteredApplications]);

  const filteredApplications = useMemo(() => (
    baseFilteredApplications.filter((application) => matchesStatusFilter(application, statusFilter))
  ), [baseFilteredApplications, statusFilter]);

  const sortedApplications = useMemo(() => (
    [...filteredApplications].sort((first, second) => {
      if (!sortKey) return sortByCreatedDesc(first, second);

      const comparison = compareSortValues(
        getSortValue(first, sortKey, dateColumnMode),
        getSortValue(second, sortKey, dateColumnMode),
      );
      return sortDirection === 'asc' ? comparison : -comparison;
    })
  ), [dateColumnMode, filteredApplications, sortDirection, sortKey]);

  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);
  const pageApplications = sortedApplications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [applications.length, customEndDate, customStartDate, dueDateFilter, searchTerm, showSubmitted, statusFilter]);

  useEffect(() => {
    if (!filterRequest) return;

    setSearchTerm('');
    setCustomStartDate('');
    setCustomEndDate('');
    setStatusFilter(filterRequest.statusFilter ?? 'all');
    setDueDateFilter(filterRequest.dueDateFilter ?? 'all');
    setShowSubmitted(filterRequest.showSubmitted ?? false);
  }, [filterRequest]);

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

  const resetFilters = () => {
    setSearchTerm('');
    setShowSubmitted(false);
    setDueDateFilter('all');
    setDateColumnMode('dueDate');
    setCustomStartDate('');
    setCustomEndDate('');
    setStatusFilter('all');
  };

  const gridColumns = useMemo(() => (
    GRID_COLUMNS.map((column) => (
      column.key === 'dueDate' ? { ...column, label: getDateColumnLabel(dateColumnMode) } : column
    ))
  ), [dateColumnMode]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_auto_minmax(11rem,14rem)_minmax(13rem,16rem)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search scholarship or company</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              className="field-input h-10 pl-9"
              placeholder="Search scholarship or company..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="inline-flex h-10 items-center justify-between gap-3 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm">
            <span>Show Submitted</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-700"
              checked={showSubmitted}
              onChange={(event) => setShowSubmitted(event.target.checked)}
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Date column</span>
            <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <select
              className="field-select h-10 pl-9"
              value={dateColumnMode}
              onChange={(event) => setDateColumnMode(event.target.value as DateColumnMode)}
            >
              <option value="dueDate">Due Date</option>
              <option value="updatedAt">Updated</option>
            </select>
          </label>

          <label className="relative block">
            <span className="sr-only">Due date range</span>
            <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <select
              className="field-select h-10 pl-9"
              value={dueDateFilter}
              onChange={(event) => setDueDateFilter(event.target.value as DueDateFilter)}
            >
              {DUE_DATE_FILTERS.map((filter) => (
                <option key={filter.key} value={filter.key}>{filter.label}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn-ghost h-10 gap-1.5 px-3 text-xs"
            onClick={resetFilters}
          >
            <RotateCcw size={14} aria-hidden />
            Reset
          </button>
        </div>

        {dueDateFilter === 'custom' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <label className="block">
              <span className="field-label">Due from</span>
              <input
                type="date"
                className="field-input"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">Due through</span>
              <input
                type="date"
                className="field-input"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.key;
            const count = statusFilterCounts[filter.key];
            const styles = STATUS_FILTER_STYLES[filter.key];

            return (
              <button
                key={filter.key}
                type="button"
                aria-label={`${filter.label} (${count})`}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-700'
                }`}
                aria-pressed={isActive}
                onClick={() => {
                  setStatusFilter(filter.key);
                }}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden />
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
      </div>

      {filteredApplications.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-600 text-sm">
            No applications match the current filters.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="table-root table-fixed">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[8%]" />
                <col className="w-[15%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="table-header-row">
                  {gridColumns.map((column) => {
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
                  <th className="table-th sticky right-0 bg-white text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageApplications.map((application) => {
                  const urgency = getDeadlineUrgency(application.dueDate, application.status);
                  const pendingWorkChips = getPendingWorkChips(application);
                  const organizationLabel = getApplicationOrganizationLabel(application);

                  return (
                    <tr
                      key={application.id}
                      className={`h-14 border-b border-gray-100 cursor-pointer transition-colors ${urgencyRowStyles[urgency]}`}
                      onClick={() => onApplicationOpen(application)}
                    >
                      <td className="px-4 py-1.5 font-medium text-brand-700">
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
                      </td>
                      <td className="px-4 py-1.5">
                        <span className={STATUS_BADGE[application.status] ?? 'badge badge-gray'}>
                          {application.status}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-1.5 ${
                          dateColumnMode === 'dueDate' ? urgencyDueDateStyles[urgency] : 'text-gray-700'
                        }`}
                      >
                        {getDateColumnValue(application, dateColumnMode)}
                      </td>
                      <td className="px-4 py-1.5 text-gray-700">{formatMinimumAwardAmount(application)}</td>
                      <td className="px-4 py-1.5 text-gray-700">{application.recommendationCount ?? 0}</td>
                      <td className="px-4 py-1.5 text-gray-700">
                        {pendingWorkChips.length === 0 ? '-' : (
                          <div className="flex flex-wrap gap-1.5">
                            {pendingWorkChips.map((chip) => (
                              <span key={chip.key} className="badge bg-amber-50 text-amber-800 border border-amber-200">
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="sticky right-0 bg-inherit px-4 py-1.5">
                        <div className="flex shrink-0 items-center justify-end gap-2">
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
                        <span className="block text-xs font-semibold uppercase text-gray-500">
                          {getDateColumnLabel(dateColumnMode)}
                        </span>
                        <span className={dateColumnMode === 'dueDate' ? urgencyDueDateStyles[urgency] : 'text-gray-700'}>
                          {getDateColumnValue(application, dateColumnMode)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold uppercase text-gray-500">Min amount</span>
                        <span>{formatMinimumAwardAmount(application)}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold uppercase text-gray-500">Recs</span>
                        <span>{application.recommendationCount ?? 0}</span>
                      </div>
                    </div>
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
