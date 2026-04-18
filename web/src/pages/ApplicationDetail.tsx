import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2, ExternalLink, History, Mail, Check } from 'lucide-react';
import { apiGet, apiDelete, apiPatch } from '../services/api';
import type { ApplicationResponse, EssayResponse, CollaborationResponse, CollaboratorResponse } from '@scholarshipmanage/shared';
import EssayForm from '../components/EssayForm';
import SendInviteDialog from '../components/SendInviteDialog';
import CollaborationHistory from '../components/CollaborationHistory';
import AddCollaborationModal from '../components/AddCollaborationModal';
import EditCollaborationModal from '../components/EditCollaborationModal';
import { formatDateNoTimezone, formatRelativeTimestamp } from '../utils/date';
import { useToastHelpers } from '../utils/toast';


function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [essays, setEssays] = useState<EssayResponse[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationResponse[]>([]);
  const [collaborators, setCollaborators] = useState<Map<number, CollaboratorResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Essay management
  const [isEssayFormOpen, setIsEssayFormOpen] = useState(false);
  const [selectedEssay, setSelectedEssay] = useState<EssayResponse | null>(null);
  const [deleteEssayId, setDeleteEssayId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Collaboration deletion
  const [deleteCollaborationId, setDeleteCollaborationId] = useState<number | null>(null);
  const [isDeleteCollabOpen, setIsDeleteCollabOpen] = useState(false);
  const cancelCollabRef = useRef<HTMLButtonElement>(null);

  // Collaboration invitation
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] = useState<CollaborationResponse | null>(null);

  // Collaboration history
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCollaborationId, setHistoryCollaborationId] = useState<number | null>(null);

  // Add collaboration modal
  const [isAddCollabOpen, setIsAddCollabOpen] = useState(false);

  // Edit collaboration modal
  const [isEditCollabOpen, setIsEditCollabOpen] = useState(false);
  const [selectedCollaborationForEdit, setSelectedCollaborationForEdit] = useState<CollaborationResponse | null>(null);
  const prevIsEditCollabOpenRef = useRef(false);

  // Accordion open states
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [essaysOpen, setEssaysOpen] = useState(true);
  const [collabsOpen, setCollabsOpen] = useState(true);

  // Collaboration tabs
  const [activeCollabTab, setActiveCollabTab] = useState<'recommendations' | 'essayReviews' | 'guidance'>('recommendations');

  // Count collaborations by type
  const recommendationsCount = useMemo(() => {
    return collaborations.filter(c => c.collaborationType === 'recommendation').length;
  }, [collaborations]);

  const essayReviewsCount = useMemo(() => {
    return collaborations.filter(c => c.collaborationType === 'essayReview').length;
  }, [collaborations]);

  const guidanceCount = useMemo(() => {
    return collaborations.filter(c => c.collaborationType === 'guidance').length;
  }, [collaborations]);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch application details
        const appData = await apiGet<ApplicationResponse>(`/applications/${id}`);
        setApplication(appData);

        // Fetch essays for this application
        try {
          const essaysData = await apiGet<EssayResponse[]>(`/applications/${id}/essays`);
          setEssays(essaysData || []);
        } catch (err) {
          // If no essays exist, that's okay
          setEssays([]);
        }

        // Fetch collaborations for this application
        try {
          const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
          setCollaborations(collabsData || []);

          // Extract collaborator data from collaboration responses
          // Collaborator data is now included in each collaboration response
          if (collabsData && collabsData.length > 0) {
            const collaboratorMap = new Map<number, CollaboratorResponse>();
            // Type for collaboration response that may include collaborator data
            type CollaborationWithCollaborator = CollaborationResponse & {
              collaborator?: CollaboratorResponse;
            };
            for (const collab of collabsData) {
              // Check if collaborator is in the response
              const collabWithCollaborator = collab as CollaborationWithCollaborator;
              if (collabWithCollaborator.collaborator?.id) {
                // Use collaborator from response
                collaboratorMap.set(collabWithCollaborator.collaborator.id, collabWithCollaborator.collaborator);
              } else if (!collaboratorMap.has(collab.collaboratorId)) {
                // Fallback: fetch collaborator if not in response
                try {
                  const collaboratorData = await apiGet<CollaboratorResponse>(`/collaborators/${collab.collaboratorId}`);
                  collaboratorMap.set(collab.collaboratorId, collaboratorData);
                } catch (err) {
                  // If collaborator fetch fails, continue with others
                  console.error(`Failed to fetch collaborator ${collab.collaboratorId}:`, err);
                }
              }
            }
            setCollaborators(collaboratorMap);
          }
        } catch (err) {
          // If no collaborations exist, that's okay
          setCollaborations([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load application';
        setError(errorMessage);
        showError('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, showError]);

  // Essay management handlers
  const handleAddEssay = () => {
    setSelectedEssay(null);
    setIsEssayFormOpen(true);
  };

  const handleEditEssay = (essay: EssayResponse) => {
    setSelectedEssay(essay);
    setIsEssayFormOpen(true);
  };

  const handleDeleteClick = (essayId: number) => {
    setDeleteEssayId(essayId);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteEssayId) return;

    try {
      await apiDelete(`/essays/${deleteEssayId}`);
      showSuccess('Success', 'Essay deleted successfully', 3000);

      // Refresh essays list
      const essaysData = await apiGet<EssayResponse[]>(`/applications/${id}/essays`);
      setEssays(essaysData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete essay';
      showError('Error', errorMessage);
    } finally {
      setDeleteEssayId(null);
      setIsDeleteOpen(false);
    }
  };

  const handleEssaySuccess = async () => {
    if (!id) return;

    // Refresh essays list after create/update
    try {
      const essaysData = await apiGet<EssayResponse[]>(`/applications/${id}/essays`);
      setEssays(essaysData || []);
    } catch (err) {
      // If no essays exist, that's okay
      setEssays([]);
    }
  };

  // Collaboration invitation handlers
  const handleSendInvite = (collaboration: CollaborationResponse) => {
    setSelectedCollaboration(collaboration);
    setIsInviteDialogOpen(true);
  };

  const handleInviteSuccess = async () => {
    if (!id) return;

    // Refresh collaborations list after sending invite
    try {
      const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
      setCollaborations(collabsData || []);

      // Fetch collaborator details for new collaborations
      if (collabsData && collabsData.length > 0) {
        const collaboratorMap = new Map(collaborators);
        for (const collab of collabsData) {
          if (!collaboratorMap.has(collab.collaboratorId)) {
            try {
              const collaboratorData = await apiGet<CollaboratorResponse>(`/collaborators/${collab.collaboratorId}`);
              collaboratorMap.set(collab.collaboratorId, collaboratorData);
            } catch (err) {
              console.error(`Failed to fetch collaborator ${collab.collaboratorId}:`, err);
            }
          }
        }
        setCollaborators(collaboratorMap);
      }
    } catch (err) {
      setCollaborations([]);
    }
  };

  // Check if resend invite button should be shown
  const shouldShowResend = (collaboration: CollaborationResponse): boolean => {
    if (collaboration.status !== 'invited' || !collaboration.invite) {
      return false;
    }

    const invite = collaboration.invite;

    // Show resend if delivery failed or bounced
    if (invite.deliveryStatus === 'bounced' || invite.deliveryStatus === 'failed') {
      return true;
    }

    // Show resend if invite was sent more than 3 days ago
    if (invite.sentAt) {
      const sentDate = new Date(invite.sentAt);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      if (sentDate < threeDaysAgo) {
        return true;
      }
    }

    return false;
  };

  // Handle viewing collaboration history
  const handleViewHistory = (collaborationId: number) => {
    setHistoryCollaborationId(collaborationId);
    setIsHistoryOpen(true);
  };

  // Handle editing collaboration
  const handleEditCollaboration = (collaboration: CollaborationResponse) => {
    setSelectedCollaborationForEdit(collaboration);
    setIsEditCollabOpen(true);
  };

  // Handle deleting collaboration
  const handleDeleteCollaborationClick = (collaborationId: number) => {
    setDeleteCollaborationId(collaborationId);
    setIsDeleteCollabOpen(true);
  };

  const handleDeleteCollaborationConfirm = async () => {
    if (!deleteCollaborationId) return;

    try {
      await apiDelete(`/collaborations/${deleteCollaborationId}`);
      showSuccess('Success', 'Collaboration deleted successfully', 3000);

      // Refresh collaborations list
      if (id) {
        const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
        setCollaborations(collabsData || []);

        // Refresh collaborator details
        const collaboratorIds = new Set(
          (collabsData || []).map((c) => c.collaboratorId)
        );
        if (collaboratorIds.size > 0) {
          const collaboratorPromises = Array.from(collaboratorIds).map((collabId) =>
            apiGet<CollaboratorResponse>(`/collaborators/${collabId}`).catch(() => null)
          );
          const collaboratorResults = await Promise.all(collaboratorPromises);
          const collaboratorMap = new Map<number, CollaboratorResponse>();
          collaboratorResults.forEach((collab) => {
            if (collab) {
              collaboratorMap.set(collab.id, collab);
            }
          });
          setCollaborators(collaboratorMap);
        } else {
          setCollaborators(new Map());
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete collaboration';
      showError('Error', errorMessage);
    } finally {
      setDeleteCollaborationId(null);
      setIsDeleteCollabOpen(false);
    }
  };

  // Handle updating collaboration status
  const handleUpdateCollaborationStatus = async (collaborationId: number, status: string) => {
    try {
      // Optimistically update UI so summary counts refresh immediately
      setCollaborations((prev) =>
        prev.map((c) => {
          const idMatch = c.id === collaborationId || c.collaborationId === collaborationId;
          if (!idMatch) return c;
          return {
            ...c,
            status: status as CollaborationResponse['status'],
            awaitingActionFrom: status === 'completed' ? null : c.awaitingActionFrom,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      await apiPatch(`/collaborations/${collaborationId}`, {
        status,
        ...(status === 'completed' && { awaitingActionFrom: null }),
      });

      showSuccess('Success', `Collaboration marked as ${status}`, 3000);

      // Refresh collaborations list
      if (id) {
        const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
        setCollaborations(collabsData || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update collaboration status';
      showError('Error', errorMessage);
    }
  };

  // Handle adding collaboration success
  const handleCollaborationSuccess = useCallback(async () => {
    if (!id) {
      console.warn('handleCollaborationSuccess: No application ID');
      return;
    }

    console.log('Refreshing collaborations list...');

    // Refresh collaborations list after adding/editing
    try {
      const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
      console.log('Fetched collaborations:', collabsData?.length || 0);
      setCollaborations(collabsData || []);

      // Update collaborator map from collaboration data (collaborator is now included in response)
      if (collabsData && collabsData.length > 0) {
        const collaboratorMap = new Map<number, CollaboratorResponse>();
        for (const collab of collabsData) {
          // Use collaborator data from the collaboration response if available
          // Type assertion needed until shared package is rebuilt with updated types
          const collabWithCollaborator = collab as CollaborationResponse & { collaborator?: CollaboratorResponse | null };
          if (collabWithCollaborator.collaborator && collabWithCollaborator.collaborator.id) {
            collaboratorMap.set(collabWithCollaborator.collaborator.id, collabWithCollaborator.collaborator);
          } else if (!collaboratorMap.has(collab.collaboratorId)) {
            // Fallback: fetch collaborator if not in response
            try {
              const collaboratorData = await apiGet<CollaboratorResponse>(`/collaborators/${collab.collaboratorId}`);
              collaboratorMap.set(collab.collaboratorId, collaboratorData);
            } catch (err) {
              console.error(`Failed to fetch collaborator ${collab.collaboratorId}:`, err);
            }
          }
        }
        setCollaborators(collaboratorMap);
        console.log('Updated collaborator map with', collaboratorMap.size, 'collaborators');
      } else {
        setCollaborators(new Map());
      }
    } catch (err) {
      console.error('Failed to refresh collaborations:', err);
      showError('Error', 'Failed to refresh collaborations list');
      // Still try to reload the page data
      try {
        const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
        setCollaborations(collabsData || []);
      } catch (refreshErr) {
        console.error('Failed to reload collaborations:', refreshErr);
        setCollaborations([]);
      }
    }
  }, [id, showError]);

  // Keep collaboration-derived summary tiles current after closing the edit modal
  useEffect(() => {
    const wasOpen = prevIsEditCollabOpenRef.current;
    prevIsEditCollabOpenRef.current = isEditCollabOpen;

    if (wasOpen && !isEditCollabOpen) {
      void handleCollaborationSuccess();
    }
  }, [isEditCollabOpen, handleCollaborationSuccess]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
      case 'Awarded':
        return 'green';
      case 'In Progress':
        return 'blue';
      case 'Not Started':
        return 'gray';
      case 'Not Awarded':
        return 'red';
      default:
        return 'orange';
    }
  };

  const getCollaborationStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'submitted':
        return 'green';
      case 'in_progress':
        return 'blue';
      case 'pending':
      case 'invited':
        return 'orange';
      case 'declined':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatLastUpdated = (date: Date | string | undefined) => formatRelativeTimestamp(date, '-');

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner w-8 h-8" />
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="card">
          <div className="card-body">
            <p className="text-red-500">{error || 'Application not found'}</p>
            <button className="btn-outline mt-4" onClick={() => navigate('/applications')}>
              Back to Applications
            </button>
          </div>
        </div>
      </div>
    );
  }

  const awardAmountText = (() => {
    const min = application.minAward ?? application.maxAward;
    const max = application.maxAward ?? application.minAward ?? application.maxAward;

    if (min == null || max == null) return 'Not specified';
    if (min === max) return `$${min.toLocaleString()}`;
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  })();

  const getEssayStatus = (essay: EssayResponse) => {
    // Prefer explicit status if present (some environments may add it),
    // otherwise derive from existing fields.
    if (essay.status === 'completed') return { label: 'Completed', colorClass: 'badge-green' };
    if (essay.status === 'in_progress') return { label: 'In progress', colorClass: 'badge-blue' };
    if (essay.status === 'not_started') return { label: 'Not started', colorClass: 'badge-gray' };

    if (essay.essayLink) return { label: 'Linked', colorClass: 'badge-green' };
    if (essay.wordCount && essay.wordCount > 0) return { label: 'Draft', colorClass: 'badge-yellow' };
    return { label: 'Needs link', colorClass: 'badge-gray' };
  };

  // Progress counts
  // Essays: treat "complete" as status === completed when present, otherwise having a document link
  const essaysCompleteCount = essays.filter((e) => e && (e.status === 'completed' || Boolean(e.essayLink))).length;
  const essaysTotalCount = essays.length;
  const essaysUncompletedCount = Math.max(essaysTotalCount - essaysCompleteCount, 0);

  // Recommendations: treat "complete" as collaboration status === 'completed'
  const recommendationCollabs = collaborations.filter((c) => c.collaborationType === 'recommendation');
  const recommendationsCompleteCount = recommendationCollabs.filter((c) => c.status === 'completed').length;
  const recommendationsTotalCount = recommendationCollabs.length;
  const recommendationsUncompletedCount = Math.max(recommendationsTotalCount - recommendationsCompleteCount, 0);

  // Essay Reviews: collaborations of type essayReview
  const essayReviewCollabs = collaborations.filter((c) => c.collaborationType === 'essayReview');
  const essayReviewsCompleteCount = essayReviewCollabs.filter((c) => c.status === 'completed').length;
  const essayReviewsTotalCount = essayReviewCollabs.length;
  const essayReviewsUncompletedCount = Math.max(essayReviewsTotalCount - essayReviewsCompleteCount, 0);

  // Helper to render collaboration action buttons (shared across tabs)
  const renderCollabActions = (collab: CollaborationResponse) => (
    <div className="flex items-center gap-1">
      <button
        className="p-1.5 rounded hover:bg-purple-50 text-purple-600"
        aria-label="View History"
        onClick={() => handleViewHistory(collab.id)}
      >
        <History size={16} />
      </button>
      <button
        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
        aria-label="Edit"
        onClick={() => handleEditCollaboration(collab)}
      >
        <Pencil size={16} />
      </button>
      {collab.status === 'pending' && (
        <button
          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
          aria-label="Send Invite"
          onClick={() => handleSendInvite(collab)}
        >
          <Mail size={16} />
        </button>
      )}
      {shouldShowResend(collab) && (
        <button
          className="p-1.5 rounded hover:bg-orange-50 text-orange-600"
          aria-label="Resend Invite"
          onClick={() => handleSendInvite(collab)}
        >
          <Mail size={16} />
        </button>
      )}
      {collab.status === 'submitted' && (
        <button
          className="p-1.5 rounded hover:bg-green-50 text-green-600"
          aria-label="Mark as Completed"
          onClick={() => handleUpdateCollaborationStatus(collab.id, 'completed')}
        >
          <Check size={16} />
        </button>
      )}
      <button
        className="p-1.5 rounded hover:bg-red-50 text-red-600"
        aria-label="Remove"
        onClick={() => handleDeleteCollaborationClick(collab.id)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  // Helper to render collaboration desktop table for a given type
  const renderCollabTable = (type: string) => {
    const filtered = collaborations.filter((c) => c.collaborationType === type);
    return (
      <div className="hidden md:block overflow-x-auto">
        <table className="table-root">
          <thead>
            <tr className="table-header-row">
              <th className="table-th">Collaborator</th>
              <th className="table-th">Status</th>
              <th className="table-th">Due Date</th>
              <th className="table-th">Last Updated</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((collab) => {
              const collaborator = collaborators.get(collab.collaboratorId);
              return (
                <tr key={collab.id} className="table-row">
                  <td className="table-td">
                    {collaborator
                      ? `${collaborator.firstName} ${collaborator.lastName}`
                      : 'Loading...'}
                  </td>
                  <td className="table-td">
                    <span className={`badge badge-${getCollaborationStatusColor(collab.status)}`}>
                      {collab.status}
                    </span>
                  </td>
                  <td className="table-td">
                    {collab.nextActionDueDate
                      ? formatDateNoTimezone(collab.nextActionDueDate)
                      : '-'}
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-gray-600">
                      {formatLastUpdated(collab.updatedAt)}
                    </span>
                  </td>
                  <td className="table-td">
                    {renderCollabActions(collab)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Helper to render collaboration mobile cards for a given type
  const renderCollabCards = (type: string) => {
    const filtered = collaborations.filter((c) => c.collaborationType === type);
    return (
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((collab) => {
          const collaborator = collaborators.get(collab.collaboratorId);
          return (
            <div key={collab.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-base mb-1">
                      {collaborator
                        ? `${collaborator.firstName} ${collaborator.lastName}`
                        : 'Loading...'}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge badge-${getCollaborationStatusColor(collab.status)}`}>
                        {collab.status}
                      </span>
                    </div>
                    {collab.nextActionDueDate && (
                      <p className="text-sm text-gray-600">
                        Due: {formatDateNoTimezone(collab.nextActionDueDate)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Updated: {formatLastUpdated(collab.updatedAt)}
                    </p>
                  </div>
                  {renderCollabActions(collab)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#F5F5F3] min-h-screen py-4 md:py-12">
      <main className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-4 md:gap-6">

          {/* Hero summary */}
          <div className="card overflow-hidden">
            <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4 bg-gradient-to-r from-green-50 to-white border-b border-black/5">
              <div className="flex flex-col gap-4">
                {/* Title row */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                      <h1 className="text-xl md:text-2xl font-bold leading-tight line-clamp-2">
                        {application.scholarshipName}
                      </h1>
                      {application.organization && (
                        <p className="text-gray-700 text-sm md:text-base font-medium">
                          by {application.organization}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`badge badge-${getStatusColor(application.status)}`}>
                        {application.status}
                      </span>
                      {application.targetType && (
                        <span className="badge badge-purple">
                          {application.targetType}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center flex-wrap sm:justify-end">
                    {/* External links */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      {application.applicationLink && (
                        <a
                          href={application.applicationLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn-primary inline-flex items-center gap-2"
                        >
                          <ExternalLink size={16} />
                          Open Application Portal
                        </a>
                      )}
                      {application.orgWebsite && (
                        <a
                          href={application.orgWebsite}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn-outline inline-flex items-center gap-2"
                        >
                          <ExternalLink size={16} />
                          Visit Organization Website
                        </a>
                      )}
                    </div>

                    {(application.applicationLink || application.orgWebsite) && (
                      <div className="hidden sm:block w-px h-10 bg-black/10" />
                    )}

                    {/* Page actions */}
                    <div className="flex items-center gap-2 sm:justify-end">
                      <button
                        className="btn-outline inline-flex items-center gap-2"
                        onClick={() => navigate(`/applications/${id}/edit`)}
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        className="btn-ghost inline-flex items-center gap-2"
                        onClick={() => navigate('/applications')}
                      >
                        ← Back
                      </button>
                    </div>
                  </div>
                </div>

                {/* Key stats */}
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-black/5">
                    <dt className="text-sm text-gray-700">Due date</dt>
                    <dd className="text-base md:text-lg font-semibold">
                      {application.dueDate ? formatDateNoTimezone(application.dueDate) : 'Not specified'}
                    </dd>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-black/5">
                    <dt className="text-sm text-gray-700">Submission date</dt>
                    <dd className="text-base md:text-lg font-semibold">
                      {application.submissionDate ? formatDateNoTimezone(application.submissionDate) : '—'}
                    </dd>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-black/5">
                    <dt className="text-sm text-gray-700">Award amount</dt>
                    <dd className="text-base md:text-lg font-semibold">{awardAmountText}</dd>
                  </div>
                </dl>

                {/* Progress summary */}
                {(recommendationsTotalCount > 0 || essayReviewsTotalCount > 0 || essaysTotalCount > 0) && (
                  <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-green-50 to-white shadow-sm p-4 md:p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg" aria-hidden>✨</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-semibold tracking-tight">Next steps</p>
                        <h2 className="text-sm font-bold text-[#245540] mt-0.5">Current action</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Quick view of what's left across recommendations, reviews, and essays.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Recommendations + Essay Reviews side-by-side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommendationsTotalCount > 0 && (
                          <div className="bg-white border border-black/5 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <span aria-hidden>📨</span>
                                <span className="text-sm text-gray-700 font-semibold">Recommendations</span>
                              </div>
                              <span className={`badge ${recommendationsUncompletedCount === 0 ? 'badge-green' : 'badge-orange'}`}>
                                {recommendationsUncompletedCount === 0 ? 'All done' : `${recommendationsUncompletedCount} left`}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-gray-900">{recommendationsUncompletedCount}</span>
                              <span className="text-sm text-gray-600">/ {recommendationsTotalCount} uncompleted</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                              <div
                                className={`h-2 rounded-full ${recommendationsUncompletedCount === 0 ? 'bg-green-500' : 'bg-orange-400'}`}
                                style={{
                                  width: `${recommendationsTotalCount === 0 ? 0 : ((recommendationsTotalCount - recommendationsUncompletedCount) / recommendationsTotalCount) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {essayReviewsTotalCount > 0 && (
                          <div className="bg-white border border-black/5 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <span aria-hidden>🧑‍🏫</span>
                                <span className="text-sm text-gray-700 font-semibold">Essay Reviews</span>
                              </div>
                              <span className={`badge ${essayReviewsUncompletedCount === 0 ? 'badge-green' : 'badge-blue'}`}>
                                {essayReviewsUncompletedCount === 0 ? 'All done' : `${essayReviewsUncompletedCount} left`}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-gray-900">{essayReviewsUncompletedCount}</span>
                              <span className="text-sm text-gray-600">/ {essayReviewsTotalCount} uncompleted</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                              <div
                                className={`h-2 rounded-full ${essayReviewsUncompletedCount === 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{
                                  width: `${essayReviewsTotalCount === 0 ? 0 : ((essayReviewsTotalCount - essayReviewsUncompletedCount) / essayReviewsTotalCount) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Essays */}
                      {essaysTotalCount > 0 && (
                        <div className="bg-white border border-black/5 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span aria-hidden>📝</span>
                              <span className="text-sm text-gray-700 font-semibold">Essays</span>
                            </div>
                            <span className={`badge ${essaysUncompletedCount === 0 ? 'badge-green' : 'badge-purple'}`}>
                              {essaysUncompletedCount === 0 ? 'All done' : `${essaysUncompletedCount} left`}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900">{essaysUncompletedCount}</span>
                            <span className="text-sm text-gray-600">/ {essaysTotalCount} uncompleted</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                            <div
                              className={`h-2 rounded-full ${essaysUncompletedCount === 0 ? 'bg-green-500' : 'bg-purple-500'}`}
                              style={{
                                width: `${essaysTotalCount === 0 ? 0 : ((essaysTotalCount - essaysUncompletedCount) / essaysTotalCount) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Application Details accordion */}
          <div className="card mb-4">
            <button
              className="card-header w-full text-left flex items-center justify-between rounded-t-xl hover:bg-gray-50"
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              <h3 className="section-heading">Application Details</h3>
              <span className="text-gray-500">{detailsOpen ? '▼' : '▶'}</span>
            </button>
            {detailsOpen && (
              <div className="card-body">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="font-bold text-[#27500A] mb-1">Organization</dt>
                    <dd>{application.organization || 'Not specified'}</dd>
                  </div>

                  {application.orgWebsite && (
                    <div>
                      <dt className="font-bold text-[#27500A] mb-1">Organization Website</dt>
                      <dd>
                        <a
                          href={application.orgWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline inline-flex items-center gap-1"
                        >
                          {application.orgWebsite}
                          <ExternalLink size={14} />
                        </a>
                      </dd>
                    </div>
                  )}

                  {application.targetType && (
                    <div>
                      <dt className="font-bold text-[#27500A] mb-1">Target Type</dt>
                      <dd className="capitalize">{application.targetType}</dd>
                    </div>
                  )}

                  {application.platform && (
                    <div>
                      <dt className="font-bold text-[#27500A] mb-1">Platform</dt>
                      <dd>{application.platform}</dd>
                    </div>
                  )}

                  {application.theme && (
                    <div>
                      <dt className="font-bold text-[#27500A] mb-1">Theme/Focus</dt>
                      <dd>{application.theme}</dd>
                    </div>
                  )}

                  {(application.minAward || application.maxAward) && (
                    <div>
                      <dt className="font-bold text-[#27500A] mb-1">Award Amount</dt>
                      <dd className="font-semibold text-green-600">
                        {application.minAward && application.maxAward
                          ? `$${application.minAward.toLocaleString()} - $${application.maxAward.toLocaleString()}`
                          : application.minAward
                          ? `$${application.minAward.toLocaleString()}`
                          : application.maxAward
                          ? `Up to $${application.maxAward.toLocaleString()}`
                          : 'Not specified'}
                      </dd>
                    </div>
                  )}

                  {application.openDate && (
                    <div>
                      <dt className="font-bold text-[#27500A] mb-1">Open Date</dt>
                      <dd>{formatDateNoTimezone(application.openDate)}</dd>
                    </div>
                  )}

                  {application.submissionDate && (
                    <div>
                      <dt className="font-bold text-[#27500A] mb-1">Submission Date</dt>
                      <dd>{formatDateNoTimezone(application.submissionDate)}</dd>
                    </div>
                  )}

                  {application.currentAction && (
                    <div>
                      <dt className="font-bold text-[#27500A] mb-1">Current Action</dt>
                      <dd>{application.currentAction}</dd>
                    </div>
                  )}
                </dl>

                {application.requirements && (
                  <>
                    <hr className="border-gray-200 my-6" />
                    <div>
                      <p className="font-bold text-[#27500A] mb-2">Requirements</p>
                      <p className="whitespace-pre-wrap">{application.requirements}</p>
                    </div>
                  </>
                )}

                {(application.renewable || application.renewableTerms) && (
                  <>
                    <hr className="border-gray-200 my-6" />
                    <div>
                      <p className="font-bold text-[#27500A] mb-3">Renewable Information</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-sm text-[#27500A] mb-1">Renewable</p>
                          <p>{application.renewable ? 'Yes' : 'No'}</p>
                        </div>
                        {application.renewableTerms && (
                          <div>
                            <p className="font-semibold text-sm text-[#27500A] mb-1">Renewal Terms</p>
                            <p className="whitespace-pre-wrap">{application.renewableTerms}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Essays accordion */}
          <div className="card mb-4">
            <button
              className="card-header w-full text-left flex items-center justify-between rounded-t-xl hover:bg-gray-50"
              onClick={() => setEssaysOpen(!essaysOpen)}
            >
              <h3 className="section-heading">Essays ({essays.length})</h3>
              <span className="text-gray-500">{essaysOpen ? '▼' : '▶'}</span>
            </button>
            {essaysOpen && (
              <div className="card-body">
                <div className="flex justify-end mb-4">
                  <button className="btn-primary" onClick={handleAddEssay}>
                    Add Essay
                  </button>
                </div>

                {essays.length === 0 ? (
                  <p className="text-gray-500">No essays added yet</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="table-root">
                        <thead>
                          <tr className="table-header-row">
                            <th className="table-th">Theme</th>
                            <th className="table-th">Status</th>
                            <th className="table-th">Word Count</th>
                            <th className="table-th">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {essays.map((essay) => {
                            const status = getEssayStatus(essay);
                            return (
                              <tr key={essay.id} className="table-row">
                                <td className="table-td">{essay.theme || 'Untitled'}</td>
                                <td className="table-td">
                                  <span className={`badge ${status.colorClass}`}>{status.label}</span>
                                </td>
                                <td className="table-td">{essay.wordCount || '-'}</td>
                                <td className="table-td">
                                  <div className="flex items-center gap-1">
                                    <button
                                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                                      aria-label="View/Edit Essay"
                                      onClick={() => handleEditEssay(essay)}
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    {essay.essayLink && (
                                      <button
                                        className="p-1.5 rounded hover:bg-green-50 text-green-600"
                                        aria-label="Open Document"
                                        onClick={() => window.open(essay.essayLink!, '_blank', 'noopener,noreferrer')}
                                      >
                                        <ExternalLink size={16} />
                                      </button>
                                    )}
                                    <button
                                      className="p-1.5 rounded hover:bg-red-50 text-red-600"
                                      aria-label="Delete Essay"
                                      onClick={() => handleDeleteClick(essay.id)}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="flex flex-col gap-3 md:hidden">
                      {essays.map((essay) => {
                        const status = getEssayStatus(essay);
                        return (
                          <div key={essay.id} className="card">
                            <div className="card-body">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-bold text-base mb-1">
                                    {essay.theme || 'Untitled'}
                                  </p>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`badge ${status.colorClass}`}>{status.label}</span>
                                    {essay.wordCount && (
                                      <span className="text-sm text-gray-600">{essay.wordCount} words</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                                    aria-label="View/Edit Essay"
                                    onClick={() => handleEditEssay(essay)}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  {essay.essayLink && (
                                    <button
                                      className="p-1.5 rounded hover:bg-green-50 text-green-600"
                                      aria-label="Open Document"
                                      onClick={() => window.open(essay.essayLink!, '_blank', 'noopener,noreferrer')}
                                    >
                                      <ExternalLink size={16} />
                                    </button>
                                  )}
                                  <button
                                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
                                    aria-label="Delete Essay"
                                    onClick={() => handleDeleteClick(essay.id)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Collaborations accordion */}
          <div className="card mb-4">
            <button
              className="card-header w-full text-left flex items-center justify-between rounded-t-xl hover:bg-gray-50"
              onClick={() => setCollabsOpen(!collabsOpen)}
            >
              <h3 className="section-heading">Collaborations ({collaborations.length})</h3>
              <span className="text-gray-500">{collabsOpen ? '▼' : '▶'}</span>
            </button>
            {collabsOpen && (
              <div className="card-body">
                <div className="flex justify-end mb-4">
                  <button className="btn-primary" onClick={() => setIsAddCollabOpen(true)}>
                    Add Collaborator
                  </button>
                </div>

                {collaborations.length === 0 ? (
                  <p className="text-gray-500">
                    No collaborations added yet. Click "Add Collaborator" to get started.
                  </p>
                ) : (
                  <>
                    {/* Tab nav */}
                    <div className="flex gap-1 border-b border-gray-200 mb-4">
                      <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                          activeCollabTab === 'recommendations'
                            ? 'border-[#3B6D11] text-[#27500A]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveCollabTab('recommendations')}
                      >
                        Recommendations
                        <span className="badge badge-green">{recommendationsCount}</span>
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                          activeCollabTab === 'essayReviews'
                            ? 'border-[#3B6D11] text-[#27500A]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveCollabTab('essayReviews')}
                      >
                        Essay Reviews
                        <span className="badge badge-blue">{essayReviewsCount}</span>
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                          activeCollabTab === 'guidance'
                            ? 'border-[#3B6D11] text-[#27500A]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveCollabTab('guidance')}
                      >
                        Guidance
                        <span className="badge badge-gray">{guidanceCount}</span>
                      </button>
                    </div>

                    {/* Recommendations Tab */}
                    {activeCollabTab === 'recommendations' && (
                      <div>
                        {recommendationsCount === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-600">No recommendations yet.</p>
                          </div>
                        ) : (
                          <>
                            {renderCollabTable('recommendation')}
                            {renderCollabCards('recommendation')}
                          </>
                        )}
                      </div>
                    )}

                    {/* Essay Reviews Tab */}
                    {activeCollabTab === 'essayReviews' && (
                      <div>
                        {essayReviewsCount === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-600">No essay reviews yet.</p>
                          </div>
                        ) : (
                          <>
                            {renderCollabTable('essayReview')}
                            {renderCollabCards('essayReview')}
                          </>
                        )}
                      </div>
                    )}

                    {/* Guidance Tab */}
                    {activeCollabTab === 'guidance' && (
                      <div>
                        {guidanceCount === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-600">No guidance sessions yet.</p>
                          </div>
                        ) : (
                          <>
                            {renderCollabTable('guidance')}
                            {renderCollabCards('guidance')}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sticky mobile primary action */}
          {application.applicationLink && (
            <div className="block md:hidden sticky bottom-0 pt-3 pb-3 bg-white/90 backdrop-blur border-t border-black/5 z-10">
              <a
                href={application.applicationLink}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                Open Application Portal
              </a>
            </div>
          )}
        </div>

        {/* Essay Form Modal */}
        <EssayForm
          isOpen={isEssayFormOpen}
          onClose={() => setIsEssayFormOpen(false)}
          applicationId={parseInt(id!)}
          essay={selectedEssay}
          onSuccess={handleEssaySuccess}
        />

        {/* Delete Essay Confirmation Dialog */}
        {isDeleteOpen && (
          <div className="modal-backdrop" onClick={() => setIsDeleteOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="text-lg font-semibold">Delete Essay</h2>
                <button
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  onClick={() => setIsDeleteOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this essay? This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button
                  ref={cancelRef}
                  className="btn-outline"
                  onClick={() => setIsDeleteOpen(false)}
                >
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleDeleteConfirm}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Invite Dialog */}
        <SendInviteDialog
          isOpen={isInviteDialogOpen}
          onClose={() => setIsInviteDialogOpen(false)}
          collaboration={selectedCollaboration}
          collaboratorName={
            selectedCollaboration && collaborators.has(selectedCollaboration.collaboratorId)
              ? `${collaborators.get(selectedCollaboration.collaboratorId)!.firstName} ${collaborators.get(selectedCollaboration.collaboratorId)!.lastName}`
              : undefined
          }
          applicationName={application?.scholarshipName}
          onSuccess={handleInviteSuccess}
        />

        {/* Collaboration History Modal */}
        {isHistoryOpen && (
          <div className="modal-backdrop" onClick={() => setIsHistoryOpen(false)}>
            <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="text-lg font-semibold">Collaboration History</h2>
                <button
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  onClick={() => setIsHistoryOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body pb-6">
                {historyCollaborationId && (
                  <CollaborationHistory
                    collaborationId={historyCollaborationId}
                    isOpen={isHistoryOpen}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Collaboration Modal */}
        <AddCollaborationModal
          isOpen={isAddCollabOpen}
          onClose={() => setIsAddCollabOpen(false)}
          applicationId={parseInt(id!)}
          essays={essays}
          onSuccess={handleCollaborationSuccess}
        />

        {/* Edit Collaboration Modal */}
        <EditCollaborationModal
          isOpen={isEditCollabOpen}
          onClose={() => setIsEditCollabOpen(false)}
          collaboration={selectedCollaborationForEdit}
          onSuccess={handleCollaborationSuccess}
        />

        {/* Delete Collaboration Confirmation Dialog */}
        {isDeleteCollabOpen && (
          <div className="modal-backdrop" onClick={() => setIsDeleteCollabOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="text-lg font-semibold">Delete Collaboration</h2>
                <button
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  onClick={() => setIsDeleteCollabOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this collaboration? This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button
                  ref={cancelCollabRef}
                  className="btn-outline"
                  onClick={() => setIsDeleteCollabOpen(false)}
                >
                  Cancel
                </button>
                <button className="btn-danger" onClick={handleDeleteCollaborationConfirm}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ApplicationDetail;
