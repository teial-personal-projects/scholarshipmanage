import React, { useState } from 'react';
import { apiPost } from '../services/api';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';
import { formatDate } from '../utils/date';

interface SendInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collaboration: CollaborationResponse | null;
  collaboratorName?: string;
  applicationName?: string;
  onSuccess?: () => void;
}

function getCollaborationTypeLabel(type: string) {
  switch (type) {
    case 'recommendation': return 'Recommendation Letter';
    case 'essayReview': return 'Essay Review';
    case 'guidance': return 'Guidance/Counseling';
    default: return type;
  }
}

const SendInviteDialog: React.FC<SendInviteDialogProps> = ({
  isOpen,
  onClose,
  collaboration,
  collaboratorName,
  applicationName,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToastHelpers();
  const [isLoading, setIsLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  const handleSendNow = async () => {
    if (!collaboration) return;
    const isResend = collaboration.status === 'invited' && collaboration.invite;
    try {
      setIsLoading(true);
      if (isResend) {
        await apiPost(`/collaborations/${collaboration.id}/invite/resend`, {});
        showSuccess('Invitation Resent', `Invitation resent to ${collaboratorName || 'collaborator'}`);
      } else {
        await apiPost(`/collaborations/${collaboration.id}/invite`, {});
        showSuccess('Invitation Sent', `Invitation sent to ${collaboratorName || 'collaborator'}`);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : (isResend ? 'Failed to resend invitation' : 'Failed to send invitation'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!collaboration || !scheduledFor) return;
    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate < new Date()) {
      showError('Invalid Date', 'Please select a future date and time', 3000);
      return;
    }
    try {
      setIsLoading(true);
      await apiPost(`/collaborations/${collaboration.id}/invite/schedule`, { scheduledFor: scheduledDate.toISOString() });
      showSuccess('Invitation Scheduled', `Invitation scheduled for ${scheduledDate.toLocaleString()}`);
      onSuccess?.();
      onClose();
      setShowSchedule(false);
      setScheduledFor('');
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to schedule invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => { setShowSchedule(false); setScheduledFor(''); onClose(); };

  if (!collaboration || !isOpen) return null;

  const isResend = collaboration.status === 'invited' && collaboration.invite;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-semibold text-gray-900">{isResend ? 'Resend' : 'Send'} Collaboration Invitation</h3>
          <div className="flex gap-2 flex-wrap">
            {!showSchedule ? (
              <>
                <button className="btn-outline text-sm py-1 px-3" onClick={() => setShowSchedule(true)} disabled={isLoading}>
                  Schedule
                </button>
                <button className="btn-primary text-sm py-1 px-3" onClick={handleSendNow} disabled={isLoading}>
                  {isLoading ? (isResend ? 'Resending...' : 'Sending...') : (isResend ? 'Resend' : 'Send Now')}
                </button>
              </>
            ) : (
              <>
                <button className="btn-outline text-sm py-1 px-3" onClick={() => { setShowSchedule(false); setScheduledFor(''); }} disabled={isLoading}>
                  Back
                </button>
                <button className="btn-primary text-sm py-1 px-3" onClick={handleSchedule} disabled={isLoading || !scheduledFor}>
                  {isLoading ? 'Scheduling...' : 'Schedule'}
                </button>
              </>
            )}
            <button className="btn-outline text-sm py-1 px-3" onClick={handleClose} disabled={isLoading}>
              Cancel
            </button>
          </div>
        </div>
        <div className="modal-body space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Collaborator</p>
            <p className="font-semibold">{collaboratorName || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Collaboration Type</p>
            <p className="font-semibold">{getCollaborationTypeLabel(collaboration.collaborationType)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Application</p>
            <p className="font-semibold">{applicationName || 'Unknown'}</p>
          </div>
          {collaboration.nextActionDueDate && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Due Date</p>
              <p className="font-semibold">{formatDate(collaboration.nextActionDueDate)}</p>
            </div>
          )}
          {collaboration.notes && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm">{collaboration.notes}</p>
            </div>
          )}
          {showSchedule && (
            <>
              <hr className="border-gray-200" />
              <div>
                <label className="field-label">Schedule For <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  className="field-input"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendInviteDialog;
