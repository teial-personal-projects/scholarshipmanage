import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import GridView from '../components/GridView';
import ViewToggle from '../components/ViewToggle';
import { getDeadlineDaysRemaining, getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { getDashboardMetrics } from '../utils/dashboardMetrics';
import { getStoredDashboardView, type DashboardView } from '../utils/dashboardView';
import { useToastHelpers } from '../utils/toast';

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

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-sm font-bold text-gray-900">Priority Applications</h2>
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
          {visibleGroups.reduce((total, group) => total + group.applications.length, 0)}
        </span>
      </div>
      <div className="space-y-5 px-5 pb-5">
        {visibleGroups.length === 0 ? (
          <p className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
            No urgent applications due in the next two weeks.
          </p>
        ) : (
          visibleGroups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {group.title} ({group.applications.length})
              </h3>
              <div className="space-y-3">
                {group.applications.map((application) => (
                  <ActionRow
                    key={application.id}
                    application={application}
                    onOpen={onApplicationOpen}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
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
  const [viewMode, setViewMode] = useState<DashboardView>(getStoredDashboardView);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationResponse | null>(null);
  const [showYourApplications, setShowYourApplications] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

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
  }, [showError, user]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const dashboardMetrics = useMemo(() => getDashboardMetrics(applications), [applications]);

  const handleDeleteApplication = async (id: number) => {
    if (!confirm('Delete this application and all its essays?')) return;
    await apiDelete(`/applications/${id}`);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  const handleApplicationSaveSuccess = () => {
    setSelectedApplication(null);
    void fetchData();
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

            <div className="card">
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
                    />
                  )}
                </div>
              )}
            </div>
          </main>

          <aside className="space-y-4">
            <DashboardMetricStrip metrics={dashboardMetrics.summary} variant="rail" />
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
