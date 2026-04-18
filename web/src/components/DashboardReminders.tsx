import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import type { DashboardReminders } from '@scholarshipmanage/shared';
import { parseDateOnlyToLocalDate } from '../utils/date';

function DashboardReminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<DashboardReminders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApplications, setShowApplications] = useState(true);
  const [showCollaborations, setShowCollaborations] = useState(true);

  useEffect(() => {
    async function fetchReminders() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<DashboardReminders>('/users/me/reminders');
        setReminders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reminders');
      } finally {
        setLoading(false);
      }
    }
    fetchReminders();
  }, []);

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = dueDate.includes('T') ? new Date(dueDate) : parseDateOnlyToLocalDate(dueDate);
    const dueDateObj = due ?? new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    return Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyBadge = (days: number) => {
    if (days < 0) return 'badge badge-red';
    if (days <= 3) return 'badge badge-orange';
    if (days <= 7) return 'badge badge-blue';
    return 'badge badge-gray';
  };

  const formatDaysText = (days: number): string => {
    if (days < 0) { const d = Math.abs(days); return `${d} day${d !== 1 ? 's' : ''} overdue`; }
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days until due`;
  };

  if (loading) return (
    <div className="card">
      <div className="card-body flex flex-col items-center gap-2 py-8">
        <div className="spinner w-8 h-8" />
        <p className="text-gray-600 text-sm">Loading reminders...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
  );

  if (!reminders) return null;

  const hasOverdue = reminders.stats.totalOverdue > 0;
  const hasUpcoming = reminders.stats.totalUpcoming > 0;
  if (!hasOverdue && !hasUpcoming) return null;

  return (
    <div className="space-y-4">
      <div className={`card border ${hasOverdue ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
        <div className="card-body flex flex-wrap gap-3">
          {hasOverdue && <span className="badge badge-red text-sm px-3 py-1">{reminders.stats.totalOverdue} Overdue</span>}
          {hasUpcoming && <span className="badge badge-blue text-sm px-3 py-1">{reminders.stats.totalUpcoming} Due Soon</span>}
        </div>
      </div>

      {reminders.applications.overdue.length > 0 && (
        <div className="card border-2 border-red-200">
          <button type="button" className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50" onClick={() => setShowApplications(!showApplications)}>
            <h3 className="font-semibold text-sm text-red-600">Overdue Applications ({reminders.applications.overdue.length})</h3>
            <span className="text-gray-400 text-xs">{showApplications ? '▼' : '▶'}</span>
          </button>
          {showApplications && (
            <div className="px-4 pb-4 space-y-3">
              {reminders.applications.overdue.map((app) => {
                const days = getDaysUntilDue(app.dueDate);
                return (
                  <div key={app.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{app.scholarshipName}</p>
                        <p className="text-sm text-gray-600">{app.organization || 'Organization not specified'}</p>
                        <span className={`${getUrgencyBadge(days)} mt-1`}>{formatDaysText(days)}</span>
                      </div>
                      <button className="text-blue-500 text-sm hover:underline" onClick={() => navigate(`/applications/${app.id}`)}>
                        View Application
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {reminders.applications.dueSoon.length > 0 && (
        <div className="card border border-blue-200">
          <button type="button" className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50" onClick={() => setShowApplications(!showApplications)}>
            <h3 className="font-semibold text-sm text-blue-600">Applications Due Soon ({reminders.applications.dueSoon.length})</h3>
            <span className="text-gray-400 text-xs">{showApplications ? '▼' : '▶'}</span>
          </button>
          {showApplications && (
            <div className="px-4 pb-4 space-y-3">
              {reminders.applications.dueSoon.map((app) => {
                const days = getDaysUntilDue(app.dueDate);
                return (
                  <div key={app.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{app.scholarshipName}</p>
                        <p className="text-sm text-gray-600">{app.organization || 'Organization not specified'}</p>
                        <span className={`${getUrgencyBadge(days)} mt-1`}>{formatDaysText(days)}</span>
                      </div>
                      <button className="text-blue-500 text-sm hover:underline" onClick={() => navigate(`/applications/${app.id}`)}>
                        View Application
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {reminders.collaborations.overdue.length > 0 && (
        <div className="card border-2 border-red-200">
          <button type="button" className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50" onClick={() => setShowCollaborations(!showCollaborations)}>
            <h3 className="font-semibold text-sm text-red-600">Overdue Collaborations ({reminders.collaborations.overdue.length})</h3>
            <span className="text-gray-400 text-xs">{showCollaborations ? '▼' : '▶'}</span>
          </button>
          {showCollaborations && (
            <div className="px-4 pb-4 space-y-3">
              {reminders.collaborations.overdue.map((collab) => {
                const days = collab.nextActionDueDate ? getDaysUntilDue(collab.nextActionDueDate) : null;
                return (
                  <div key={collab.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex-1">
                        <p className="font-medium">
                          {collab.collaborationType === 'recommendation' && 'Recommendation'}
                          {collab.collaborationType === 'essayReview' && 'Essay Review'}
                          {collab.collaborationType === 'guidance' && 'Guidance Session'}
                        </p>
                        {days !== null && <span className="badge badge-red mt-1">{formatDaysText(days)}</span>}
                      </div>
                      <button className="text-blue-500 text-sm hover:underline" onClick={() => navigate(`/collaborations/${collab.id}`)}>
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {reminders.collaborations.dueSoon.length > 0 && (
        <div className="card border border-blue-200">
          <button type="button" className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50" onClick={() => setShowCollaborations(!showCollaborations)}>
            <h3 className="font-semibold text-sm text-blue-600">Collaborations Due Soon ({reminders.collaborations.dueSoon.length})</h3>
            <span className="text-gray-400 text-xs">{showCollaborations ? '▼' : '▶'}</span>
          </button>
          {showCollaborations && (
            <div className="px-4 pb-4 space-y-3">
              {reminders.collaborations.dueSoon.map((collab) => {
                const days = collab.nextActionDueDate ? getDaysUntilDue(collab.nextActionDueDate) : null;
                return (
                  <div key={collab.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex-1">
                        <p className="font-medium">
                          {collab.collaborationType === 'recommendation' && 'Recommendation'}
                          {collab.collaborationType === 'essayReview' && 'Essay Review'}
                          {collab.collaborationType === 'guidance' && 'Guidance Session'}
                        </p>
                        {days !== null && <span className={`${getUrgencyBadge(days)} mt-1`}>{formatDaysText(days)}</span>}
                      </div>
                      <button className="text-blue-500 text-sm hover:underline" onClick={() => navigate(`/collaborations/${collab.id}`)}>
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardReminders;
