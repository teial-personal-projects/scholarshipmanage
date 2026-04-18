import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';
import type { CollaborationResponse } from '@scholarship-hub/shared';

// Query Keys
export const collaborationKeys = {
  all: ['collaborations'] as const,
  lists: () => [...collaborationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...collaborationKeys.lists(), filters] as const,
  details: () => [...collaborationKeys.all, 'detail'] as const,
  detail: (id: number) => [...collaborationKeys.details(), id] as const,
  history: (id: number) => [...collaborationKeys.all, 'history', id] as const,
  byApplication: (applicationId: number) => [...collaborationKeys.all, 'application', applicationId] as const,
  collaboratorDashboard: () => [...collaborationKeys.all, 'collaborator-dashboard'] as const,
};

// Fetch all collaborations
export function useCollaborations() {
  return useQuery({
    queryKey: collaborationKeys.lists(),
    queryFn: () => apiGet<CollaborationResponse[]>('/collaborations'),
  });
}

// Fetch collaborations for collaborator dashboard
export function useCollaboratorCollaborations() {
  return useQuery({
    queryKey: collaborationKeys.collaboratorDashboard(),
    queryFn: () => apiGet<CollaborationResponse[]>('/collaborators/me/collaborations'),
  });
}

// Fetch collaborations for a specific application
export function useCollaborationsByApplication(applicationId: number) {
  return useQuery({
    queryKey: collaborationKeys.byApplication(applicationId),
    queryFn: () => apiGet<CollaborationResponse[]>(`/applications/${applicationId}/collaborations`),
    enabled: !!applicationId, // Only fetch if applicationId is provided
  });
}

// Fetch a single collaboration
export function useCollaboration(collaborationId: number | null) {
  return useQuery({
    queryKey: collaborationKeys.detail(collaborationId!),
    queryFn: () => apiGet<CollaborationResponse>(`/collaborations/${collaborationId}`),
    enabled: !!collaborationId, // Only fetch if collaborationId is provided
  });
}

// Fetch collaboration history
export function useCollaborationHistory(collaborationId: number | null) {
  return useQuery({
    queryKey: collaborationKeys.history(collaborationId!),
    queryFn: () => apiGet<any[]>(`/collaborations/${collaborationId}/history`),
    enabled: !!collaborationId,
  });
}

// Create collaboration mutation
export function useCreateCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<CollaborationResponse>('/collaborations', data),
    onSuccess: (newCollaboration) => {
      // Invalidate and refetch all collaboration queries
      queryClient.invalidateQueries({ queryKey: collaborationKeys.all });

      // If we know the application ID, invalidate that specific query
      if (newCollaboration.applicationId) {
        queryClient.invalidateQueries({
          queryKey: collaborationKeys.byApplication(newCollaboration.applicationId)
        });
      }
    },
  });
}

// Update collaboration mutation
export function useUpdateCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiPatch<CollaborationResponse>(`/collaborations/${id}`, data),
    onSuccess: (updatedCollaboration) => {
      // Invalidate the specific collaboration
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.detail(updatedCollaboration.id)
      });

      // Invalidate the collaboration history
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.history(updatedCollaboration.id)
      });

      // Invalidate all collaboration lists
      queryClient.invalidateQueries({ queryKey: collaborationKeys.lists() });

      // Invalidate the application-specific list
      if (updatedCollaboration.applicationId) {
        queryClient.invalidateQueries({
          queryKey: collaborationKeys.byApplication(updatedCollaboration.applicationId)
        });
      }
    },
  });
}

// Delete collaboration mutation
export function useDeleteCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiDelete(`/collaborations/${id}`),
    onSuccess: () => {
      // Invalidate all collaboration queries
      queryClient.invalidateQueries({ queryKey: collaborationKeys.all });
    },
  });
}

// Send invitation mutation
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (collaborationId: number) =>
      apiPost<any>(`/collaborations/${collaborationId}/invite`, {}),
    onSuccess: (_, collaborationId) => {
      // Invalidate the specific collaboration to update invite status
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.detail(collaborationId)
      });

      // Invalidate history to show the new "invited" action
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.history(collaborationId)
      });
    },
  });
}

// Resend invitation mutation
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (collaborationId: number) =>
      apiPost<any>(`/collaborations/${collaborationId}/resend-invite`, {}),
    onSuccess: (_, collaborationId) => {
      // Invalidate the specific collaboration
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.detail(collaborationId)
      });

      // Invalidate history to show the new "resent" action
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.history(collaborationId)
      });
    },
  });
}
