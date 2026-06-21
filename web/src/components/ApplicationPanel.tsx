import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, Trash2, X } from 'lucide-react';

import {
  APPLICATION_STATUSES,
  TARGET_TYPES,
  essayProgress,
  type ApplicationResponse,
  type Essay,
  type EssayResponse,
  type EssayStatus,
  type TApplicationStatus,
  type TTargetType,
} from '@scholarshipmanage/shared';

import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';
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

interface EssayDraft {
  localId: string;
  id?: number;
  theme: string;
  status: EssayStatus;
  wordCount: string;
  essayLink: string;
  isDeleted: boolean;
}

const ESSAY_STATUS_OPTIONS: { value: EssayStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

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

function createEssayDraft(essay: EssayResponse, index: number): EssayDraft {
  return {
    localId: `essay-${essay.id}-${index}`,
    id: essay.id,
    theme: essay.theme ?? '',
    status: essay.status ?? 'not_started',
    wordCount: essay.wordCount?.toString() ?? '',
    essayLink: essay.essayLink ?? '',
    isDeleted: false,
  };
}

function createFallbackEssayDraft(essay: Pick<Essay, 'status'>, index: number): EssayDraft {
  return {
    localId: `fallback-essay-${index}`,
    theme: '',
    status: essay.status ?? 'not_started',
    wordCount: '',
    essayLink: '',
    isDeleted: false,
  };
}

function createEssayDrafts(application: ApplicationPanelApplication): EssayDraft[] {
  return (application.essays ?? []).map(createFallbackEssayDraft);
}

function createBlankEssayDraft(): EssayDraft {
  return {
    localId: `new-essay-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    theme: '',
    status: 'not_started',
    wordCount: '',
    essayLink: '',
    isDeleted: false,
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

function toEssayPayload(draft: EssayDraft) {
  const wordCount = toOptionalNumber(draft.wordCount);

  return {
    theme: draft.theme.trim() || undefined,
    status: draft.status,
    wordCount: wordCount && wordCount > 0 ? wordCount : undefined,
    essayLink: draft.essayLink.trim() || undefined,
  };
}

function getComparableEssayDrafts(drafts: EssayDraft[]): EssayDraft[] {
  return drafts.map((draft) => ({
    ...draft,
    localId: draft.id ? `essay-${draft.id}` : draft.localId,
  }));
}

export default function ApplicationPanel({ application, onClose }: ApplicationPanelProps) {
  const { showSuccess, showError } = useToastHelpers();
  const initialDraft = useMemo(() => createDraft(application), [application]);
  const initialEssayDrafts = useMemo(() => createEssayDrafts(application), [application]);
  const [draft, setDraft] = useState<ApplicationDraft>(initialDraft);
  const [savedDraft, setSavedDraft] = useState<ApplicationDraft>(initialDraft);
  const [essayDrafts, setEssayDrafts] = useState<EssayDraft[]>(initialEssayDrafts);
  const [savedEssayDrafts, setSavedEssayDrafts] = useState<EssayDraft[]>(initialEssayDrafts);
  const [isLoadingEssays, setIsLoadingEssays] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setDraft(initialDraft);
    setSavedDraft(initialDraft);
    setEssayDrafts(initialEssayDrafts);
    setSavedEssayDrafts(initialEssayDrafts);
    setIsLoadingEssays(true);

    apiGet<EssayResponse[]>(`/applications/${application.id}/essays`)
      .then((essays) => {
        if (!isMounted) return;
        const nextEssayDrafts = (essays ?? []).map(createEssayDraft);
        setEssayDrafts(nextEssayDrafts);
        setSavedEssayDrafts(nextEssayDrafts);
      })
      .catch(() => {
        if (isMounted) setEssayDrafts(initialEssayDrafts);
      })
      .finally(() => {
        if (isMounted) setIsLoadingEssays(false);
      });

    return () => {
      isMounted = false;
    };
  }, [application.id, initialDraft, initialEssayDrafts]);

  const visibleEssayDrafts = essayDrafts.filter((essay) => !essay.isDeleted);
  const applicationIsDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const essaysAreDirty =
    JSON.stringify(getComparableEssayDrafts(essayDrafts)) !== JSON.stringify(getComparableEssayDrafts(savedEssayDrafts));
  const isDirty = applicationIsDirty || essaysAreDirty;
  const summaryApplication = {
    ...application,
    status: draft.status,
    currentAction: draft.currentAction,
    essays: visibleEssayDrafts.map((essay) => ({ status: essay.status })),
  };
  const nextAction = deriveNextAction(summaryApplication);
  const urgencyLabel = getDeadlineBadgeLabel(draft.dueDate, draft.status) ?? 'No deadline';
  const { done: essaysDone, total: essaysTotal } = essayProgress(summaryApplication);
  const essayProgressPercent = essaysTotal === 0 ? 0 : (essaysDone / essaysTotal) * 100;

  const updateDraft = <Key extends keyof ApplicationDraft>(key: Key, value: ApplicationDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateEssayDraft = <Key extends keyof EssayDraft>(
    localId: string,
    key: Key,
    value: EssayDraft[Key],
  ) => {
    setEssayDrafts((current) => current.map((essay) => (
      essay.localId === localId ? { ...essay, [key]: value } : essay
    )));
  };

  const handleAddEssay = () => {
    setEssayDrafts((current) => [...current, createBlankEssayDraft()]);
  };

  const handleDeleteEssay = (localId: string) => {
    setEssayDrafts((current) => current.flatMap((essay) => {
      if (essay.localId !== localId) return [essay];
      return essay.id ? [{ ...essay, isDeleted: true }] : [];
    }));
  };

  const handleDiscard = () => {
    setDraft(savedDraft);
    setEssayDrafts(savedEssayDrafts);
  };

  const handleOpenEssay = (essayLink: string) => {
    if (!essayLink.trim()) return;
    window.open(essayLink.trim(), '_blank', 'noopener,noreferrer');
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

      if (applicationIsDirty) {
        await apiPatch<ApplicationResponse>(`/applications/${application.id}`, toPayload(draft));
      }

      const savedById = new Map(savedEssayDrafts.filter((essay) => essay.id).map((essay) => [essay.id, essay]));
      const savedIds = new Set(savedEssayDrafts.map((essay) => essay.id).filter((id): id is number => Boolean(id)));

      await Promise.all(essayDrafts.map(async (essay) => {
        if (essay.isDeleted) {
          if (essay.id) await apiDelete(`/essays/${essay.id}`);
          return;
        }

        if (!essay.id) {
          await apiPost<EssayResponse>(`/applications/${application.id}/essays`, toEssayPayload(essay));
          return;
        }

        const savedEssay = savedById.get(essay.id);
        if (JSON.stringify(essay) !== JSON.stringify(savedEssay)) {
          await apiPatch<EssayResponse>(`/essays/${essay.id}`, toEssayPayload(essay));
        }
      }));

      await Promise.all([...savedIds].map(async (essayId) => {
        if (!essayDrafts.some((essay) => essay.id === essayId)) {
          await apiDelete(`/essays/${essayId}`);
        }
      }));

      const refreshedEssays = await apiGet<EssayResponse[]>(`/applications/${application.id}/essays`);
      const nextEssayDrafts = (refreshedEssays ?? []).map(createEssayDraft);
      setSavedDraft(draft);
      setEssayDrafts(nextEssayDrafts);
      setSavedEssayDrafts(nextEssayDrafts);
      showSuccess('Saved', 'Application updated successfully', 3000);
    } catch (error) {
      showError('Save failed', error instanceof Error ? error.message : 'Failed to save application');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl h-full bg-white shadow-xl flex flex-col">
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

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="section-heading">Essays</h3>
                {isLoadingEssays && <p className="text-xs text-gray-500 mt-1">Loading essays...</p>}
              </div>
              <button type="button" className="btn-outline text-sm py-1.5 px-3" onClick={handleAddEssay}>
                <Plus size={15} />
                Add Essay
              </button>
            </div>

            {visibleEssayDrafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                No essays added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleEssayDrafts.map((essay, index) => (
                  <div key={essay.localId} className="rounded-lg border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-gray-900">Essay {index + 1}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-outline text-xs py-1 px-2"
                          disabled={!essay.essayLink.trim()}
                          onClick={() => handleOpenEssay(essay.essayLink)}
                        >
                          <ExternalLink size={14} />
                          Open
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-md text-red-600 hover:bg-red-50"
                          aria-label={`Delete essay ${index + 1}`}
                          onClick={() => handleDeleteEssay(essay.localId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <label className="block md:col-span-2">
                        <span className="field-label">Theme / Prompt</span>
                        <input
                          className="field-input"
                          value={essay.theme}
                          onChange={(event) => updateEssayDraft(essay.localId, 'theme', event.target.value)}
                          placeholder="Essay prompt or topic"
                        />
                      </label>
                      <label className="block">
                        <span className="field-label">Status</span>
                        <select
                          className="field-select"
                          value={essay.status}
                          onChange={(event) => updateEssayDraft(
                            essay.localId,
                            'status',
                            event.target.value as EssayStatus,
                          )}
                        >
                          {ESSAY_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="field-label">Word Count</span>
                        <input
                          type="number"
                          min={0}
                          className="field-input"
                          value={essay.wordCount}
                          onChange={(event) => updateEssayDraft(essay.localId, 'wordCount', event.target.value)}
                        />
                      </label>
                      <label className="block md:col-span-4">
                        <span className="field-label">Google Doc Link</span>
                        <input
                          type="url"
                          className="field-input"
                          value={essay.essayLink}
                          onChange={(event) => updateEssayDraft(essay.localId, 'essayLink', event.target.value)}
                          placeholder="https://docs.google.com/document/..."
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
