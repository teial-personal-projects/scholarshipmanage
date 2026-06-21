import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  GraduationCap,
  Grid2X2,
  List,
  Plus,
} from 'lucide-react';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ApplicationPanel from '../components/ApplicationPanel';
import DeadlineRadar from '../components/DeadlineRadar';
import DashboardReminders from '../components/DashboardReminders';
import { isApplicationDone, type UserProfile, type ApplicationResponse } from '@scholarshipmanage/shared';
import { getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { filterApplicationsByRadar, type DeadlineRadarFilter } from '../utils/deadlineRadar';
import { deriveNextAction } from '../utils/deriveNextAction';
import { useToastHelpers } from '../utils/toast';

const STATUS_BADGE: Record<string, string> = {
  'In Progress': 'badge badge-blue',
  'Submitted': 'badge badge-green',
  'Awarded': 'badge badge-green',
  'Not Awarded': 'badge badge-red',
  'Not Started': 'badge badge-gray',
};

type SortDirection = 'asc' | 'desc';
type SortKey = 'scholarshipName' | 'organization' | 'status' | 'dueDate' | 'awardAmount' | 'currentAction';

const GRID_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'scholarshipName', label: 'Scholarship Name' },
  { key: 'organization', label: 'Organization' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'awardAmount', label: 'Award Amount' },
  { key: 'currentAction', label: 'Current Action' },
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

const urgencyIconStyles: Record<DeadlineUrgency, string> = {
  overdue: 'text-red-600 bg-red-100',
  critical: 'text-orange-600 bg-orange-100',
  warning: 'text-amber-600 bg-amber-100',
  normal: 'text-gray-500 bg-gray-100',
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

function getUrgencyIcon(urgency: DeadlineUrgency) {
  if (urgency === 'overdue') return AlertTriangle;
  if (urgency === 'critical' || urgency === 'warning') return Clock;
  return Flag;
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading dashboard...</p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
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
      {pages.map((page, idx) => {
        const prev = pages[idx - 1];
        return (
          <span key={page} className="flex items-center">
            {prev && page - prev > 1 && <span className="px-2 text-gray-400 text-sm">...</span>}
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

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToastHelpers();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [radarFilter, setRadarFilter] = useState<DeadlineRadarFilter | null>(null);
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationResponse | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchData() {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const profileData = await apiGet<UserProfile>('/users/me');
        setProfile(profileData);
        const applicationsData = await apiGet<ApplicationResponse[]>('/applications');
        setApplications(applicationsData || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(msg);
        showError('Error', msg);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, showError]);

  const inProgressCount = useMemo(() => applications.filter(a => a.status === 'In Progress').length, [applications]);
  const submittedCount = useMemo(() =>
    applications.filter(a => isApplicationDone(a.status)).length,
    [applications]);

  const filteredApplications = useMemo(() => {
    if (radarFilter) return filterApplicationsByRadar(applications, radarFilter);
    return applications.filter(a => !isApplicationDone(a.status));
  }, [applications, radarFilter]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(start, start + itemsPerPage);
  }, [filteredApplications, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [applications.length, radarFilter]);

  const handleRadarFilterChange = (filter: DeadlineRadarFilter | null) => {
    setRadarFilter(filter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  if (authLoading || loading) return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Spinner />
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="card card-body">
        <p className="text-red-500">{error}</p>
      </div>
    </div>
  );

  const firstName = profile?.firstName || 'Student';

  const AppTable = ({ apps }: { apps: ApplicationResponse[] }) => (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table-root">
          <thead>
            <tr className="table-header-row">
              <th className="table-th">Scholarship Name</th>
              <th className="table-th">Organization</th>
              <th className="table-th">Status</th>
              <th className="table-th">Due Date</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr
                key={app.id}
                className="table-row"
                onClick={() => setSelectedApplication(app)}
              >
                <td className="table-td font-medium text-brand-700">{app.scholarshipName}</td>
                <td className="table-td text-gray-600">{app.organization || '-'}</td>
                <td className="table-td">
                  <span className={STATUS_BADGE[app.status] ?? 'badge badge-gray'}>{app.status}</span>
                </td>
                <td className="table-td text-gray-700">
                  {app.dueDate ? new Date(app.dueDate).toLocaleDateString() : '-'}
                </td>
                <td className="table-td">
                  <button
                    className="text-brand-600 font-semibold text-sm hover:underline"
                    onClick={(e) => { e.stopPropagation(); setSelectedApplication(app); }}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {apps.map((app) => (
          <div
            key={app.id}
            className="card p-4 cursor-pointer hover:-translate-y-0.5 transition-transform"
            onClick={() => setSelectedApplication(app)}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-700 truncate">{app.scholarshipName}</p>
                {app.organization && <p className="text-sm text-gray-600 mt-0.5">{app.organization}</p>}
              </div>
              <span className={STATUS_BADGE[app.status] ?? 'badge badge-gray'}>{app.status}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              <span className="font-semibold">Due:</span>{' '}
              {app.dueDate ? new Date(app.dueDate).toLocaleDateString() : '-'}
            </p>
          </div>
        ))}
      </div>
    </>
  );

  const AppGrid = ({ apps }: { apps: ApplicationResponse[] }) => {
    const sortedApps = [...apps].sort((first, second) => {
      if (!sortKey) return sortByCreatedDesc(first, second);

      const comparison = compareSortValues(getSortValue(first, sortKey), getSortValue(second, sortKey));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    const pageApps = sortedApps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
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
              {pageApps.map((app) => {
                const urgency = getDeadlineUrgency(app.dueDate, app.status);
                const Icon = getUrgencyIcon(urgency);

                return (
                  <tr
                    key={app.id}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${urgencyRowStyles[urgency]}`}
                    onClick={() => setSelectedApplication(app)}
                  >
                    <td className="table-td font-medium text-brand-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${urgencyIconStyles[urgency]}`}>
                          <Icon size={14} aria-hidden />
                        </span>
                        <span className="truncate">{app.scholarshipName}</span>
                      </div>
                    </td>
                    <td className="table-td text-gray-600">{app.organization || '-'}</td>
                    <td className="table-td">
                      <span className={STATUS_BADGE[app.status] ?? 'badge badge-gray'}>{app.status}</span>
                    </td>
                    <td className={`table-td ${urgencyDueDateStyles[urgency]}`}>
                      {formatDate(app.dueDate)}
                    </td>
                    <td className="table-td text-gray-700">{formatAwardAmount(app)}</td>
                    <td className="table-td text-gray-700 max-w-xs">
                      <span className="line-clamp-2">{getCurrentAction(app)}</span>
                    </td>
                    <td className="table-td">
                      <button
                        type="button"
                        className="text-brand-600 font-semibold text-sm hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedApplication(app);
                        }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
          {pageApps.map((app) => {
            const urgency = getDeadlineUrgency(app.dueDate, app.status);
            const Icon = getUrgencyIcon(urgency);

            return (
              <button
                key={app.id}
                type="button"
                className={`rounded-lg border border-gray-200 p-4 text-left shadow-sm transition-all ${urgencyRowStyles[urgency]}`}
                onClick={() => setSelectedApplication(app)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-2">
                    <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${urgencyIconStyles[urgency]}`}>
                      <Icon size={14} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-brand-700 truncate">{app.scholarshipName}</p>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">{app.organization || 'No organization set'}</p>
                    </div>
                  </div>
                  <span className={STATUS_BADGE[app.status] ?? 'badge badge-gray'}>{app.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                  <div>
                    <span className="block text-xs font-semibold uppercase text-gray-500">Due date</span>
                    <span className={urgencyDueDateStyles[urgency]}>{formatDate(app.dueDate)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold uppercase text-gray-500">Award</span>
                    <span>{formatAwardAmount(app)}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700">{getCurrentAction(app)}</p>
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-5 space-y-4">
        <div className="rounded-lg border border-stone-200 border-l-4 border-l-brand-500 bg-[#F8F5EC] px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
              <GraduationCap size={23} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight text-gray-900">Welcome back, {firstName}!</h1>
              <p className="text-gray-700 text-xs md:text-sm mt-0.5">
                {applications.length === 0
                  ? 'Get started by creating your first scholarship application'
                  : `${applications.length} application${applications.length !== 1 ? 's' : ''} · ${inProgressCount} in progress · ${submittedCount} submitted`}
              </p>
            </div>
          </div>
          <button
            className="bg-brand-500 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-brand-600 transition-colors text-sm inline-flex items-center justify-center gap-1.5 md:self-center"
            onClick={() => navigate('/applications/new')}
          >
            <Plus size={16} />
            New Application
          </button>
        </div>

        {/* Reminders */}
        <DashboardReminders />

        {applications.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Deadline Radar</h2>
            <DeadlineRadar
              applications={applications}
              selectedFilter={radarFilter}
              onFilterChange={handleRadarFilterChange}
            />
          </section>
        )}

        {/* Applications */}
        <div className="card">
          <div className="card-header flex items-center justify-between gap-3">
            <h2 className="section-heading shrink-0">Your Applications</h2>
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-sm shrink-0">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'feed' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={viewMode === 'feed'}
                onClick={() => setViewMode('feed')}
              >
                <List size={13} />
                Feed
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <Grid2X2 size={13} />
                Grid
              </button>
            </div>
          </div>
          <div className="card-body">
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎓</div>
                <h3 className="font-semibold text-brand-700 text-lg mb-2">Start Your Scholarship Journey</h3>
                <p className="text-gray-600 text-sm mb-6 max-w-sm mx-auto">
                  You don't have any applications yet. Create your first application to get started!
                </p>
                <button className="btn-primary px-6 py-2" onClick={() => navigate('/applications/new')}>
                  Create Your First Application
                </button>
              </div>
            ) : (
              <>
                {filteredApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📝</div>
                    <p className="text-gray-600 text-sm">
                      {radarFilter
                        ? 'No applications match this radar filter.'
                        : 'No active applications yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {viewMode === 'feed' ? (
                      <AppTable apps={paginatedApplications} />
                    ) : (
                      <AppGrid apps={filteredApplications} />
                    )}
                    {totalPages > 1 && (
                      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {selectedApplication && (
        <ApplicationPanel
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
