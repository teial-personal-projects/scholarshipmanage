import { useState, useEffect } from 'react';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';
import { useUpdateCollaboration } from '../hooks/useCollaborations';

interface EditCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboration: CollaborationResponse | null;
  onSuccess?: () => void;
}

function EditCollaborationModal({
  isOpen,
  onClose,
  collaboration,
  onSuccess,
}: EditCollaborationModalProps) {
  const { showSuccess, showError } = useToastHelpers();
  const updateCollaboration = useUpdateCollaboration();

  const [status, setStatus] = useState('');
  const [nextActionDueDate, setNextActionDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [portalUrl, setPortalUrl] = useState('');

  useEffect(() => {
    if (collaboration && isOpen) {
      setStatus(collaboration.status);
      setNextActionDueDate(collaboration.nextActionDueDate ? collaboration.nextActionDueDate.split('T')[0] : '');
      setNotes(collaboration.notes || '');
      setPortalUrl(collaboration.portalUrl || '');
    }
  }, [collaboration, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStatus('');
      setNextActionDueDate('');
      setNotes('');
      setPortalUrl('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!collaboration) return;
    if (collaboration.collaborationType === 'recommendation' && !nextActionDueDate) {
      showError('Validation Error', 'Due date is required for recommendation collaborations');
      return;
    }

    const payload: Record<string, unknown> = {};
    if (status !== collaboration.status) {
      payload.status = status;
      if (status === 'completed') payload.awaitingActionFrom = null;
    }
    if (collaboration.collaborationType === 'recommendation') {
      payload.nextActionDueDate = nextActionDueDate;
    } else if (nextActionDueDate) {
      payload.nextActionDueDate = nextActionDueDate;
    }
    if (notes !== (collaboration.notes || '')) {
      payload.notes = notes.trim() ? notes : null;
    }
    if (collaboration.collaborationType === 'recommendation' && portalUrl !== (collaboration.portalUrl || '')) {
      payload.portalUrl = portalUrl || undefined;
    }

    updateCollaboration.mutate(
      { id: collaboration.id, data: payload },
      {
        onSuccess: () => {
          showSuccess('Success', 'Collaboration updated successfully', 3000);
          onSuccess?.();
          onClose();
        },
        onError: (err) => {
          showError('Error', err instanceof Error ? err.message : 'Failed to update collaboration');
        },
      }
    );
  };

  if (!collaboration || !isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-semibold text-gray-900">Edit Collaboration</h3>
          <div className="flex gap-2">
            <button
              className="btn-primary text-sm py-1 px-3"
              onClick={handleSubmit}
              disabled={updateCollaboration.isPending || (collaboration.collaborationType === 'recommendation' && !nextActionDueDate)}
            >
              {updateCollaboration.isPending ? 'Saving...' : 'Save'}
            </button>
            <button className="btn-outline text-sm py-1 px-3" onClick={onClose} disabled={updateCollaboration.isPending}>
              Cancel
            </button>
          </div>
        </div>
        <div className="modal-body space-y-4">
          <div>
            <label className="field-label">Collaboration Type</label>
            <input className="field-input bg-gray-50" value={collaboration.collaborationType} disabled readOnly />
          </div>

          <div>
            <label className="field-label">Status</label>
            <select className="field-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="invited">Invited</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          {collaboration.collaborationType === 'recommendation' && (
            <div>
              <label className="field-label">Recommendation Portal URL</label>
              <input className="field-input" placeholder="https://..." value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} />
            </div>
          )}

          <div>
            <label className="field-label">
              Due Date{collaboration.collaborationType !== 'recommendation' ? ' (Optional)' : ' *'}
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

export default EditCollaborationModal;
