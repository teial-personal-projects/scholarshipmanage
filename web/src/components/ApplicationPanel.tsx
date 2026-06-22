import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, Trash2, X } from 'lucide-react';

import {
  essayProgress,
  type ApplicationResponse,
  type CollaboratorResponse,
  type Essay,
  type EssayResponse,
  type EssayStatus,
  type RecommendationResponse,
  type TApplicationStatus,
  type TTargetType,
} from '@scholarshipmanage/shared';

import { ApplicationFormSections } from './ApplicationFormSections';
import type { ApplicationFormValues } from './ApplicationFormSections';

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
  onSaveSuccess?: () => void;
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

interface RecommendationDraft {
  localId: string;
  id?: number;
  recommenderId: number | '';
  status: 'Pending' | 'Submitted';
  dueDate: string;
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

function createRecommendationDraft(rec: RecommendationResponse): RecommendationDraft {
  return {
    localId: `rec-${rec.id}`,
    id: rec.id,
    recommenderId: rec.recommenderId,
    status: rec.status,
    dueDate: toDateInputValue(rec.dueDate),
    isDeleted: false,
  };
}

function createBlankRecommendationDraft(): RecommendationDraft {
  return {
    localId: `new-rec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    recommenderId: '',
    status: 'Pending',
    dueDate: '',
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
    renewable: draft.renewable,
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

export default function ApplicationPanel({ application, onClose, onSaveSuccess }: ApplicationPanelProps) {
  const { showSuccess, showError } = useToastHelpers();
  const initialDraft = useMemo(() => createDraft(application), [application]);
  const initialEssayDrafts = useMemo(() => createEssayDrafts(application), [application]);
  const [draft, setDraft] = useState<ApplicationDraft>(initialDraft);
  const [savedDraft, setSavedDraft] = useState<ApplicationDraft>(initialDraft);
  const [essayDrafts, setEssayDrafts] = useState<EssayDraft[]>(initialEssayDrafts);
  const [savedEssayDrafts, setSavedEssayDrafts] = useState<EssayDraft[]>(initialEssayDrafts);
  const [recommendationDrafts, setRecommendationDrafts] = useState<RecommendationDraft[]>([]);
  const [savedRecommendationDrafts, setSavedRecommendationDrafts] = useState<RecommendationDraft[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [isLoadingEssays, setIsLoadingEssays] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setDraft(initialDraft);
    setSavedDraft(initialDraft);
    setEssayDrafts(initialEssayDrafts);
    setSavedEssayDrafts(initialEssayDrafts);
    setRecommendationDrafts([]);
    setSavedRecommendationDrafts([]);
    setIsLoadingEssays(true);

    Promise.all([
      apiGet<EssayResponse[]>(`/applications/${application.id}/essays`),
      apiGet<RecommendationResponse[]>(`/applications/${application.id}/recommendations`),
      apiGet<CollaboratorResponse[]>('/collaborators'),
    ]).then(([essays, recommendations, collabs]) => {
      if (!isMounted) return;
      const nextEssayDrafts = (essays ?? []).map(createEssayDraft);
      setEssayDrafts(nextEssayDrafts);
      setSavedEssayDrafts(nextEssayDrafts);
      const nextRecDrafts = (recommendations ?? []).map(createRecommendationDraft);
      setRecommendationDrafts(nextRecDrafts);
      setSavedRecommendationDrafts(nextRecDrafts);
      setCollaborators(collabs ?? []);
    }).catch(() => {
      if (isMounted) setEssayDrafts(initialEssayDrafts);
    }).finally(() => {
      if (isMounted) setIsLoadingEssays(false);
    });

    return () => {
      isMounted = false;
    };
  }, [application.id, initialDraft, initialEssayDrafts]);

  const visibleEssayDrafts = essayDrafts.filter((essay) => !essay.isDeleted);
  const visibleRecommendationDrafts = recommendationDrafts.filter((rec) => !rec.isDeleted);
  const applicationIsDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const essaysAreDirty =
    JSON.stringify(getComparableEssayDrafts(essayDrafts)) !== JSON.stringify(getComparableEssayDrafts(savedEssayDrafts));
  const recommendationsAreDirty = JSON.stringify(recommendationDrafts) !== JSON.stringify(savedRecommendationDrafts);
  const isDirty = applicationIsDirty || essaysAreDirty || recommendationsAreDirty;

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

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
    setRecommendationDrafts(savedRecommendationDrafts);
  };

  const handleAddRecommendation = () => {
    setRecommendationDrafts((prev) => [...prev, createBlankRecommendationDraft()]);
  };

  const handleDeleteRecommendation = (localId: string) => {
    setRecommendationDrafts((prev) => prev.flatMap((rec) => {
      if (rec.localId !== localId) return [rec];
      return rec.id ? [{ ...rec, isDeleted: true }] : [];
    }));
  };

  const updateRecommendationDraft = <K extends keyof RecommendationDraft>(
    localId: string, key: K, value: RecommendationDraft[K],
  ) => {
    setRecommendationDrafts((prev) => prev.map((rec) => (
      rec.localId === localId ? { ...rec, [key]: value } : rec
    )));
  };

  const handleOpenEssay = (essayLink: string) => {
    if (!essayLink.trim()) return;
    window.open(essayLink.trim(), '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onClose();
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

    let shouldResetSaving = true;

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

      await Promise.all(recommendationDrafts.map(async (rec) => {
        if (rec.isDeleted) {
          if (rec.id) await apiDelete(`/recommendations/${rec.id}`);
          return;
        }
        if (!rec.recommenderId) return;
        if (!rec.id) {
          await apiPost<RecommendationResponse>('/recommendations', {
            applicationId: application.id,
            recommenderId: rec.recommenderId,
            status: rec.status,
            dueDate: rec.dueDate || undefined,
          });
          return;
        }
        const savedRec = savedRecommendationDrafts.find((r) => r.id === rec.id);
        if (JSON.stringify(rec) !== JSON.stringify(savedRec)) {
          await apiPatch<RecommendationResponse>(`/recommendations/${rec.id}`, {
            status: rec.status,
            dueDate: rec.dueDate || null,
          });
        }
      }));

      const [refreshedEssays, refreshedRecs] = await Promise.all([
        apiGet<EssayResponse[]>(`/applications/${application.id}/essays`),
        apiGet<RecommendationResponse[]>(`/applications/${application.id}/recommendations`),
      ]);
      const nextEssayDrafts = (refreshedEssays ?? []).map(createEssayDraft);
      const nextRecDrafts = (refreshedRecs ?? []).map(createRecommendationDraft);
      setSavedDraft(draft);
      setEssayDrafts(nextEssayDrafts);
      setSavedEssayDrafts(nextEssayDrafts);
      setRecommendationDrafts(nextRecDrafts);
      setSavedRecommendationDrafts(nextRecDrafts);
      showSuccess('Saved', 'Application updated successfully', 3000);
      shouldResetSaving = false;
      setIsSaving(false);
      onSaveSuccess?.();
    } catch (error) {
      showError('Save failed', error instanceof Error ? error.message : 'Failed to save application');
    } finally {
      if (shouldResetSaving) setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl h-full bg-white shadow-xl flex flex-col">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{draft.scholarshipName}</h2>
            <p className="text-xs text-gray-500 truncate">{draft.organization || 'No organization set'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <>
                <span className="hidden sm:inline text-xs font-semibold text-amber-700">Unsaved changes are present.</span>
                <button type="button" className="btn-outline text-sm py-1.5 px-3" onClick={handleDiscard} disabled={isSaving}>
                  Discard
                </button>
              </>
            )}
            <button type="button" className="btn-primary text-sm py-1.5 px-3" onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="p-2 rounded-md text-gray-500 hover:bg-gray-100" aria-label="Close panel" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex items-center gap-3 flex-wrap border-b border-gray-100 pb-3">
            <span className="text-sm font-semibold text-brand-800">{nextAction.label || 'No action needed'}</span>
            <span className="badge badge-gray">{urgencyLabel}</span>
            {essaysTotal > 0 && (
              <span className="flex items-center gap-2 text-xs text-gray-500 ml-auto">
                Essays <span>{essaysDone} / {essaysTotal}</span>
                <div className="w-20 h-1.5 rounded-full bg-gray-200">
                  <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${essayProgressPercent}%` }} />
                </div>
              </span>
            )}
          </div>

          <ApplicationFormSections
            values={draft as ApplicationFormValues}
            onChange={(updates) => setDraft((prev) => ({ ...prev, ...updates }))}
          />

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

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="section-heading">Recommendations</h3>
              <button
                type="button"
                className="btn-outline text-sm py-1.5 px-3 inline-flex items-center gap-1.5"
                onClick={handleAddRecommendation}
                disabled={collaborators.length === 0}
              >
                <Plus size={15} />
                Add Recommender
              </button>
            </div>

            {collaborators.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                No collaborators added yet. Add a collaborator first, then assign them as a recommender.
              </div>
            ) : visibleRecommendationDrafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                No recommenders added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleRecommendationDrafts.map((rec, index) => {
                  const takenIds = new Set(
                    visibleRecommendationDrafts
                      .filter((r) => r.localId !== rec.localId && r.recommenderId !== '')
                      .map((r) => r.recommenderId),
                  );
                  const availableCollaborators = collaborators.filter((c) => !takenIds.has(c.id));
                  const assignedCollaborator = collaborators.find((c) => c.id === rec.recommenderId);
                  const recommenderInputId = `${rec.localId}-recommender`;
                  const statusInputId = `${rec.localId}-status`;
                  const dueDateInputId = `${rec.localId}-due-date`;

                  return (
                    <div key={rec.localId} className="rounded-lg border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">Recommender {index + 1}</p>
                        <button
                          type="button"
                          className="p-2 rounded-md text-red-600 hover:bg-red-50"
                          aria-label={`Delete recommender ${index + 1}`}
                          onClick={() => handleDeleteRecommendation(rec.localId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label htmlFor={rec.id ? undefined : recommenderInputId} className="field-label">Recommender</label>
                          {rec.id ? (
                            <p className="text-sm text-gray-800 py-1.5">
                              {assignedCollaborator
                                ? `${assignedCollaborator.firstName} ${assignedCollaborator.lastName}`
                                : `Collaborator #${rec.recommenderId}`}
                            </p>
                          ) : (
                            <select
                              id={recommenderInputId}
                              className="field-select"
                              value={rec.recommenderId}
                              onChange={(e) => updateRecommendationDraft(rec.localId, 'recommenderId', Number(e.target.value) || '')}
                            >
                              <option value="">Select recommender…</option>
                              {availableCollaborators.map((c) => (
                                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label htmlFor={statusInputId} className="field-label">Status</label>
                          <select
                            id={statusInputId}
                            className="field-select"
                            value={rec.status}
                            onChange={(e) => updateRecommendationDraft(rec.localId, 'status', e.target.value as 'Pending' | 'Submitted')}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Submitted">Submitted</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={dueDateInputId} className="field-label">Due Date</label>
                          <input
                            id={dueDateInputId}
                            type="date"
                            className="field-input"
                            value={rec.dueDate}
                            onChange={(e) => updateRecommendationDraft(rec.localId, 'dueDate', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
