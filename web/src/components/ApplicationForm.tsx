import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';

import { apiGet, apiPost, apiPatch } from '../services/api';
import {
  type ApplicationResponse,
  type CollaborationResponse,
  type CollaboratorResponse,
  type EssayResponse,
} from '@scholarshipmanage/shared';
import { useToastHelpers } from '../utils/toast';
import { ApplicationFormSections, EMPTY_FORM_VALUES } from './ApplicationFormSections';
import type { ApplicationFormValues } from './ApplicationFormSections';
import ApplicationWorkItemsSection from './ApplicationWorkItemsSection';
import {
  createBlankEssayDraft,
  createBlankRecommendationDraft,
  toEssayPayload,
  type EssayDraft,
  type RecommendationDraft,
} from './ApplicationWorkItemsDrafts';
import { moveApplicationStatusToInProgress } from '../utils/applicationStatus';

const DRAFT_STORAGE_VERSION = 1;
const DRAFT_STORAGE_PREFIX = 'scholarshipmanage:application-form-draft';

interface StoredApplicationFormDraft {
  version: typeof DRAFT_STORAGE_VERSION;
  storageKey: string;
  values: ApplicationFormValues;
  essayDrafts: EssayDraft[];
  recommendationDrafts: RecommendationDraft[];
  workItemsOpen: boolean;
  savedAt: string;
}

function toPayload(values: ApplicationFormValues) {
  const toNum = (s: string) => { const n = Number(s); return s.trim() && !Number.isNaN(n) ? n : null; };
  const toCount = (s: string) => { const n = Number(s); return s.trim() && Number.isInteger(n) && n >= 0 ? n : 0; };
  return {
    scholarshipName: values.scholarshipName.trim(),
    organization: values.organization.trim() || null,
    orgWebsite: values.orgWebsite.trim() || null,
    platform: values.platform.trim() || null,
    applicationLink: values.applicationLink.trim() || null,
    theme: values.theme.trim() || null,
    minAward: toNum(values.minAward),
    recommendationCount: toCount(values.recommendationCount),
    maxAward: toNum(values.maxAward),
    requirements: values.requirements.trim() || null,
    renewable: values.renewable,
    renewableTerms: values.renewable ? values.renewableTerms.trim() || null : null,
    status: values.status,
    targetType: values.targetType || null,
    submissionDate: values.submissionDate || null,
    openDate: values.openDate || null,
    dueDate: values.dueDate,
  };
}

function getDraftStorageKey(applicationId: string | undefined): string {
  return `${DRAFT_STORAGE_PREFIX}:${applicationId ?? 'new'}`;
}

function readStoredDraft(storageKey: string): StoredApplicationFormDraft | null {
  try {
    const item = window.localStorage.getItem(storageKey);
    if (!item) return null;

    const parsed = JSON.parse(item) as Partial<StoredApplicationFormDraft>;
    if (
      parsed.version !== DRAFT_STORAGE_VERSION ||
      parsed.storageKey !== storageKey ||
      !parsed.values ||
      !Array.isArray(parsed.essayDrafts) ||
      !Array.isArray(parsed.recommendationDrafts)
    ) {
      return null;
    }

    return {
      ...(parsed as StoredApplicationFormDraft),
      values: {
        ...EMPTY_FORM_VALUES,
        ...parsed.values,
      },
    };
  } catch {
    return null;
  }
}

function writeStoredDraft(
  storageKey: string,
  values: ApplicationFormValues,
  essayDrafts: EssayDraft[],
  recommendationDrafts: RecommendationDraft[],
  workItemsOpen: boolean,
): void {
  try {
    const payload: StoredApplicationFormDraft = {
      version: DRAFT_STORAGE_VERSION,
      storageKey,
      values,
      essayDrafts,
      recommendationDrafts,
      workItemsOpen,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Browser storage can be unavailable or full; the active form state still holds the edits.
  }
}

function clearStoredDraft(storageKey: string): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing actionable for the user if clearing local draft storage fails.
  }
}

function hasUnsavedDraft(
  values: ApplicationFormValues,
  savedValues: ApplicationFormValues,
  essayDrafts: EssayDraft[],
  recommendationDrafts: RecommendationDraft[],
): boolean {
  return JSON.stringify(values) !== JSON.stringify(savedValues) ||
    essayDrafts.length > 0 ||
    recommendationDrafts.length > 0;
}

function ApplicationForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToastHelpers();
  const isEditMode = !!id;
  const storageKey = getDraftStorageKey(id);
  const allowNavigationRef = useRef(false);
  const [initialStoredDraft] = useState(() => readStoredDraft(storageKey));
  const hasStoredDraft = Boolean(initialStoredDraft);

  const [values, setValues] = useState<ApplicationFormValues>(initialStoredDraft?.values ?? EMPTY_FORM_VALUES);
  const [savedValues, setSavedValues] = useState<ApplicationFormValues>(EMPTY_FORM_VALUES);
  const [essayDrafts, setEssayDrafts] = useState<EssayDraft[]>(initialStoredDraft?.essayDrafts ?? []);
  const [recommendationDrafts, setRecommendationDrafts] = useState<RecommendationDraft[]>(
    initialStoredDraft?.recommendationDrafts ?? [],
  );
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [workItemsOpen, setWorkItemsOpen] = useState(initialStoredDraft?.workItemsOpen ?? false);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasUnsavedChanges = hasUnsavedDraft(values, savedValues, essayDrafts, recommendationDrafts);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    hasUnsavedChanges &&
    !allowNavigationRef.current &&
    currentLocation.pathname !== nextLocation.pathname
  );

  const handleChange = (updates: Partial<ApplicationFormValues>) => {
    setValues((prev) => ({ ...prev, ...updates }));

    if (updates.status === 'Submitted') {
      setEssayDrafts((current) => current.map((essay) => (
        essay.isDeleted || essay.status === 'completed'
          ? essay
          : { ...essay, status: 'completed' }
      )));
    }
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

  const updateRecommendationDraft = <Key extends keyof RecommendationDraft>(
    localId: string,
    key: Key,
    value: RecommendationDraft[Key],
  ) => {
    setRecommendationDrafts((current) => current.map((recommendation) => (
      recommendation.localId === localId ? { ...recommendation, [key]: value } : recommendation
    )));
  };

  const moveApplicationToInProgress = () => {
    setValues((current) => ({
      ...current,
      status: moveApplicationStatusToInProgress(current.status),
    }));
  };

  const handleAddEssay = () => {
    moveApplicationToInProgress();
    setEssayDrafts((current) => [...current, createBlankEssayDraft()]);
    setWorkItemsOpen(true);
  };

  const handleDeleteEssay = (localId: string) => {
    setEssayDrafts((current) => current.filter((essay) => essay.localId !== localId));
  };

  const handleAddRecommendation = () => {
    moveApplicationToInProgress();
    setRecommendationDrafts((current) => [...current, createBlankRecommendationDraft()]);
    setWorkItemsOpen(true);
  };

  const handleDeleteRecommendation = (localId: string) => {
    setRecommendationDrafts((current) => current.filter((recommendation) => recommendation.localId !== localId));
  };

  const handleOpenEssay = (essayLink: string) => {
    if (!essayLink.trim()) return;
    window.open(essayLink.trim(), '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    async function fetchCollaborators() {
      try {
        const collaboratorData = await apiGet<CollaboratorResponse[]>('/collaborators');
        setCollaborators(collaboratorData || []);
      } catch {
        setCollaborators([]);
      }
    }

    void fetchCollaborators();
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    async function fetchApplication() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ApplicationResponse>(`/applications/${id}`);
        const loadedValues: ApplicationFormValues = {
          scholarshipName: data.scholarshipName,
          organization: data.organization ?? '',
          orgWebsite: data.orgWebsite ?? '',
          platform: data.platform ?? '',
          applicationLink: data.applicationLink ?? '',
          theme: data.theme ?? '',
          minAward: data.minAward?.toString() ?? '',
          recommendationCount: data.recommendationCount?.toString() ?? '0',
          maxAward: data.maxAward?.toString() ?? '',
          requirements: data.requirements ?? '',
          renewable: data.renewable ?? false,
          renewableTerms: data.renewableTerms ?? '',
          status: data.status,
          targetType: data.targetType ?? '',
          submissionDate: data.submissionDate ? data.submissionDate.split('T')[0] : '',
          openDate: data.openDate ? data.openDate.split('T')[0] : '',
          dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
        };
        setSavedValues(loadedValues);
        if (!hasStoredDraft) setValues(loadedValues);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load application';
        setError(msg);
        showError('Error', msg);
      } finally {
        setLoading(false);
      }
    }
    fetchApplication();
  }, [hasStoredDraft, id, isEditMode, showError]);

  useEffect(() => {
    if (loading) return;

    if (hasUnsavedDraft(values, savedValues, essayDrafts, recommendationDrafts)) {
      writeStoredDraft(storageKey, values, essayDrafts, recommendationDrafts, workItemsOpen);
      return;
    }

    clearStoredDraft(storageKey);
  }, [essayDrafts, loading, recommendationDrafts, savedValues, storageKey, values, workItemsOpen]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      writeStoredDraft(storageKey, values, essayDrafts, recommendationDrafts, workItemsOpen);
      event.preventDefault();
      event.returnValue = '';
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        writeStoredDraft(storageKey, values, essayDrafts, recommendationDrafts, workItemsOpen);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [essayDrafts, hasUnsavedChanges, recommendationDrafts, storageKey, values, workItemsOpen]);

  const saveApplication = useCallback(async (): Promise<boolean> => {
    if (!values.scholarshipName.trim()) {
      showError('Validation Error', 'Scholarship name is required', 3000);
      return false;
    }
    if (!values.dueDate) {
      showError('Validation Error', 'Due date is required', 3000);
      return false;
    }
    const recommendationWithoutDueDate = recommendationDrafts.some((rec) =>
      !rec.isDeleted && rec.recommenderId && !rec.dueDate
    );

    if (recommendationWithoutDueDate) {
      showError('Validation Error', 'Due date is required for recommendation collaborations', 3000);
      return false;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (isEditMode) {
        await apiPatch(`/applications/${id}`, toPayload(values));
        clearStoredDraft(storageKey);
        allowNavigationRef.current = true;
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        showSuccess('Success', 'Application updated successfully', 3000);
        navigate(`/applications/${id}`);
      } else {
        const created = await apiPost<ApplicationResponse>('/applications', toPayload(values));
        await Promise.all(essayDrafts
          .filter((essay) => !essay.isDeleted)
          .map((essay) => apiPost<EssayResponse>(`/applications/${created.id}/essays`, toEssayPayload(essay))));
        await Promise.all(recommendationDrafts
          .filter((recommendation) => !recommendation.isDeleted && recommendation.recommenderId)
          .map((recommendation) => apiPost<CollaborationResponse>('/collaborations', {
            applicationId: created.id,
            collaboratorId: recommendation.recommenderId,
            collaborationType: 'recommendation',
            status: recommendation.status,
            awaitingActionFrom: 'student',
            awaitingActionType: recommendation.status === 'pending' ? 'send_invite' : undefined,
            nextActionDescription: recommendation.status === 'pending'
              ? 'Send invitation to collaborator'
              : undefined,
            nextActionDueDate: recommendation.dueDate,
          })));
        clearStoredDraft(storageKey);
        allowNavigationRef.current = true;
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        showSuccess('Success', 'Application created successfully', 3000);
        navigate('/dashboard');
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save application';
      setError(msg);
      showError('Error', msg);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [
    essayDrafts,
    id,
    isEditMode,
    navigate,
    queryClient,
    recommendationDrafts,
    showError,
    showSuccess,
    storageKey,
    values,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveApplication();
  };

  const handleSaveBlockedNavigation = async () => {
    if (blocker.state === 'blocked') blocker.reset();
    await saveApplication();
  };

  const handleDiscardBlockedNavigation = () => {
    clearStoredDraft(storageKey);
    allowNavigationRef.current = true;
    if (blocker.state === 'blocked') blocker.proceed();
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center gap-4">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading application...</p>
    </div>
  );

  if (error && isEditMode) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card card-body">
        <p className="text-red-500">{error}</p>
        <button className="btn-outline mt-4" onClick={() => navigate('/dashboard')}>Back to Applications</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-3 md:py-5">
      <div className="sticky top-16 z-10 bg-white border-b border-gray-200 shadow-sm rounded-t-xl px-5 py-2.5 flex items-center justify-between flex-wrap gap-3 mb-3">
        <h1 className="text-lg font-bold text-gray-900">
          {isEditMode ? 'Edit Application' : 'New Application'}
        </h1>
        <div className="flex gap-3">
          <button type="submit" form="application-form" className="btn-primary" disabled={submitting}>
            {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Save')}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate(isEditMode ? `/applications/${id}` : '/dashboard')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>

      <form id="application-form" onSubmit={handleSubmit}>
        <ApplicationFormSections values={values} onChange={handleChange} />

        <ApplicationWorkItemsSection
          essayDrafts={essayDrafts}
          recommendationDrafts={recommendationDrafts}
          recommendationCount={values.recommendationCount}
          collaborators={collaborators}
          isOpen={workItemsOpen}
          onOpenChange={setWorkItemsOpen}
          onRecommendationCountChange={(recommendationCount) => handleChange({ recommendationCount })}
          onAddEssay={handleAddEssay}
          onDeleteEssay={handleDeleteEssay}
          onEssayChange={updateEssayDraft}
          onOpenEssay={handleOpenEssay}
          onAddRecommendation={handleAddRecommendation}
          onDeleteRecommendation={handleDeleteRecommendation}
          onRecommendationChange={updateRecommendationDraft}
        />
      </form>

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-application-title"
            className="w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200"
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 id="unsaved-application-title" className="text-lg font-semibold text-gray-900">
                Save this application?
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">
                This application has unsaved changes. Save it before leaving, or cancel to discard this draft.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
              <button type="button" className="btn-outline" onClick={() => blocker.reset()} disabled={submitting}>
                Keep Editing
              </button>
              <button type="button" className="btn-outline" onClick={handleDiscardBlockedNavigation} disabled={submitting}>
                Cancel Draft
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveBlockedNavigation} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationForm;
