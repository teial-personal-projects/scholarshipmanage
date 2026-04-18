import React from 'react';
import { useCollaborationHistory } from '../hooks/useCollaborations';
import { formatRelativeTimestamp } from '../utils/date';

interface CollaborationHistoryProps {
  collaborationId: number;
  isOpen?: boolean;
}

const ACTION_BADGE_CLASSES: Record<string, string> = {
  accepted: 'badge badge-green',
  submitted: 'badge badge-green',
  completed: 'badge badge-green',
  in_progress: 'badge badge-blue',
  invited: 'badge badge-purple',
  reminder_sent: 'badge badge-purple',
  viewed: 'badge badge-blue',
  declined: 'badge badge-red',
  comment_added: 'badge badge-orange',
};

function getActionLabel(action: string) {
  switch (action) {
    case 'invited': return 'Invitation Sent';
    case 'reminder_sent': return 'Reminder Sent';
    case 'viewed': return 'Invitation Viewed';
    case 'accepted': return 'Invitation Accepted';
    case 'declined': return 'Invitation Declined';
    case 'in_progress': return 'Marked In Progress';
    case 'submitted': return 'Submitted';
    case 'completed': return 'Marked Completed';
    case 'comment_added': return 'Comment Added';
    default: return action;
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case 'invited': return '📧';
    case 'reminder_sent': return '🔔';
    case 'viewed': return '👁️';
    case 'accepted': return '✅';
    case 'declined': return '❌';
    case 'in_progress': return '🚀';
    case 'submitted': case 'completed': return '🎉';
    case 'comment_added': return '💬';
    default: return '📝';
  }
}

const CollaborationHistory: React.FC<CollaborationHistoryProps> = ({ collaborationId, isOpen }) => {
  const { data: history = [], isLoading: loading } = useCollaborationHistory(
    isOpen === false ? null : collaborationId
  );

  if (loading) return (
    <div className="text-center py-4">
      <div className="spinner w-8 h-8 mx-auto" />
      <p className="text-sm text-gray-500 mt-2">Loading history...</p>
    </div>
  );

  if (history.length === 0) return (
    <p className="text-sm text-gray-500 text-center py-4">No history available</p>
  );

  return (
    <div className="space-y-0">
      {history.map((entry, index) => (
        <div key={entry.id}>
          <div className="flex items-start gap-3 py-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full border-2 border-gray-200 text-lg">
                {getActionIcon(entry.action)}
              </div>
              {index < history.length - 1 && (
                <div className="absolute left-1/2 top-11 w-0.5 h-full bg-gray-200 -translate-x-1/2" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className={ACTION_BADGE_CLASSES[entry.action] || 'badge badge-gray'}>
                  {getActionLabel(entry.action)}
                </span>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatRelativeTimestamp(entry.createdAt, 'N/A')}
                </span>
              </div>
              {entry.details && <p className="text-sm text-gray-600 mt-1">{entry.details}</p>}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(entry.createdAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          {index < history.length - 1 && <hr className="border-gray-100" />}
        </div>
      ))}
    </div>
  );
};

export default CollaborationHistory;
