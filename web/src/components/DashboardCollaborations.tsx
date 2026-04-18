import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import type { ApplicationResponse, CollaborationResponse, CollaborationResponseWithSnakeCase, CollaboratorResponse } from '@scholarship-hub/shared';
import { formatDate } from '../utils/date';

const STATUS_BADGE: Record<string, string> = {
  completed: 'badge badge-green',
  submitted: 'badge badge-green',
  in_progress: 'badge badge-blue',
  pending: 'badge badge-gray',
  invited: 'badge badge-gray',
  declined: 'badge badge-red',
};

function getStatusBadge(status: string) {
  return STATUS_BADGE[status] || 'badge badge-gray';
}

function DashboardCollaborations() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationResponse[]>([]);
  const [collaborators, setCollaborators] = useState<Map<number, CollaboratorResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'essayReviews'>('recommendations');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const applicationsData = await apiGet<ApplicationResponse[]>('/applications');
        setApplications(applicationsData || []);

        const allCollaborations: CollaborationResponse[] = [];
        const collaboratorIds = new Set<number>();

        for (const app of applicationsData || []) {
          try {
            const collabs = await apiGet<CollaborationResponse[]>(`/applications/${app.id}/collaborations`);
            if (collabs) {
              allCollaborations.push(...collabs);
              collabs.forEach(collab => {
                collaboratorIds.add(collab.collaboratorId);
                const embedded = collab as CollaborationResponse & { collaborator?: CollaboratorResponse };
                if (embedded.collaborator?.id) collaboratorIds.delete(embedded.collaborator.id);
              });
            }
          } catch (err) {
            console.error(`Failed to load collaborations for application ${app.id}:`, err);
          }
        }
        setCollaborations(allCollaborations);

        const collaboratorMap = new Map<number, CollaboratorResponse>();
        allCollaborations.forEach(collab => {
          const embedded = collab as CollaborationResponse & { collaborator?: CollaboratorResponse };
          if (embedded.collaborator?.id) collaboratorMap.set(embedded.collaborator.id, embedded.collaborator);
        });

        for (const collabId of collaboratorIds) {
          if (!collaboratorMap.has(collabId)) {
            try {
              const data = await apiGet<CollaboratorResponse>(`/collaborators/${collabId}`);
              collaboratorMap.set(collabId, data);
            } catch (err) {
              console.error(`Failed to fetch collaborator ${collabId}:`, err);
            }
          }
        }
        setCollaborators(collaboratorMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collaborations');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const recommendations = useMemo(() => collaborations.filter(c => {
    const t = c as CollaborationResponseWithSnakeCase;
    return (t.collaborationType || t.collaboration_type) === 'recommendation';
  }), [collaborations]);

  const essayCollaborations = useMemo(() => collaborations.filter(c => {
    const t = c as CollaborationResponseWithSnakeCase;
    return (t.collaborationType || t.collaboration_type) === 'essayReview';
  }), [collaborations]);

  const applicationMap = useMemo(() => {
    const map = new Map<number, string>();
    applications.forEach(app => map.set(app.id, app.scholarshipName));
    return map;
  }, [applications]);

  if (loading) return (
    <div className="card">
      <div className="card-body flex flex-col items-center gap-2 py-8">
        <div className="spinner w-8 h-8" />
        <p className="text-gray-600 text-sm">Loading collaborations...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="card">
      <div className="card-body">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    </div>
  );

  const renderRow = (collab: CollaborationResponse) => {
    const appName = applicationMap.get(collab.applicationId) || 'Unknown Application';
    const colr = collaborators.get(collab.collaboratorId);
    const colrName = colr ? `${colr.firstName} ${colr.lastName}` : `Collaborator #${collab.collaboratorId}`;
    return (
      <tr key={collab.id} className="border-b border-gray-100 hover:bg-[#F2F4EC] cursor-pointer" onClick={() => navigate(`/applications/${collab.applicationId}`)}>
        <td className="table-td font-medium text-brand-700">{appName}</td>
        <td className="table-td text-gray-600">{colrName}</td>
        <td className="table-td"><span className={getStatusBadge(collab.status)}>{collab.status}</span></td>
        <td className="table-td text-gray-700">{collab.nextActionDueDate ? formatDate(collab.nextActionDueDate) : '-'}</td>
        <td className="table-td">
          <button className="text-accent-500 font-semibold text-sm hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/applications/${collab.applicationId}`); }}>
            View →
          </button>
        </td>
      </tr>
    );
  };

  const renderCard = (collab: CollaborationResponse) => {
    const appName = applicationMap.get(collab.applicationId) || 'Unknown Application';
    const colr = collaborators.get(collab.collaboratorId);
    const colrName = colr ? `${colr.firstName} ${colr.lastName}` : `Collaborator #${collab.collaboratorId}`;
    return (
      <div key={collab.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/applications/${collab.applicationId}`)}>
        <div className="flex justify-between items-start gap-2 mb-2">
          <div>
            <p className="font-bold text-brand-700">{appName}</p>
            <p className="text-sm text-gray-600">{colrName}</p>
          </div>
          <span className={getStatusBadge(collab.status)}>{collab.status}</span>
        </div>
        {collab.nextActionDueDate && <p className="text-sm text-gray-600">Due: {formatDate(collab.nextActionDueDate)}</p>}
      </div>
    );
  };

  const renderEmpty = (msg: string, icon: string) => (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-gray-600">{msg}</p>
    </div>
  );

  const renderList = (list: CollaborationResponse[], emptyMsg: string, icon: string) => (
    list.length === 0 ? renderEmpty(emptyMsg, icon) : (
      <>
        <div className="hidden md:block overflow-x-auto">
          <table className="table-root">
            <thead><tr className="table-header-row">
              <th className="table-th">Application</th>
              <th className="table-th">Collaborator</th>
              <th className="table-th">Status</th>
              <th className="table-th">Due Date</th>
              <th className="table-th">Actions</th>
            </tr></thead>
            <tbody>{list.map(renderRow)}</tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 md:hidden">{list.map(renderCard)}</div>
      </>
    )
  );

  const tabs = [
    { key: 'recommendations', label: `Recommendations${recommendations.length > 0 ? ` (${recommendations.length})` : ''}` },
    { key: 'essayReviews', label: `Essay Reviews${essayCollaborations.length > 0 ? ` (${essayCollaborations.length})` : ''}` },
  ] as const;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold text-brand-700">Collaborations</h3>
      </div>
      <div className="card-body">
        <div className="flex gap-1 border-b border-gray-200 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'recommendations' && renderList(recommendations, 'No recommendation requests yet.', '📝')}
        {activeTab === 'essayReviews' && renderList(essayCollaborations, 'No essay review collaborations yet.', '✏️')}
      </div>
    </div>
  );
}

export default DashboardCollaborations;
