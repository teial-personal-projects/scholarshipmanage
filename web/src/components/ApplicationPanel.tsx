import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import {
  APPLICATION_STATUSES,
  TARGET_TYPES,
  essayProgress,
  type ApplicationResponse,
  type Essay,
  type TApplicationStatus,
  type TTargetType,
} from '@scholarshipmanage/shared';

import { apiPatch } from '../services/api';
import { getDeadlineBadgeLabel } from '../utils/deadline';
import { deriveNextAction } from '../utils/deriveNextAction';
import { useToastHelpers } from '../utils/toast';

type ApplicationPanelApplication = ApplicationResponse & {
  essays?: readonly Pick<Essay, 'status'>[] | null;
};

interface ApplicationPanelProps {
  application: ApplicationPanelApplication;
  onClose: () => void;
}

interface ApplicationDraft {
  scholarshipName: string;
  organization: string;
  orgWebsite: string;
  platform: string;
  applicationLink: string;
  theme: string;
  targetType: TTargetType | '';
  status: TApplicationStatus;
  currentAction: string;
  minAward: string;
  maxAward: string;
  openDate: string;
  dueDate: string;
  submissionDate: string;
  requirements: string;
  renewable: boolean;
  renewableTerms: string;
}

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.split('T')[0] ?? '' : '';
}

function createDraft(application: ApplicationPanelApplication): ApplicationDraft {
  return {
    scholarshipName: application.scholarshipName,
    organization: application.organization ?? '',
    orgWebsite: application.orgWebsite ?? '',
    platform: application.platform ?? '',
    applicationLink: application.applicationLink ?? '',
    theme: application.theme ?? '',
    targetType: application.targetType ?? '',
    status: application.status,
    currentAction: application.currentAction ?? '',
    minAward: application.minAward?.toString() ?? '',
    maxAward: application.maxAward?.toString() ?? '',
    openDate: toDateInputValue(application.openDate),
    dueDate: toDateInputValue(application.dueDate),
    submissionDate: toDateInputValue(application.submissionDate),
    requirements: application.requirements ?? '',
    renewable: Boolean(application.renewable),
    renewableTerms: application.renewableTerms ?? '',
  };
}

function toOptionalNumber(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;
  const parsedValue = Number(trimmedValue);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function toPayload(draft: ApplicationDraft) {
  return {
    scholarshipName: draft.scholarshipName.trim(),
    organization: draft.organization.trim() || null,
    orgWebsite: draft.orgWebsite.trim() || null,
    platform: draft.platform.trim() || null,
    applicationLink: draft.applicationLink.trim() || null,
    theme: draft.theme.trim() || null,
    targetType: draft.targetType || null,
    status: draft.status,
    currentAction: draft.currentAction.trim() || null,
    minAward: toOptionalNumber(draft.minAward),
    maxAward: toOptionalNumber(draft.maxAward),
    openDate: draft.openDate || null,
    dueDate: draft.dueDate,
    submissionDate: draft.submissionDate || null,
    requirements: draft.requirements.trim() || null,
    renewable: draft.renewable || null,
    renewableTerms: draft.renewable ? draft.renewableTerms.trim() || null : null,
  };
}

export default function ApplicationPanel({ application, onClose }: ApplicationPanelProps) {
  const { showSuccess, showError } = useToastHelpers();
  const initialDraft = useMemo(() => createDraft(application), [application]);
  const [draft, setDraft] = useState<ApplicationDraft>(initialDraft);
  const [savedDraft, setSavedDraft] = useState<ApplicationDraft>(initialDraft);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(initialDraft);
    setSavedDraft(initialDraft);
  }, [initialDraft]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const nextAction = deriveNextAction({ ...application, status: draft.status, currentAction: draft.currentAction });
  const urgencyLabel = getDeadlineBadgeLabel(draft.dueDate, draft.status) ?? 'No deadline';
  const { done: essaysDone, total: essaysTotal } = essayProgress(application);
  const essayProgressPercent = essaysTotal === 0 ? 0 : (essaysDone / essaysTotal) * 100;

  const updateDraft = <Key extends keyof ApplicationDraft>(key: Key, value: ApplicationDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleDiscard = () => {
    setDraft(savedDraft);
  };

  const handleSave = async () => {
    if (!draft.scholarshipName.trim()) {
      showError('Validation Error', 'Scholarship name is required', 3000);
      return;
    }

    if (!draft.dueDate) {
      showError('Validation Error', 'Due date is required', 3000);
      return;
    }

    try {
      setIsSaving(true);
      await apiPatch<ApplicationResponse>(`/applications/${application.id}`, toPayload(draft));
      setSavedDraft(draft);
      showSuccess('Saved', 'Application updated successfully', 3000);
    } catch (error) {
      showError('Save failed', error instanceof Error ? error.message : 'Failed to save application');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl h-full bg-white shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{draft.scholarshipName}</h2>
            <p className="text-sm text-gray-600 truncate">{draft.organization || 'No organization set'}</p>
          </div>
          <button
            type="button"
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Close panel"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section className="rounded-lg border border-gray-200 bg-[#F2F4EC] p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Next action</p>
                <p className="text-base font-bold text-brand-800 mt-1">{nextAction.label || 'No action needed'}</p>
              </div>
              <span className="badge badge-gray self-start">{urgencyLabel}</span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Essay progress</span>
                <span>{essaysDone} / {essaysTotal}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-brand-500"
                  style={{ width: `${essayProgressPercent}%` }}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="field-label">Scholarship Name</span>
                <input className="field-input" value={draft.scholarshipName} onChange={(event) => updateDraft('scholarshipName', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Organization</span>
                <input className="field-input" value={draft.organization} onChange={(event) => updateDraft('organization', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Status</span>
                <select className="field-select" value={draft.status} onChange={(event) => updateDraft('status', event.target.value as TApplicationStatus)}>
                  {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Due Date</span>
                <input type="date" className="field-input" value={draft.dueDate} onChange={(event) => updateDraft('dueDate', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Current Action</span>
                <input className="field-input" value={draft.currentAction} onChange={(event) => updateDraft('currentAction', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Target Type</span>
                <select className="field-select" value={draft.targetType} onChange={(event) => updateDraft('targetType', event.target.value as TTargetType | '')}>
                  <option value="">Select type</option>
                  {TARGET_TYPES.map((targetType) => <option key={targetType} value={targetType}>{targetType}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Min Award</span>
                <input type="number" min={0} className="field-input" value={draft.minAward} onChange={(event) => updateDraft('minAward', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Max Award</span>
                <input type="number" min={0} className="field-input" value={draft.maxAward} onChange={(event) => updateDraft('maxAward', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Open Date</span>
                <input type="date" className="field-input" value={draft.openDate} onChange={(event) => updateDraft('openDate', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Submission Date</span>
                <input type="date" className="field-input" value={draft.submissionDate} onChange={(event) => updateDraft('submissionDate', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Platform</span>
                <input className="field-input" value={draft.platform} onChange={(event) => updateDraft('platform', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Theme/Focus</span>
                <input className="field-input" value={draft.theme} onChange={(event) => updateDraft('theme', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Organization Website</span>
                <input type="url" className="field-input" value={draft.orgWebsite} onChange={(event) => updateDraft('orgWebsite', event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Application Link</span>
                <input type="url" className="field-input" value={draft.applicationLink} onChange={(event) => updateDraft('applicationLink', event.target.value)} />
              </label>
            </div>

            <label className="block">
              <span className="field-label">Requirements</span>
              <textarea className="field-textarea" value={draft.requirements} onChange={(event) => updateDraft('requirements', event.target.value)} rows={3} />
            </label>

            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-brand-500"
                  checked={draft.renewable}
                  onChange={(event) => updateDraft('renewable', event.target.checked)}
                />
                <span className="text-sm font-semibold text-gray-800">Renewable Scholarship</span>
              </label>
              {draft.renewable && (
                <label className="block">
                  <span className="field-label">Renewal Terms</span>
                  <input className="field-input" value={draft.renewableTerms} onChange={(event) => updateDraft('renewableTerms', event.target.value)} />
                </label>
              )}
            </div>
          </section>
        </div>

        {isDirty && (
          <div className="sticky bottom-0 border-t border-amber-200 bg-amber-50 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-semibold text-amber-800">Unsaved changes are present.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-outline" onClick={handleDiscard} disabled={isSaving}>
                Discard
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
