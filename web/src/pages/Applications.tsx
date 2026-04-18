import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, History } from 'lucide-react';
import { apiGet, apiDelete } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ApplicationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

function getStatusClasses(status: string) {
  switch (status) {
    case 'Submitted':
    case 'Awarded':
      return 'badge badge-green';
    case 'In Progress':
      return 'badge badge-blue';
    case 'Not Started':
      return 'badge badge-gray';
    case 'Not Awarded':
      return 'badge badge-red';
    default:
      return 'badge badge-orange';
  }
}

function Pagination({
  currentPage, totalPages, onPageChange,
}: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
  );
  return (
    <div className="flex items-center justify-center gap-1 pt-4 border-t border-gray-200 flex-wrap">
      <button className="btn-outline px-2 py-1 text-xs" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>‹</button>
      {pages.map((page, idx) => {
        const prev = pages[idx - 1];
        return (
          <span key={page} className="flex items-center">
            {prev && page - prev > 1 && <span className="px-2 text-gray-400 text-sm">...</span>}
            <button
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${currentPage === page ? 'bg-brand-800 text-white border-brand-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </span>
        );
      })}
      <button className="btn-outline px-2 py-1 text-xs" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>›</button>
    </div>
  );
}

function Applications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchApplications() {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ApplicationResponse[]>('/applications');
        setApplications(data || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load applications';
        setError(msg);
        showError('Error', msg);
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
  }, [user, showError]);

  const filteredApplications = useMemo(() =>
    applications.filter((app) => {
      if (!app?.scholarshipName) return false;
      const matchesSearch =
        app.scholarshipName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.organization?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    [applications, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(start, start + itemsPerPage);
  }, [filteredApplications, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: number) => { setDeleteId(id); setDeleteOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await apiDelete(`/applications/${deleteId}`);
      setApplications(applications.filter(app => app.id !== deleteId));
      showSuccess('Success', 'Application deleted successfully', 3000);
      setDeleteOpen(false);
      setDeleteId(null);
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to delete application');
    }
  };

  if (authLoading || loading) return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col items-center gap-4">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading applications...</p>
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="card card-body"><p className="text-red-500">{error}</p></div>
    </div>
  );

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6">
        {/* Header */}
        <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">My Scholarship Applications</h1>
            <p className="text-white/90 text-sm mt-1">Manage all your scholarship applications in one place</p>
          </div>
          <button className="bg-white text-brand-600 font-semibold px-4 py-2 rounded-lg shadow hover:bg-gray-50 text-sm" onClick={() => navigate('/applications/new')}>
            New Application
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-body">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  className="field-input"
                  placeholder="Search by name or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="min-w-[160px]">
                <select
                  className="field-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Awarded">Awarded</option>
                  <option value="Not Awarded">Not Awarded</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between flex-wrap gap-3">
            <h2 className="section-heading">
              {filteredApplications.length} Application{filteredApplications.length !== 1 ? 's' : ''}
            </h2>
            {filteredApplications.length > 0 && (
              <span className="badge badge-green text-xs">
                Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredApplications.length)} of {filteredApplications.length}
              </span>
            )}
          </div>
          <div className="card-body">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">{searchTerm || statusFilter !== 'all' ? '🔍' : '📝'}</div>
                <h3 className="font-semibold text-brand-700 text-lg mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'No applications found' : 'Start Your Application Journey'}
                </h3>
                <p className="text-gray-600 text-sm mb-6 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : "You don't have any applications yet. Create your first application to get started!"}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button className="btn-primary px-6 py-2" onClick={() => navigate('/applications/new')}>
                    Create Your First Application
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
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
                      {paginatedApplications.map((app) => (
                        <tr key={app.id} className="table-row" onClick={() => navigate(`/applications/${app.id}`)}>
                          <td className="table-td font-medium text-brand-700">{app.scholarshipName}</td>
                          <td className="table-td text-gray-600">{app.organization || '-'}</td>
                          <td className="table-td"><span className={getStatusClasses(app.status)}>{app.status}</span></td>
                          <td className="table-td text-gray-700">{app.dueDate ? new Date(app.dueDate).toLocaleDateString() : '-'}</td>
                          <td className="table-td">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button className="btn-ghost p-1.5 text-blue-600 hover:bg-blue-50" aria-label="View" onClick={() => navigate(`/applications/${app.id}`)}><Eye size={15} /></button>
                              <button className="btn-ghost p-1.5 text-gray-600 hover:bg-gray-50" aria-label="Edit" onClick={() => navigate(`/applications/${app.id}/edit`)}><Pencil size={15} /></button>
                              <button className="btn-ghost p-1.5 text-purple-600 hover:bg-purple-50" aria-label="History" onClick={() => navigate(`/applications/${app.id}`)}><History size={15} /></button>
                              <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete" onClick={() => handleDeleteClick(app.id)}><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="flex flex-col gap-3 md:hidden">
                  {paginatedApplications.map((app) => (
                    <div key={app.id} className="card p-4 cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => navigate(`/applications/${app.id}`)}>
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate">{app.scholarshipName}</p>
                          {app.organization && <p className="text-sm text-gray-600 mt-0.5">{app.organization}</p>}
                        </div>
                        <span className={getStatusClasses(app.status)}>{app.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="font-semibold">Due:</span> {app.dueDate ? new Date(app.dueDate).toLocaleDateString() : '-'}
                      </p>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-outline p-1.5" aria-label="View" onClick={() => navigate(`/applications/${app.id}`)}><Eye size={15} /></button>
                        <button className="btn-outline p-1.5" aria-label="Edit" onClick={() => navigate(`/applications/${app.id}/edit`)}><Pencil size={15} /></button>
                        <button className="btn-outline p-1.5" aria-label="History" onClick={() => navigate(`/applications/${app.id}`)}><History size={15} /></button>
                        <button className="btn-danger p-1.5" aria-label="Delete" onClick={() => handleDeleteClick(app.id)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      {deleteOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteOpen(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold text-gray-900">Delete Application</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setDeleteOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-gray-700">
                Are you sure? This will permanently delete the application and all associated essays and collaborations. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button ref={cancelRef} className="btn-outline" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Applications;
