import React, { useState, useEffect } from 'react';
import { apiPost } from '../services/api';
import { useToastHelpers } from '../utils/toast';
import { useCollaborators } from '../hooks/useCollaborators';

interface AssignCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  onSuccess?: () => void;
}

const AssignCollaboratorModal: React.FC<AssignCollaboratorModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToastHelpers();
  const { collaborators, loading: loadingCollaborators, fetchCollaborators } = useCollaborators();
  const [isLoading, setIsLoading] = useState(false);
  const [collaboratorId, setCollaboratorId] = useState('');
  const [collaborationType, setCollaborationType] = useState<'recommendation' | 'essayReview' | 'guidance'>('recommendation');
  const [notes, setNotes] = useState('');
  const [nextActionDueDate, setNextActionDueDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
      setCollaboratorId('');
      setCollaborationType('recommendation');
      setNotes('');
      setNextActionDueDate('');
    }
  }, [isOpen, fetchCollaborators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorId) {
      showError('Validation Error', 'Please select a collaborator', 3000);
      return;
    }
    if (!collaborationType) {
      showError('Validation Error', 'Please select a collaboration type', 3000);
      return;
    }

    const payload: Record<string, unknown> = {
      collaboratorId: parseInt(collaboratorId),
      applicationId,
      collaborationType,
      status: 'pending',
      awaitingActionFrom: 'student',
      awaitingActionType: 'send_invitation',
    };
    if (notes.trim()) payload.notes = notes.trim();
    if (nextActionDueDate) payload.nextActionDueDate = nextActionDueDate;

    try {
      setIsLoading(true);
      await apiPost('/collaborations', payload);
      showSuccess('Success', 'Collaborator assigned successfully', 3000);
      onSuccess?.();
      onClose();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to assign collaborator');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <form id="assign-collaborator-form" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3 className="font-semibold text-gray-900">Assign Collaborator</h3>
            <div className="flex gap-2">
              <button
                type="submit"
                form="assign-collaborator-form"
                className="btn-primary text-sm py-1 px-3"
                disabled={isLoading || collaborators.length === 0}
              >
                {isLoading ? 'Assigning...' : 'Assign'}
              </button>
              <button type="button" className="btn-outline text-sm py-1 px-3" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
            </div>
          </div>
          <div className="modal-body space-y-4">
            <div>
              <label className="field-label">Select Collaborator <span className="text-red-500">*</span></label>
              <select
                className="field-select"
                value={collaboratorId}
                onChange={(e) => setCollaboratorId(e.target.value)}
              >
                <option value="">Choose a collaborator</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.emailAddress})
                  </option>
                ))}
              </select>
              {collaborators.length === 0 && !loadingCollaborators && (
                <p className="text-sm text-gray-500 mt-1">No collaborators found. Please add a collaborator first.</p>
              )}
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

            <div>
              <label className="field-label">Due Date</label>
              <input
                type="date"
                className="field-input"
                value={nextActionDueDate}
                onChange={(e) => setNextActionDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="field-label">Notes</label>
              <textarea
                className="field-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or instructions for the collaborator..."
                rows={4}
              />
            </div>

            <p className="text-sm text-gray-600">
              After assigning, you can send an invitation email to the collaborator from the application details page.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignCollaboratorModal;
