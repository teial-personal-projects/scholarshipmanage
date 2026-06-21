import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Grid2X2, List, Plus } from 'lucide-react';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ActionFeed from '../components/ActionFeed';
import ApplicationPanel from '../components/ApplicationPanel';
import DeadlineRadar from '../components/DeadlineRadar';
import DashboardReminders from '../components/DashboardReminders';
import GridView from '../components/GridView';
import { isApplicationDone, type UserProfile, type ApplicationResponse } from '@scholarshipmanage/shared';
import { filterApplicationsByRadar, type DeadlineRadarFilter } from '../utils/deadlineRadar';
import { useToastHelpers } from '../utils/toast';

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading dashboard...</p>
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
  const [radarFilter, setRadarFilter] = useState<DeadlineRadarFilter | null>(null);
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationResponse | null>(null);

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

  const displayedApplications = useMemo(() => (
    radarFilter ? filterApplicationsByRadar(applications, radarFilter) : applications
  ), [applications, radarFilter]);

  const handleRadarFilterChange = (filter: DeadlineRadarFilter | null) => {
    setRadarFilter(filter);
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
            ) : displayedApplications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-gray-600 text-sm">No applications match this radar filter.</p>
              </div>
            ) : viewMode === 'feed' ? (
              <ActionFeed
                applications={displayedApplications}
                onApplicationOpen={setSelectedApplication}
              />
            ) : (
              <GridView applications={displayedApplications} />
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
