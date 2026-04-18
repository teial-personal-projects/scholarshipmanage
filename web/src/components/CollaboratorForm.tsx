import React, { useState, useEffect } from 'react';
import { apiPost, apiPatch } from '../services/api';
import type { CollaboratorResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

interface CollaboratorFormProps {
  isOpen: boolean;
  onClose: () => void;
  collaborator?: CollaboratorResponse | null;
  onSuccess?: () => void;
}

const CollaboratorForm: React.FC<CollaboratorFormProps> = ({
  isOpen,
  onClose,
  collaborator,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToastHelpers();
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const isEditMode = !!collaborator;

  useEffect(() => {
    if (isOpen) {
      if (collaborator) {
        setFirstName(collaborator.firstName || '');
        setLastName(collaborator.lastName || '');
        setEmailAddress(collaborator.emailAddress || '');
        setRelationship(collaborator.relationship || '');
        setPhoneNumber(collaborator.phoneNumber || '');
      } else {
        setFirstName(''); setLastName(''); setEmailAddress(''); setRelationship(''); setPhoneNumber('');
      }
    }
  }, [isOpen, collaborator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !emailAddress.trim()) {
      showError('Validation Error', 'First name, last name, and email are required', 3000);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      showError('Validation Error', 'Please enter a valid email address', 3000);
      return;
    }

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailAddress: emailAddress.trim(),
      relationship: relationship.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
    };

    try {
      setIsLoading(true);
      if (isEditMode && collaborator) {
        await apiPatch(`/collaborators/${collaborator.id}`, payload);
        showSuccess('Success', 'Collaborator updated successfully', 3000);
      } else {
        await apiPost('/collaborators', payload);
        showSuccess('Success', 'Collaborator created successfully', 3000);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to save collaborator');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <form id="collaborator-form" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3 className="font-semibold text-gray-900">{isEditMode ? 'Edit' : 'Add'} Collaborator</h3>
            <div className="flex gap-2">
              <button
                type="submit"
                form="collaborator-form"
                className="btn-primary text-sm py-1 px-3"
                disabled={isLoading}
              >
                {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Save')}
              </button>
              <button type="button" className="btn-outline text-sm py-1 px-3" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
            </div>
          </div>
          <div className="modal-body space-y-4">
            <div>
              <label className="field-label">First Name <span className="text-red-500">*</span></label>
              <input className="field-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter first name" />
            </div>
            <div>
              <label className="field-label">Last Name <span className="text-red-500">*</span></label>
              <input className="field-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter last name" />
            </div>
            <div>
              <label className="field-label">Email Address <span className="text-red-500">*</span></label>
              <input type="email" className="field-input" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="collaborator@example.com" />
            </div>
            <div>
              <label className="field-label">Relationship</label>
              <input className="field-input" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g., Teacher, Professor, Counselor, Mentor" />
            </div>
            <div>
              <label className="field-label">Phone Number</label>
              <input type="tel" className="field-input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 (555) 123-4567" />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollaboratorForm;
