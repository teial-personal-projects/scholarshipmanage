import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../services/api';
import type { CollaboratorResponse, EssayResponse } from '@scholarshipmanage/shared';
import { useToastHelpers } from '../utils/toast';

interface AddCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  essays: EssayResponse[];
  onSuccess: () => void;
}

function AddCollaborationModal({
  isOpen,
  onClose,
  applicationId,
  onSuccess,
}: AddCollaborationModalProps) {
  const { showSuccess, showError } = useToastHelpers();

  const [collaboratorId, setCollaboratorId] = useState<number | null>(null);
  const [collaborationType, setCollaborationType] = useState<'recommendation' | 'essayReview' | 'guidance'>('recommendation');
  const [nextActionDueDate, setNextActionDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [sessionType, setSessionType] = useState<'one-on-one' | 'group' | 'workshop' | ''>('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchCollaborators() {
      if (!isOpen) return;
      try {
        setLoading(true);
        const data = await apiGet<CollaboratorResponse[]>('/collaborators');
        setCollaborators(data || []);
      } catch {
        showError('Error', 'Failed to load collaborators');
      } finally {
        setLoading(false);
      }
    }
    fetchCollaborators();
  }, [isOpen, showError]);

  useEffect(() => {
    if (!isOpen) {
      setCollaboratorId(null);
      setCollaborationType('recommendation');
      setNextActionDueDate('');
      setNotes('');
      setSessionType('');
      setMeetingUrl('');
      setScheduledFor('');
      setPortalUrl('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!collaboratorId) {
      showError('Validation Error', 'Please select a collaborator');
      return;
    }
    if (collaborationType === 'recommendation' && !nextActionDueDate) {
      showError('Validation Error', 'Due date is required for recommendation collaborations');
      return;
    }

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        collaboratorId,
        applicationId,
        collaborationType,
        status: 'pending',
        awaitingActionFrom: 'student',
        awaitingActionType: 'send_invite',
        nextActionDescription: 'Send invitation to collaborator',
        notes: notes || undefined,
      };

      if (collaborationType === 'recommendation') {
        payload.nextActionDueDate = nextActionDueDate;
      } else if (nextActionDueDate) {
        payload.nextActionDueDate = nextActionDueDate;
      }

      if (collaborationType === 'guidance') {
        if (sessionType) payload.sessionType = sessionType;
        if (meetingUrl) payload.meetingUrl = meetingUrl;
        if (scheduledFor) payload.scheduledFor = new Date(scheduledFor).toISOString();
      }

      if (collaborationType === 'recommendation' && portalUrl) {
        payload.portalUrl = portalUrl;
      }

      await apiPost('/collaborations', payload);
      showSuccess('Success', 'Collaboration added successfully', 3000);
      onSuccess();
      onClose();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to add collaboration');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-semibold text-gray-900">Add Collaborator</h3>
          <div className="flex gap-2">
            <button
              className="btn-primary text-sm py-1 px-3"
              onClick={handleSubmit}
              disabled={saving || !collaboratorId || (collaborationType === 'recommendation' && !nextActionDueDate)}
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
            <button className="btn-outline text-sm py-1 px-3" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
        <div className="modal-body space-y-4">
          {collaborators.length === 0 && !loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              You don't have any saved collaborators yet. Add collaborators from the Collaborators page first.
            </div>
          )}

          <div>
            <label className="field-label">Collaborator <span className="text-red-500">*</span></label>
            <select
              className="field-select"
              value={collaboratorId || ''}
              onChange={(e) => setCollaboratorId(parseInt(e.target.value, 10))}
            >
              <option value="">Select collaborator</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.emailAddress}) - {c.relationship || 'No relationship'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Collaboration Type <span className="text-red-500">*</span></label>
            <select
              className="field-select"
              value={collaborationType}
              onChange={(e) => setCollaborationType(e.target.value as typeof collaborationType)}
            >
              <option value="recommendation">Recommendation Letter</option>
              <option value="essayReview">Essay Review</option>
              <option value="guidance">Guidance/Counseling</option>
            </select>
          </div>

          {collaborationType === 'recommendation' && (
            <div>
              <label className="field-label">Recommendation Portal URL</label>
              <input className="field-input" placeholder="https://..." value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} />
            </div>
          )}

          {collaborationType === 'guidance' && (
            <>
              <div>
                <label className="field-label">Session Type</label>
                <select
                  className="field-select"
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as typeof sessionType)}
                >
                  <option value="">Select session type</option>
                  <option value="one-on-one">One-on-One</option>
                  <option value="group">Group</option>
                  <option value="workshop">Workshop</option>
                </select>
              </div>
              <div>
                <label className="field-label">Meeting URL</label>
                <input className="field-input" placeholder="https://..." value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Scheduled For</label>
                <input type="datetime-local" className="field-input" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <label className="field-label">
              Due Date{collaborationType !== 'recommendation' ? ' (Optional)' : ' *'}
            </label>
            <input type="date" className="field-input" value={nextActionDueDate} onChange={(e) => setNextActionDueDate(e.target.value)} />
          </div>

          <div>
            <label className="field-label">Notes (Optional)</label>
            <textarea
              className="field-textarea"
              placeholder="Add any additional notes or instructions for the collaborator..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCollaborationModal;
