import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import {
  isApplicationDone,
  type ApplicationResponse,
  type UserProfile,
} from '@scholarshipmanage/shared';
import { apiGet, apiDelete } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ActionFeed from '../components/ActionFeed';
import ActionRow from '../components/ActionRow';
import ApplicationPanel from '../components/ApplicationPanel';
import DashboardMetricStrip from '../components/DashboardMetricStrip';
import GridView, { type GridFilterRequest } from '../components/GridView';
import ViewToggle from '../components/ViewToggle';
import { getDeadlineDaysRemaining, getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { getDashboardMetrics, type DashboardMetric } from '../utils/dashboardMetrics';
import { DASHBOARD_VIEW_STORAGE_KEY, getStoredDashboardView, type DashboardView } from '../utils/dashboardView';
import { useToastHelpers } from '../utils/toast';

interface DashboardData {
  profile: UserProfile;
  applications: ApplicationResponse[];
}

const DASHBOARD_QUERY_KEY = ['dashboard'] as const;

async function fetchDashboardData(): Promise<DashboardData> {
  const [profile, applications] = await Promise.all([
    apiGet<UserProfile>('/users/me'),
    apiGet<ApplicationResponse[]>('/applications'),
  ]);

  return {
    profile,
    applications: applications || [],
  };
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading dashboard...</p>
    </div>
  );
}

function sortByDeadline(first: ApplicationResponse, second: ApplicationResponse): number {
  const firstDays = getDeadlineDaysRemaining(first.dueDate) ?? Number.POSITIVE_INFINITY;
  const secondDays = getDeadlineDaysRemaining(second.dueDate) ?? Number.POSITIVE_INFINITY;
  if (firstDays !== secondDays) return firstDays - secondDays;

  return first.scholarshipName.localeCompare(second.scholarshipName);
}

const PRIORITY_URGENCIES = new Set<DeadlineUrgency>(['overdue', 'critical', 'warning']);

function getMetricFilterRequest(metric: DashboardMetric): Omit<GridFilterRequest, 'id'> {
  switch (metric.label) {
    case 'Dependencies':
      return { statusFilter: 'needsAction', dueDateFilter: 'all', showSubmitted: false };
    case 'Overdue':
      return { statusFilter: 'all', dueDateFilter: 'overdue', showSubmitted: false };
    case 'Due this week':
      return { statusFilter: 'all', dueDateFilter: 'next7', showSubmitted: false };
    case 'Due next 2 weeks':
      return { statusFilter: 'all', dueDateFilter: 'nextTwoWeeks', showSubmitted: false };
    case 'Not started':
      return { statusFilter: 'notStarted', dueDateFilter: 'all', showSubmitted: true };
    case 'Submitted':
      return { statusFilter: 'submitted', dueDateFilter: 'all', showSubmitted: true };
    case 'Total Applications':
    default:
      return { statusFilter: 'all', dueDateFilter: 'all', showSubmitted: true };
  }
}

function isPriorityApplication(application: ApplicationResponse): boolean {
  if (isApplicationDone(application.status)) return false;
  return PRIORITY_URGENCIES.has(getDeadlineUrgency(application.dueDate, application.status));
}

function PriorityApplications({
  applications,
  onApplicationOpen,
  onDelete,
}: {
  applications: ApplicationResponse[];
  onApplicationOpen: (application: ApplicationResponse) => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const groups: { key: DeadlineUrgency; title: string; applications: ApplicationResponse[] }[] = [
    { key: 'overdue', title: 'Overdue', applications: [] },
    { key: 'critical', title: 'Due this week', applications: [] },
    { key: 'warning', title: 'Due next 2 weeks', applications: [] },
  ];

  applications
    .filter(isPriorityApplication)
    .sort(sortByDeadline)
    .forEach((application) => {
      const urgency = getDeadlineUrgency(application.dueDate, application.status);
      const group = groups.find((item) => item.key === urgency);
      group?.applications.push(application);
    });

  const visibleGroups = groups.filter((group) => group.applications.length > 0);
  const priorityCount = visibleGroups.reduce((total, group) => total + group.applications.length, 0);
  const priorityApplications = visibleGroups.flatMap((group) => group.applications);

  return (
    <section className="overflow-hidden rounded-lg border border-red-200 bg-white shadow-sm ring-1 ring-red-100">
      <div className="flex flex-col gap-3 border-b border-red-100 bg-red-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="flex min-w-0 items-center gap-3 text-left"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span className="rounded-md bg-red-600 px-2.5 py-1 text-sm font-black uppercase tracking-wide text-white shadow-sm">
            Urgent
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-black leading-tight text-red-900">Priority Applications</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Deadlines need attention now
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-red-700 shadow-sm ring-1 ring-red-200">
            {priorityCount}
          </span>
          {isExpanded ? <ChevronUp size={18} className="shrink-0 text-red-500" /> : <ChevronDown size={18} className="shrink-0 text-red-500" />}
        </button>
        {visibleGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleGroups.map((group) => (
              <span key={group.key} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                {group.title}: {group.applications.length}
              </span>
            ))}
          </div>
        )}
      </div>
      {isExpanded && (
        <div className="px-5 py-4">
          {visibleGroups.length === 0 ? (
            <p className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
              No urgent applications due in the next two weeks.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {priorityApplications.map((application) => (
                <ActionRow
                  key={application.id}
                  application={application}
                  onOpen={onApplicationOpen}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToastHelpers();

  const [viewMode, setViewMode] = useState<DashboardView>(getStoredDashboardView);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationResponse | null>(null);
  const [showYourApplications, setShowYourApplications] = useState(true);
  const [gridFilterRequest, setGridFilterRequest] = useState<GridFilterRequest | null>(null);
  const allApplicationsRef = useRef<HTMLDivElement | null>(null);

  const dashboardQuery = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardData,
    enabled: Boolean(user),
  });

  const profile = dashboardQuery.data?.profile ?? null;
  const applications = useMemo(() => dashboardQuery.data?.applications ?? [], [dashboardQuery.data?.applications]);

  useEffect(() => {
    if (!dashboardQuery.error) return;
    const message = dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : 'Failed to load dashboard data';
    showError('Error', message);
  }, [dashboardQuery.error, showError]);

  const dashboardMetrics = useMemo(() => getDashboardMetrics(applications), [applications]);

  const handleDeleteApplication = async (id: number) => {
    const application = applications.find((item) => item.id === id);
    const applicationName = application?.scholarshipName ?? 'this application';
    if (!confirm(`Delete "${applicationName}" and all its essays?`)) return;
    try {
      await apiDelete(`/applications/${id}`);
      queryClient.setQueryData<DashboardData>(DASHBOARD_QUERY_KEY, (current) => (
        current
          ? { ...current, applications: current.applications.filter((item) => item.id !== id) }
          : current
      ));
      showSuccess('Deleted', 'Application deleted successfully.', 3000);
    } catch {
      showError('Delete failed', 'We could not delete that application. Please try again.', 5000);
    }
  };

  const handleApplicationSaveSuccess = () => {
    setSelectedApplication(null);
    void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
  };

  const handleMetricSelect = (metric: DashboardMetric) => {
    setShowYourApplications(true);
    setViewMode('grid');
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, 'grid');
    setGridFilterRequest((previous) => ({
      id: (previous?.id ?? 0) + 1,
      ...getMetricFilterRequest(metric),
    }));
    window.requestAnimationFrame(() => {
      allApplicationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (authLoading || dashboardQuery.isLoading) return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Spinner />
    </div>
  );

  if (dashboardQuery.error) return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="card card-body">
        <p className="text-red-500">
          {dashboardQuery.error instanceof Error ? dashboardQuery.error.message : 'Failed to load dashboard data'}
        </p>
      </div>
    </div>
  );

  const firstName = profile?.firstName || 'Student';

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
          <main className="min-w-0 space-y-4">
            <section className="rounded-lg border border-gray-200 border-l-4 border-l-brand-500 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-50 sm:block">
                    <img
                      src="/images/welcome-scholarship-money.png"
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold leading-tight text-gray-900">Welcome back, {firstName}! 👋</h1>
                    <p className="mt-1 text-sm font-medium text-gray-500">Here's your scholarship progress</p>
                  </div>
                </div>
                <button
                  className="btn-primary px-4 py-2 shadow-sm sm:self-center"
                  onClick={() => navigate('/applications/new')}
                >
                  <Plus size={16} />
                  New Application
                </button>
              </div>
            </section>

            <PriorityApplications
              applications={applications}
              onApplicationOpen={setSelectedApplication}
              onDelete={handleDeleteApplication}
            />

            <div ref={allApplicationsRef} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  onClick={() => setShowYourApplications((v) => !v)}
                >
                  <h2 className="text-sm font-bold text-gray-900">All Applications</h2>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                    {applications.length}
                  </span>
                  {showYourApplications ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                {showYourApplications && <ViewToggle view={viewMode} onChange={setViewMode} />}
              </div>
              {showYourApplications && (
                <div className="px-5 pb-5 pt-1">
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
                  ) : viewMode === 'feed' ? (
                    <ActionFeed
                      applications={applications}
                      onApplicationOpen={setSelectedApplication}
                      onDelete={handleDeleteApplication}
                    />
                  ) : (
                    <GridView
                      applications={applications}
                      onApplicationOpen={setSelectedApplication}
                      onDelete={handleDeleteApplication}
                      filterRequest={gridFilterRequest}
                    />
                  )}
                </div>
              )}
            </div>
          </main>

          <aside className="space-y-4">
            <DashboardMetricStrip
              metrics={dashboardMetrics.summary}
              variant="rail"
              onMetricSelect={handleMetricSelect}
            />
          </aside>
        </div>
      </div>
      {selectedApplication && (
        <ApplicationPanel
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onSaveSuccess={handleApplicationSaveSuccess}
        />
      )}
    </div>
  );
}

export default Dashboard;
