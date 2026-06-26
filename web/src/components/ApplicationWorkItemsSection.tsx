import { ExternalLink, Plus, Trash2 } from 'lucide-react';

import type {
  CollaborationStatus,
  CollaboratorResponse,
  EssayStatus,
} from '@scholarshipmanage/shared';

import type { EssayDraft, RecommendationDraft } from './ApplicationWorkItemsDrafts';

interface ApplicationWorkItemsSectionProps {
  essayDrafts: EssayDraft[];
  recommendationDrafts: RecommendationDraft[];
  collaborators: CollaboratorResponse[];
  isOpen: boolean;
  isLoadingEssays?: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddEssay: () => void;
  onDeleteEssay: (localId: string) => void;
  onEssayChange: <Key extends keyof EssayDraft>(
    localId: string,
    key: Key,
    value: EssayDraft[Key],
  ) => void;
  onOpenEssay: (essayLink: string) => void;
  onAddRecommendation: () => void;
  onDeleteRecommendation: (localId: string) => void;
  onRecommendationChange: <Key extends keyof RecommendationDraft>(
    localId: string,
    key: Key,
    value: RecommendationDraft[Key],
  ) => void;
}

const ESSAY_STATUS_OPTIONS: { value: EssayStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export default function ApplicationWorkItemsSection({
  essayDrafts,
  recommendationDrafts,
  collaborators,
  isOpen,
  isLoadingEssays = false,
  onOpenChange,
  onAddEssay,
  onDeleteEssay,
  onEssayChange,
  onOpenEssay,
  onAddRecommendation,
  onDeleteRecommendation,
  onRecommendationChange,
}: ApplicationWorkItemsSectionProps) {
  const visibleEssayDrafts = essayDrafts.filter((essay) => !essay.isDeleted);
  const visibleRecommendationDrafts = recommendationDrafts.filter((rec) => !rec.isDeleted);

  return (
    <section className="card">
      <button
        type="button"
        className="w-full text-left flex items-center justify-between gap-3 border-b border-gray-200 hover:bg-gray-50 rounded-t-xl px-4 py-2"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="section-heading">Essays & Recommendations</span>
        <span className="flex items-center gap-2 text-xs text-gray-500">
          {visibleEssayDrafts.length} essays
          <span aria-hidden>·</span>
          {visibleRecommendationDrafts.length} recommenders
          <span className="text-sm text-gray-400">{isOpen ? '▼' : '▶'}</span>
        </span>
      </button>

      {isOpen && (
        <div className="px-4 py-3 space-y-4">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="section-heading">Essays</h3>
                {isLoadingEssays && <p className="text-xs text-gray-500 mt-1">Loading essays...</p>}
              </div>
              <button type="button" className="btn-outline text-sm py-1 px-2.5" onClick={onAddEssay}>
                <Plus size={14} />
                Add Essay
              </button>
            </div>

            {visibleEssayDrafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                No essays added yet.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleEssayDrafts.map((essay, index) => (
                  <div key={essay.localId} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-gray-900">Essay {index + 1}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="btn-outline text-xs py-1 px-2"
                          disabled={!essay.essayLink.trim()}
                          onClick={() => onOpenEssay(essay.essayLink)}
                        >
                          <ExternalLink size={13} />
                          Open
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                          aria-label={`Delete essay ${index + 1}`}
                          onClick={() => onDeleteEssay(essay.localId)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                      <label className="block md:col-span-2">
                        <span className="field-label">Theme / Prompt</span>
                        <input
                          className="field-input"
                          value={essay.theme}
                          onChange={(event) => onEssayChange(essay.localId, 'theme', event.target.value)}
                          placeholder="Essay prompt or topic"
                        />
                      </label>
                      <label className="block">
                        <span className="field-label">Status</span>
                        <select
                          className="field-select"
                          value={essay.status}
                          onChange={(event) => onEssayChange(
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
                          onChange={(event) => onEssayChange(essay.localId, 'wordCount', event.target.value)}
                        />
                      </label>
                      <label className="block md:col-span-4">
                        <span className="field-label">Google Doc Link</span>
                        <input
                          type="url"
                          className="field-input"
                          value={essay.essayLink}
                          onChange={(event) => onEssayChange(essay.localId, 'essayLink', event.target.value)}
                          placeholder="https://docs.google.com/document/..."
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="section-heading">Recommendations</h3>
              <button
                type="button"
                className="btn-outline text-sm py-1 px-2.5 inline-flex items-center gap-1.5"
                onClick={onAddRecommendation}
                disabled={collaborators.length === 0}
              >
                <Plus size={14} />
                Add Recommender
              </button>
            </div>

            {collaborators.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                No collaborators added yet. Add a collaborator first, then assign them as a recommender.
              </div>
            ) : visibleRecommendationDrafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                No recommenders added yet.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleRecommendationDrafts.map((rec, index) => {
                  const takenIds = new Set(
                    visibleRecommendationDrafts
                      .filter((item) => item.localId !== rec.localId && item.recommenderId !== '')
                      .map((item) => item.recommenderId),
                  );
                  const availableCollaborators = collaborators.filter((collaborator) => !takenIds.has(collaborator.id));
                  const assignedCollaborator = collaborators.find((collaborator) => collaborator.id === rec.recommenderId);
                  const recommenderInputId = `${rec.localId}-recommender`;
                  const statusInputId = `${rec.localId}-status`;
                  const dueDateInputId = `${rec.localId}-due-date`;

                  return (
                    <div key={rec.localId} className="rounded-lg border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">Recommender {index + 1}</p>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                          aria-label={`Delete recommender ${index + 1}`}
                          onClick={() => onDeleteRecommendation(rec.localId)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
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
                              onChange={(event) => onRecommendationChange(
                                rec.localId,
                                'recommenderId',
                                Number(event.target.value) || '',
                              )}
                            >
                              <option value="">Select recommender…</option>
                              {availableCollaborators.map((collaborator) => (
                                <option key={collaborator.id} value={collaborator.id}>
                                  {collaborator.firstName} {collaborator.lastName}
                                </option>
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
                            onChange={(event) => onRecommendationChange(
                              rec.localId,
                              'status',
                              event.target.value as CollaborationStatus,
                            )}
                          >
                            <option value="pending">Pending</option>
                            <option value="invited">Invited</option>
                            <option value="in_progress">In Progress</option>
                            <option value="submitted">Submitted</option>
                            <option value="completed">Completed</option>
                            <option value="declined">Declined</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={dueDateInputId} className="field-label">Due Date</label>
                          <input
                            id={dueDateInputId}
                            type="date"
                            className="field-input"
                            value={rec.dueDate}
                            onChange={(event) => onRecommendationChange(rec.localId, 'dueDate', event.target.value)}
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
      )}
    </section>
  );
}
