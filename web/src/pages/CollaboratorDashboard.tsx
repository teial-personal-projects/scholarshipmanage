import { useState } from 'react';
import { useCollaboratorCollaborations } from '../hooks/useCollaborations';
import type { CollaborationResponse } from '@scholarshipmanage/shared';
import CollaborationHistory from '../components/CollaborationHistory';
import { apiPatch } from '../services/api';
import { formatDateNoTimezone, formatRelativeTimestamp } from '../utils/date';
import { useToastHelpers } from '../utils/toast';

function getStatusClasses(status: string) {
  switch (status) {
    case 'completed': case 'submitted': return 'badge badge-green';
    case 'in_progress': return 'badge badge-blue';
    case 'pending': case 'invited': return 'badge badge-orange';
    case 'declined': return 'badge badge-red';
    default: return 'badge badge-gray';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'in_progress': return 'In Progress';
    case 'not_invited': return 'Not Invited';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function CollaboratorDashboard() {
  const { data: collaborations = [], isLoading: loading, refetch } = useCollaboratorCollaborations();
  const { showSuccess, showError } = useToastHelpers();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCollaborationId, setHistoryCollaborationId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recommendations' | 'essayReviews' | 'guidance'>('all');

  const handleMarkAsSubmitted = async (collaborationId: number) => {
    try {
      setSubmitting(collaborationId);
      await apiPatch(`/collaborations/${collaborationId}`, {
        status: 'submitted',
        awaitingActionFrom: 'student',
        nextActionDescription: 'Review submitted work',
      });
      showSuccess('Success', 'Marked as submitted. The student will be notified.', 3000, true);
      await refetch();
    } catch {
      showError('Error', 'Failed to update collaboration status', 5000, true);
    } finally {
      setSubmitting(null);
    }
  };

  const recommendations = collaborations.filter(c => c.collaborationType === 'recommendation');
  const essayReviews = collaborations.filter(c => c.collaborationType === 'essayReview');
  const guidance = collaborations.filter(c => c.collaborationType === 'guidance');

  const handleViewHistory = (id: number) => { setHistoryCollaborationId(id); setIsHistoryOpen(true); };

  const renderTable = (list: CollaborationResponse[]) => {
    if (list.length === 0) return <p className="text-gray-500 text-sm">No collaborations in this category</p>;
    return (
      <>
        <div className="hidden md:block overflow-x-auto">
          <table className="table-root">
            <thead>
              <tr className="table-header-row">
                <th className="table-th">Student</th>
                <th className="table-th">Application</th>
                <th className="table-th">Status</th>
                <th className="table-th">Due Date</th>
                <th className="table-th">Last Updated</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="table-td font-semibold">Student #{c.userId}</td>
                  <td className="table-td">Application #{c.applicationId}</td>
                  <td className="table-td"><span className={getStatusClasses(c.status)}>{getStatusLabel(c.status)}</span></td>
                  <td className="table-td">{c.nextActionDueDate ? formatDateNoTimezone(c.nextActionDueDate) : <span className="text-gray-400">-</span>}</td>
                  <td className="table-td text-gray-600 text-sm">{formatRelativeTimestamp(c.updatedAt, '-')}</td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button className="btn-outline text-xs px-2 py-1" onClick={() => handleViewHistory(c.id)}>View History</button>
                      {c.status === 'in_progress' && (
                        <button className="btn-primary text-xs px-2 py-1 bg-green-600 hover:bg-green-700" onClick={() => handleMarkAsSubmitted(c.id)} disabled={submitting === c.id}>
                          {submitting === c.id ? 'Marking...' : 'Mark as Submitted'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 md:hidden">
          {list.map((c) => (
            <div key={c.id} className="card p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-800">Student #{c.userId}</p>
                  <p className="text-sm text-gray-600">Application #{c.applicationId}</p>
                </div>
                <span className={getStatusClasses(c.status)}>{getStatusLabel(c.status)}</span>
              </div>
              {c.nextActionDueDate && <p className="text-sm text-gray-600">Due: {formatDateNoTimezone(c.nextActionDueDate)}</p>}
              <p className="text-xs text-gray-500">Updated: {formatRelativeTimestamp(c.updatedAt, '-')}</p>
              <div className="flex flex-col gap-2">
                <button className="btn-outline text-xs py-1" onClick={() => handleViewHistory(c.id)}>View History</button>
                {c.status === 'in_progress' && (
                  <button className="btn-primary text-xs py-1 bg-green-600 hover:bg-green-700" onClick={() => handleMarkAsSubmitted(c.id)} disabled={submitting === c.id}>
                    {submitting === c.id ? 'Marking...' : 'Mark as Submitted'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const tabList = [
    { key: 'all', label: `All (${collaborations.length})` },
    { key: 'recommendations', label: `Recommendations (${recommendations.length})` },
    { key: 'essayReviews', label: `Essay Reviews (${essayReviews.length})` },
    { key: 'guidance', label: `Guidance (${guidance.length})` },
  ] as const;

  const tabData: Record<string, CollaborationResponse[]> = {
    all: collaborations,
    recommendations,
    essayReviews: essayReviews,
    guidance,
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col items-center gap-4">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading collaborations...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Collaborations</h1>
        <p className="text-gray-600 text-sm mt-1">Manage your recommendations, essay reviews, and guidance sessions</p>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-gray-200 min-w-max">
          {tabList.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>{renderTable(tabData[activeTab])}</div>

      {isHistoryOpen && (
        <div className="modal-backdrop" onClick={() => setIsHistoryOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold text-gray-900">Collaboration History</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setIsHistoryOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {historyCollaborationId && (
                <CollaborationHistory collaborationId={historyCollaborationId} isOpen={isHistoryOpen} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollaboratorDashboard;
