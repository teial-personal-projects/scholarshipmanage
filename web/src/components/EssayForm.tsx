import { useState, useEffect } from 'react';
import { apiPost, apiPatch } from '../services/api';
import type { EssayResponse } from '@scholarshipmanage/shared';
import { useToastHelpers } from '../utils/toast';

interface EssayFormProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  essay?: EssayResponse | null;
  onSuccess: () => void;
}

function EssayForm({ isOpen, onClose, applicationId, essay, onSuccess }: EssayFormProps) {
  const { showSuccess, showError } = useToastHelpers();
  const isEditMode = !!essay;
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState('');
  const [wordCount, setWordCount] = useState('');
  const [essayLink, setEssayLink] = useState('');
  const [status, setStatus] = useState('not_started');

  useEffect(() => {
    if (essay) {
      setTheme(essay.theme || '');
      setWordCount(essay.wordCount?.toString() || '');
      setEssayLink(essay.essayLink || '');
      setStatus(essay.status || 'not_started');
    } else {
      setTheme('');
      setWordCount('');
      setEssayLink('');
      setStatus('not_started');
    }
  }, [essay, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const parsedWordCount = wordCount ? parseInt(wordCount, 10) : null;
      const payload = {
        theme: theme.trim() || null,
        wordCount: parsedWordCount && !isNaN(parsedWordCount) ? parsedWordCount : null,
        essayLink: essayLink.trim() || null,
        status,
      };
      if (isEditMode && essay) {
        await apiPatch(`/essays/${essay.id}`, payload);
        showSuccess('Success', 'Essay updated successfully', 3000);
      } else {
        await apiPost(`/applications/${applicationId}/essays`, payload);
        showSuccess('Success', 'Essay created successfully', 3000);
      }
      onSuccess();
      onClose();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to save essay');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => { if (!submitting) onClose(); };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <form id="essay-form" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3 className="font-semibold text-gray-900">{isEditMode ? 'Edit Essay' : 'Add Essay'}</h3>
            <div className="flex gap-2">
              <button
                type="submit"
                form="essay-form"
                className="btn-primary text-sm py-1 px-3"
                disabled={submitting}
              >
                {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Save')}
              </button>
              <button type="button" className="btn-outline text-sm py-1 px-3" onClick={handleClose} disabled={submitting}>
                Cancel
              </button>
            </div>
          </div>
          <div className="modal-body space-y-4">
            <div>
              <label className="field-label">Theme/Topic</label>
              <input
                className="field-input"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., Leadership Experience, Community Service"
              />
              <p className="text-xs text-gray-500 mt-1">What is this essay about?</p>
            </div>

            <div>
              <label className="field-label">Word Count</label>
              <input
                type="number"
                className="field-input"
                value={wordCount}
                onChange={(e) => setWordCount(e.target.value)}
                placeholder="e.g., 500"
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">Target or maximum word count</p>
            </div>

            <div>
              <label className="field-label">Essay Link</label>
              <input
                type="url"
                className="field-input"
                value={essayLink}
                onChange={(e) => setEssayLink(e.target.value)}
                placeholder="https://docs.google.com/document/..."
              />
              <p className="text-xs text-gray-500 mt-1">Link to Google Docs or other online document</p>
            </div>

            <div>
              <label className="field-label">Status</label>
              <select className="field-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Current status of this essay</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EssayForm;
