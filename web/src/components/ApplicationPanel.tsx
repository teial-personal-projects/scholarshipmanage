import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import {
  essayProgress,
  type ApplicationResponse,
  type CollaborationResponse,
  type CollaborationStatus,
  type CollaboratorResponse,
  type Essay,
  type EssayResponse,
  type TApplicationStatus,
  type TTargetType,
} from '@scholarshipmanage/shared';

import { ApplicationFormSections } from './ApplicationFormSections';
import type { ApplicationFormValues } from './ApplicationFormSections';
import ApplicationWorkItemsSection from './ApplicationWorkItemsSection';
import {
  createBlankEssayDraft,
  createBlankRecommendationDraft,
  getComparableEssayDrafts,
  toEssayPayload,
  toOptionalNumber,
  type EssayDraft,
  type RecommendationDraft,
} from './ApplicationWorkItemsDrafts';

import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';
import { getDeadlineBadgeLabel } from '../utils/deadline';
import { deriveNextAction } from '../utils/deriveNextAction';
import { moveApplicationStatusToInProgress } from '../utils/applicationStatus';
import { useToastHelpers } from '../utils/toast';

const DRAFT_STORAGE_VERSION = 1;
const DRAFT_STORAGE_PREFIX = 'scholarshipmanage:application-panel-draft';

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
  minAward: string;
  recommendationCount: string;
  maxAward: string;
  openDate: string;
  dueDate: string;
  submissionDate: string;
  requirements: string;
  renewable: boolean;
  renewableTerms: string;
}

interface StoredApplicationPanelDraft {
  version: typeof DRAFT_STORAGE_VERSION;
  applicationId: number;
  draft: ApplicationDraft;
  essayDrafts: EssayDraft[];
  recommendationDrafts: RecommendationDraft[];
  savedAt: string;
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
    minAward: application.minAward?.toString() ?? '',
    recommendationCount: application.recommendationCount?.toString() ?? '0',
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

function createRecommendationDraft(rec: CollaborationResponse): RecommendationDraft {
  return {
    localId: `rec-${rec.id}`,
    id: rec.id,
    recommenderId: rec.collaboratorId,
    status: rec.status as CollaborationStatus,
    dueDate: toDateInputValue(rec.nextActionDueDate),
    isDeleted: false,
  };
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
    minAward: toOptionalNumber(draft.minAward),
    recommendationCount: toRecommendationCount(draft.recommendationCount),
    maxAward: toOptionalNumber(draft.maxAward),
    openDate: draft.openDate || null,
    dueDate: draft.dueDate,
    submissionDate: draft.submissionDate || null,
    requirements: draft.requirements.trim() || null,
    renewable: draft.renewable,
    renewableTerms: draft.renewable ? draft.renewableTerms.trim() || null : null,
  };
}

function toRecommendationCount(value: string): number {
  const trimmedValue = value.trim();
  if (!trimmedValue) return 0;
  const parsedValue = Number(trimmedValue);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}

function getDraftStorageKey(applicationId: number): string {
  return `${DRAFT_STORAGE_PREFIX}:${applicationId}`;
}

function readStoredDraft(applicationId: number): StoredApplicationPanelDraft | null {
  try {
    const item = window.localStorage.getItem(getDraftStorageKey(applicationId));
    if (!item) return null;

    const parsed = JSON.parse(item) as Partial<StoredApplicationPanelDraft>;
    if (
      parsed.version !== DRAFT_STORAGE_VERSION ||
      parsed.applicationId !== applicationId ||
      !parsed.draft ||
      !Array.isArray(parsed.essayDrafts) ||
      !Array.isArray(parsed.recommendationDrafts)
    ) {
      return null;
    }

    return parsed as StoredApplicationPanelDraft;
  } catch {
    return null;
  }
}

function writeStoredDraft(
  applicationId: number,
  draft: ApplicationDraft,
  essayDrafts: EssayDraft[],
  recommendationDrafts: RecommendationDraft[],
): void {
  try {
    const payload: StoredApplicationPanelDraft = {
      version: DRAFT_STORAGE_VERSION,
      applicationId,
      draft,
      essayDrafts,
      recommendationDrafts,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(getDraftStorageKey(applicationId), JSON.stringify(payload));
  } catch {
    // Browser storage can be unavailable or full; the in-memory dirty guard still protects active edits.
  }
}

function clearStoredDraft(applicationId: number): void {
  try {
    window.localStorage.removeItem(getDraftStorageKey(applicationId));
  } catch {
    // Nothing actionable for the user if clearing local draft storage fails.
  }
}

export default function ApplicationPanel({ application, onClose, onSaveSuccess }: ApplicationPanelProps) {
  const { showSuccess, showError } = useToastHelpers();
  const initialDraft = useMemo(() => createDraft(application), [application]);
  const initialEssayDrafts = useMemo(() => createEssayDrafts(application), [application]);
  const initialStoredDraft = useMemo(() => readStoredDraft(application.id), [application.id]);
  const [draft, setDraft] = useState<ApplicationDraft>({ ...initialDraft, ...initialStoredDraft?.draft });
  const [savedDraft, setSavedDraft] = useState<ApplicationDraft>(initialDraft);
  const [essayDrafts, setEssayDrafts] = useState<EssayDraft[]>(initialStoredDraft?.essayDrafts ?? initialEssayDrafts);
  const [savedEssayDrafts, setSavedEssayDrafts] = useState<EssayDraft[]>(initialEssayDrafts);
  const [recommendationDrafts, setRecommendationDrafts] = useState<RecommendationDraft[]>(
    initialStoredDraft?.recommendationDrafts ?? [],
  );
  const [savedRecommendationDrafts, setSavedRecommendationDrafts] = useState<RecommendationDraft[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [isLoadingEssays, setIsLoadingEssays] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [workItemsOpen, setWorkItemsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const storedDraft = readStoredDraft(application.id);

    setSavedDraft(initialDraft);
    setSavedEssayDrafts(initialEssayDrafts);
    setSavedRecommendationDrafts([]);
    setDraft({ ...initialDraft, ...storedDraft?.draft });
    setEssayDrafts(storedDraft?.essayDrafts ?? initialEssayDrafts);
    setRecommendationDrafts(storedDraft?.recommendationDrafts ?? []);
    setIsLoadingEssays(true);

    Promise.all([
      apiGet<EssayResponse[]>(`/applications/${application.id}/essays`),
      apiGet<CollaborationResponse[]>(`/applications/${application.id}/collaborations`),
      apiGet<CollaboratorResponse[]>('/collaborators'),
    ]).then(([essays, collaborations, collabs]) => {
      if (!isMounted) return;
      const nextEssayDrafts = (essays ?? []).map(createEssayDraft);
      setSavedEssayDrafts(nextEssayDrafts);
      const nextRecDrafts = (collaborations ?? [])
        .filter((collaboration) => collaboration.collaborationType === 'recommendation')
        .map(createRecommendationDraft);
      setSavedRecommendationDrafts(nextRecDrafts);
      if (!storedDraft) {
        setEssayDrafts(nextEssayDrafts);
        setRecommendationDrafts(nextRecDrafts);
      }
      setCollaborators(collabs ?? []);
    }).catch(() => {
      if (isMounted && !storedDraft) setEssayDrafts(initialEssayDrafts);
    }).finally(() => {
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
  const recommendationsAreDirty = JSON.stringify(recommendationDrafts) !== JSON.stringify(savedRecommendationDrafts);
  const isDirty = applicationIsDirty || essaysAreDirty || recommendationsAreDirty;

  useEffect(() => {
    if (isDirty) {
      writeStoredDraft(application.id, draft, essayDrafts, recommendationDrafts);
      return;
    }

    clearStoredDraft(application.id);
  }, [application.id, draft, essayDrafts, isDirty, recommendationDrafts]);

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

  const handleApplicationChange = (updates: Partial<ApplicationFormValues>) => {
    setDraft((current) => ({ ...current, ...updates }));

    if (updates.status === 'Submitted') {
      setEssayDrafts((current) => current.map((essay) => (
        essay.isDeleted || essay.status === 'completed'
          ? essay
          : { ...essay, status: 'completed' }
      )));
    }
  };

  const moveApplicationToInProgress = () => {
    setDraft((current) => ({
      ...current,
      status: moveApplicationStatusToInProgress(current.status),
    }));
  };

  const handleAddEssay = () => {
    moveApplicationToInProgress();
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
    clearStoredDraft(application.id);
  };

  const handleAddRecommendation = () => {
    moveApplicationToInProgress();
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

    const recommendationWithoutDueDate = recommendationDrafts.some((rec) =>
      !rec.isDeleted && rec.recommenderId && !rec.dueDate
    );

    if (recommendationWithoutDueDate) {
      showError('Validation Error', 'Due date is required for recommendation collaborations', 3000);
      return;
    }

    const hasPendingDeletions = essayDrafts.some((essay) => essay.isDeleted) ||
      recommendationDrafts.some((rec) => rec.isDeleted) ||
      savedEssayDrafts.some((savedEssay) => !essayDrafts.some((essay) => essay.id === savedEssay.id));
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
          if (rec.id) await apiDelete(`/collaborations/${rec.id}`);
          return;
        }
        if (!rec.recommenderId) return;
        if (!rec.id) {
          await apiPost<CollaborationResponse>('/collaborations', {
            applicationId: application.id,
            collaboratorId: rec.recommenderId,
            collaborationType: 'recommendation',
            status: rec.status,
            awaitingActionFrom: 'student',
            awaitingActionType: rec.status === 'pending' ? 'send_invite' : undefined,
            nextActionDescription: rec.status === 'pending'
              ? 'Send invitation to collaborator'
              : undefined,
            nextActionDueDate: rec.dueDate,
          });
          return;
        }
        const savedRec = savedRecommendationDrafts.find((r) => r.id === rec.id);
        if (JSON.stringify(rec) !== JSON.stringify(savedRec)) {
          await apiPatch<CollaborationResponse>(`/collaborations/${rec.id}`, {
            status: rec.status,
            nextActionDueDate: rec.dueDate,
            ...(rec.status === 'submitted' && {
              awaitingActionFrom: 'student',
              nextActionDescription: 'Review submitted recommendation',
            }),
            ...(rec.status === 'completed' && {
              awaitingActionFrom: null,
              nextActionDescription: null,
            }),
          });
        }
      }));

      const [refreshedEssays, refreshedRecs] = await Promise.all([
        apiGet<EssayResponse[]>(`/applications/${application.id}/essays`),
        apiGet<CollaborationResponse[]>(`/applications/${application.id}/collaborations`),
      ]);
      const nextEssayDrafts = (refreshedEssays ?? []).map(createEssayDraft);
      const nextRecDrafts = (refreshedRecs ?? [])
        .filter((collaboration) => collaboration.collaborationType === 'recommendation')
        .map(createRecommendationDraft);
      setSavedDraft(draft);
      setEssayDrafts(nextEssayDrafts);
      setSavedEssayDrafts(nextEssayDrafts);
      setRecommendationDrafts(nextRecDrafts);
      setSavedRecommendationDrafts(nextRecDrafts);
      clearStoredDraft(application.id);
      showSuccess('Saved', 'Application updated successfully', 3000);
      shouldResetSaving = false;
      setIsSaving(false);
      onSaveSuccess?.();
    } catch (error) {
      const message = hasPendingDeletions
        ? 'We could not delete one or more items. Please try again.'
        : error instanceof Error ? error.message : 'Failed to save application';
      showError('Save failed', message);
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

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap border-b border-gray-100 pb-2">
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
            compact
            onChange={handleApplicationChange}
          />

          <ApplicationWorkItemsSection
            essayDrafts={essayDrafts}
            recommendationDrafts={recommendationDrafts}
            recommendationCount={draft.recommendationCount}
            collaborators={collaborators}
            isOpen={workItemsOpen}
            isLoadingEssays={isLoadingEssays}
            onOpenChange={setWorkItemsOpen}
            onRecommendationCountChange={(recommendationCount) => setDraft((prev) => ({ ...prev, recommendationCount }))}
            onAddEssay={handleAddEssay}
            onDeleteEssay={handleDeleteEssay}
            onEssayChange={updateEssayDraft}
            onOpenEssay={handleOpenEssay}
            onAddRecommendation={handleAddRecommendation}
            onDeleteRecommendation={handleDeleteRecommendation}
            onRecommendationChange={updateRecommendationDraft}
          />
        </div>

      </div>
    </div>
  );
}
