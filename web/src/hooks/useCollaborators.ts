import { useState, useCallback } from 'react';
import { apiGet } from '../services/api';
import type { CollaboratorResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

/**
 * Custom hook for fetching and managing collaborators
 * @returns Object with collaborators list, loading state, and fetch function
 */
export function useCollaborators() {
  const { showError } = useToastHelpers();
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollaborators = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<CollaboratorResponse[]>('/collaborators');
      setCollaborators(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load collaborators';
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showError]); // showError is now memoized and stable, but keeping it for clarity

  return {
    collaborators,
    loading,
    fetchCollaborators,
    setCollaborators, // In case you need to update the list directly
  };
}
