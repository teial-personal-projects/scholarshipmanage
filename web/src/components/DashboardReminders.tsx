import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiDelete } from '../services/api';
import type { DashboardReminders } from '@scholarshipmanage/shared';
import { parseDateOnlyToLocalDate } from '../utils/date';

interface DashboardRemindersProps {
  onDelete?: (id: number) => Promise<void>;
}

function formatDueDate(dueDate: string): string {
  const parsed = parseDateOnlyToLocalDate(dueDate);
  if (!parsed) return dueDate;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DashboardReminders({ onDelete }: DashboardRemindersProps) {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<DashboardReminders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverdueApps, setShowOverdueApps] = useState(true);
  const [showDueSoonApps, setShowDueSoonApps] = useState(true);
  const [showCollaborations, setShowCollaborations] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
    if (days <= 7) return 'badge badge-orange';
    return 'badge badge-gray';
  };

  const formatDaysText = (days: number): string => {
    if (days < 0) { const d = Math.abs(days); return `${d} day${d !== 1 ? 's' : ''} overdue`; }
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days until due`;
  };

  const handleDelete = async (id: number) => {
    if (!onDelete) {
      if (!confirm('Delete this application and all its essays?')) return;
      setDeletingId(id);
      try {
        await apiDelete(`/applications/${id}`);
        setReminders((prev) => {
          if (!prev) return prev;
          const filter = (list: typeof prev.applications.overdue) => list.filter((a) => a.id !== id);
          return { ...prev, applications: { overdue: filter(prev.applications.overdue), dueSoon: filter(prev.applications.dueSoon) } };
        });
      } finally {
        setDeletingId(null);
      }
      return;
    }
    setDeletingId(id);
    try {
      await onDelete(id);
      setReminders((prev) => {
        if (!prev) return prev;
        const filter = (list: typeof prev.applications.overdue) => list.filter((a) => a.id !== id);
        return { ...prev, applications: { overdue: filter(prev.applications.overdue), dueSoon: filter(prev.applications.dueSoon) } };
      });
    } finally {
      setDeletingId(null);
    }
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

  if (reminders.stats.totalOverdue === 0 && reminders.stats.totalUpcoming === 0) return null;

  const AppCard = ({ app, colorClass, borderClass }: { app: typeof reminders.applications.overdue[0]; colorClass: string; borderClass: string }) => {
    const days = getDaysUntilDue(app.dueDate);
    return (
      <div className={`p-3 ${colorClass} rounded-lg border ${borderClass}`}>
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <p className="font-medium flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <span className="truncate">{app.scholarshipName}</span>
            {app.organization && <span className="text-sm text-gray-500 font-normal">— {app.organization}</span>}
            <span className={getUrgencyBadge(days)}>{formatDaysText(days)}</span>
            <span className="text-xs text-gray-500">{formatDueDate(app.dueDate)}</span>
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <button className="text-blue-500 text-sm hover:underline" onClick={() => navigate(`/applications/${app.id}`)}>
              View
            </button>
            <button
              className="text-red-400 text-sm hover:text-red-600 disabled:opacity-40"
              disabled={deletingId === app.id}
              onClick={() => handleDelete(app.id)}
            >
              {deletingId === app.id ? '…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reminders.applications.overdue.length > 0 && (
          <div className="card border-2 border-red-200 flex flex-col">
            <button type="button" className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 shrink-0" onClick={() => setShowOverdueApps(!showOverdueApps)}>
              <h3 className="font-semibold text-sm text-red-600">Overdue Applications ({reminders.applications.overdue.length})</h3>
              <span className="text-gray-400 text-xs">{showOverdueApps ? '▼' : '▶'}</span>
            </button>
            {showOverdueApps && (
              <div className="px-4 pb-4 space-y-3 overflow-y-auto max-h-72">
                {reminders.applications.overdue.map((app) => (
                  <AppCard key={app.id} app={app} colorClass="bg-red-50" borderClass="border-red-200" />
                ))}
              </div>
            )}
          </div>
        )}

        {reminders.applications.dueSoon.length > 0 && (
          <div className="card border border-orange-200 flex flex-col">
            <button type="button" className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 shrink-0" onClick={() => setShowDueSoonApps(!showDueSoonApps)}>
              <h3 className="font-semibold text-sm text-orange-700">Applications Due Soon ({reminders.applications.dueSoon.length})</h3>
              <span className="text-gray-400 text-xs">{showDueSoonApps ? '▼' : '▶'}</span>
            </button>
            {showDueSoonApps && (
              <div className="px-4 pb-4 space-y-3 overflow-y-auto max-h-72">
                {reminders.applications.dueSoon.map((app) => (
                  <AppCard key={app.id} app={app} colorClass="bg-orange-50" borderClass="border-orange-200" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
                        {days !== null && <span className={`badge mt-1 ${days < 0 ? 'badge-red' : days <= 3 ? 'badge-orange' : 'badge-blue'}`}>{formatDaysText(days)}</span>}
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
