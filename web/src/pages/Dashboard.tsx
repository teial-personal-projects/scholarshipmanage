import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DashboardReminders from '../components/DashboardReminders';
import type { UserProfile, ApplicationResponse } from '@scholarshipmanage/shared';
import { useToastHelpers } from '../utils/toast';

const STATUS_BADGE: Record<string, string> = {
  'In Progress': 'badge badge-blue',
  'Submitted': 'badge badge-green',
  'Awarded': 'badge badge-green',
  'Not Awarded': 'badge badge-red',
  'Not Started': 'badge badge-gray',
};

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
  const [activeTab, setActiveTab] = useState<'inProgress' | 'submitted'>('inProgress');
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
    applications.filter(a => ['Submitted', 'Awarded', 'Not Awarded'].includes(a.status)).length,
    [applications]);

  const filteredApplications = useMemo(() => {
    if (activeTab === 'inProgress') return applications.filter(a => a.status === 'In Progress');
    return applications.filter(a => ['Submitted', 'Awarded', 'Not Awarded'].includes(a.status));
  }, [applications, activeTab]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(start, start + itemsPerPage);
  }, [filteredApplications, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [applications.length, activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                onClick={() => navigate(`/applications/${app.id}`)}
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
                    onClick={(e) => { e.stopPropagation(); navigate(`/applications/${app.id}`); }}
                  >
                    View →
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
            onClick={() => navigate(`/applications/${app.id}`)}
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

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6">
        {/* Welcome Banner */}
        <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">Welcome back, {firstName}!</h1>
            <p className="text-white/90 text-sm mt-1">
              {applications.length === 0
                ? 'Get started by creating your first scholarship application'
                : `You have ${applications.length} application${applications.length !== 1 ? 's' : ''} · ${inProgressCount} in progress · ${submittedCount} submitted`}
            </p>
          </div>
          <button
            className="bg-white text-brand-600 font-semibold px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition-colors text-sm"
            onClick={() => navigate('/applications/new')}
          >
            + New Application
          </button>
        </div>

        {/* Reminders */}
        <DashboardReminders />

        {/* Applications */}
        <div className="card">
          <div className="card-header">
            <h2 className="section-heading">Your Applications</h2>
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
                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-200">
                  {(['inProgress', 'submitted'] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === tab
                          ? 'border-brand-500 text-brand-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'inProgress' ? 'In Progress' : 'Submitted'}
                      <span className={`badge text-xs ${activeTab === tab ? 'badge-green' : 'badge-gray'}`}>
                        {tab === 'inProgress' ? inProgressCount : submittedCount}
                      </span>
                    </button>
                  ))}
                </div>

                {filteredApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">{activeTab === 'inProgress' ? '📝' : '✅'}</div>
                    <p className="text-gray-600 text-sm">
                      {activeTab === 'inProgress' ? 'No applications in progress yet.' : 'No submitted applications yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AppTable apps={paginatedApplications} />
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
    </div>
  );
}

export default Dashboard;
