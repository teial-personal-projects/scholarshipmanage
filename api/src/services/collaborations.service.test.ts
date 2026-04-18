/**
 * Tests for collaborations service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollaborations } from '../test/fixtures/collaborations.fixture';

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('collaborations.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCollaborationsByApplicationId', () => {
    it('should return all collaborations for an application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getCollaborationsByApplicationId } = await import('./collaborations.service.js');

      const mockAppCollabs = [
        mockCollaborations.recommendationPending,
        mockCollaborations.recommendationInvited,
      ];

      // Mock for verifyApplicationOwnership (called first) - supports chained .eq() calls
      const mockAppSingle = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const mockAppSecondEq = vi.fn().mockReturnValue({
        single: mockAppSingle,
      });

      const mockAppFirstEq = vi.fn().mockReturnValue({
        eq: mockAppSecondEq,
      });

      const mockAppSelect = vi.fn().mockReturnValue({
        eq: mockAppFirstEq,
      });

      // Mock for collaborations query - supports .order() after .eq()
      const mockCollabsOrder = vi.fn().mockResolvedValue({
        data: mockAppCollabs,
        error: null,
      });

      const mockCollabsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockCollabsOrder,
        }),
      });

      // Mock for getTypeSpecificData (called for each collaboration)
      const mockTypeSpecificSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockTypeSpecificSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockTypeSpecificSingle,
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'applications') {
          return {
            select: mockAppSelect,
          };
        }
        if (table === 'collaborations') {
          return {
            select: mockCollabsSelect,
          };
        }
        if (table === 'recommendation_collaborations' || 
            table === 'essay_review_collaborations' || 
            table === 'guidance_collaborations') {
          return {
            select: mockTypeSpecificSelect,
          };
        }
        return {
          select: mockAppSelect,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getCollaborationsByApplicationId(1, 1);

      // Result will have type-specific data merged in, so just check it's an array with expected length
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('getCollaborationById', () => {
    it('should return a single collaboration by ID', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getCollaborationById } = await import('./collaborations.service.js');

      // Support chained .eq() calls for getCollaborationById
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockCollaborations.recommendationPending, collaborators: { user_id: 1 } },
        error: null,
      });

      const mockSecondEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockFirstEq = vi.fn().mockReturnValue({
        eq: mockSecondEq,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockFirstEq,
      });

      // Mock for getTypeSpecificData (called by getCollaborationById)
      const mockTypeSpecificSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockTypeSpecificSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockTypeSpecificSingle,
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborations') {
          return {
            select: mockSelect,
          };
        }
        if (table === 'recommendation_collaborations' || 
            table === 'essay_review_collaborations' || 
            table === 'guidance_collaborations') {
          return {
            select: mockTypeSpecificSelect,
          };
        }
        return {
          select: mockSelect,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getCollaborationById(1, 1);

      // Service flattens collaborator info onto `collaborator`
      expect(result).toMatchObject({
        ...mockCollaborations.recommendationPending,
        collaborator: { user_id: 1 },
      });
    });
  });

  describe('createCollaboration', () => {
    it('should create a recommendation collaboration', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createCollaboration } = await import('./collaborations.service.js');

      const newCollab = {
        collaboratorId: 1,
        applicationId: 1,
        collaborationType: 'recommendation' as const,
        nextActionDueDate: '2024-12-31',
        portalUrl: 'https://portal.example.com',
      };

      const createdCollab = { ...mockCollaborations.recommendationPending, ...newCollab };

      // Mock for verifyCollaboratorOwnership - supports chained .eq() calls
      const mockCollabSingle = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const mockCollabSecondEq = vi.fn().mockReturnValue({
        single: mockCollabSingle,
      });

      const mockCollabFirstEq = vi.fn().mockReturnValue({
        eq: mockCollabSecondEq,
      });

      const mockCollabSelect = vi.fn().mockReturnValue({
        eq: mockCollabFirstEq,
      });

      // Mock for verifyApplicationOwnership - supports chained .eq() calls
      const mockAppSingle = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const mockAppSecondEq = vi.fn().mockReturnValue({
        single: mockAppSingle,
      });

      const mockAppFirstEq = vi.fn().mockReturnValue({
        eq: mockAppSecondEq,
      });

      const mockAppSelect = vi.fn().mockReturnValue({
        eq: mockAppFirstEq,
      });

      // Mock for insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdCollab,
            error: null,
          }),
        }),
      });

      // Mock for getCollaborationById (called at end) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: { ...createdCollab, collaborators: { user_id: 1 } },
        error: null,
      });

      const mockGetByIdSecondEq = vi.fn().mockReturnValue({
        single: mockGetByIdSingle,
      });

      const mockGetByIdFirstEq = vi.fn().mockReturnValue({
        eq: mockGetByIdSecondEq,
      });

      const mockGetByIdSelect = vi.fn().mockReturnValue({
        eq: mockGetByIdFirstEq,
      });

      // Mock for getTypeSpecificData (called by getCollaborationById)
      const mockTypeSpecificSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockTypeSpecificSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockTypeSpecificSingle,
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborators') {
          return {
            select: mockCollabSelect,
          };
        }
        if (table === 'applications') {
          return {
            select: mockAppSelect,
          };
        }
        if (table === 'collaborations') {
          return {
            insert: mockInsert,
            select: mockGetByIdSelect,
          };
        }
        if (table === 'recommendation_collaborations') {
          return {
            insert: mockInsert,
            select: mockTypeSpecificSelect,
          };
        }
        return {
          select: mockCollabSelect,
          insert: mockInsert,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createCollaboration(1, newCollab);

      expect(result).toBeDefined();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should create an essay review collaboration', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createCollaboration } = await import('./collaborations.service.js');

      const newCollab = {
        collaboratorId: 1,
        applicationId: 1,
        collaborationType: 'essayReview' as const,
      };

      const createdCollab = { ...mockCollaborations.essayReviewPending, ...newCollab };

      // Mock for verifyCollaboratorOwnership - supports chained .eq() calls
      const mockCollabSingle = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const mockCollabSecondEq = vi.fn().mockReturnValue({
        single: mockCollabSingle,
      });

      const mockCollabFirstEq = vi.fn().mockReturnValue({
        eq: mockCollabSecondEq,
      });

      const mockCollabSelect = vi.fn().mockReturnValue({
        eq: mockCollabFirstEq,
      });

      // Mock for verifyApplicationOwnership - supports chained .eq() calls
      const mockAppSingle = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const mockAppSecondEq = vi.fn().mockReturnValue({
        single: mockAppSingle,
      });

      const mockAppFirstEq = vi.fn().mockReturnValue({
        eq: mockAppSecondEq,
      });

      const mockAppSelect = vi.fn().mockReturnValue({
        eq: mockAppFirstEq,
      });

      // Mock for insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdCollab,
            error: null,
          }),
        }),
      });

      // Mock for getCollaborationById (called at end) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: { ...createdCollab, collaborators: { user_id: 1 } },
        error: null,
      });

      const mockGetByIdSecondEq = vi.fn().mockReturnValue({
        single: mockGetByIdSingle,
      });

      const mockGetByIdFirstEq = vi.fn().mockReturnValue({
        eq: mockGetByIdSecondEq,
      });

      const mockGetByIdSelect = vi.fn().mockReturnValue({
        eq: mockGetByIdFirstEq,
      });

      // Mock for getTypeSpecificData (called by getCollaborationById) - essayReview returns single row
      const mockTypeSpecificSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockTypeSpecificSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockTypeSpecificSingle,
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborators') {
          return {
            select: mockCollabSelect,
          };
        }
        if (table === 'applications') {
          return {
            select: mockAppSelect,
          };
        }
        if (table === 'collaborations') {
          return {
            insert: mockInsert,
            select: mockGetByIdSelect,
          };
        }
        if (table === 'essay_review_collaborations') {
          return {
            insert: mockInsert,
            select: mockTypeSpecificSelect,
          };
        }
        return {
          select: mockCollabSelect,
          insert: mockInsert,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createCollaboration(1, newCollab);

      expect(result).toBeDefined();
    });

    it('should create a guidance collaboration with session details', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createCollaboration } = await import('./collaborations.service.js');

      const newCollab = {
        collaboratorId: 2,
        applicationId: 1,
        collaborationType: 'guidance' as const,
        sessionType: 'one-on-one',
        meetingUrl: 'https://zoom.us/meeting',
      };

      const createdCollab = { ...mockCollaborations.guidancePending, ...newCollab };

      // Mock for verifyCollaboratorOwnership - supports chained .eq() calls
      const mockCollabSingle = vi.fn().mockResolvedValue({
        data: { id: 2 },
        error: null,
      });

      const mockCollabSecondEq = vi.fn().mockReturnValue({
        single: mockCollabSingle,
      });

      const mockCollabFirstEq = vi.fn().mockReturnValue({
        eq: mockCollabSecondEq,
      });

      const mockCollabSelect = vi.fn().mockReturnValue({
        eq: mockCollabFirstEq,
      });

      // Mock for verifyApplicationOwnership - supports chained .eq() calls
      const mockAppSingle = vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      });

      const mockAppSecondEq = vi.fn().mockReturnValue({
        single: mockAppSingle,
      });

      const mockAppFirstEq = vi.fn().mockReturnValue({
        eq: mockAppSecondEq,
      });

      const mockAppSelect = vi.fn().mockReturnValue({
        eq: mockAppFirstEq,
      });

      // Mock for insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdCollab,
            error: null,
          }),
        }),
      });

      // Mock for getCollaborationById (called at end) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: { ...createdCollab, collaborators: { user_id: 1 } },
        error: null,
      });

      const mockGetByIdSecondEq = vi.fn().mockReturnValue({
        single: mockGetByIdSingle,
      });

      const mockGetByIdFirstEq = vi.fn().mockReturnValue({
        eq: mockGetByIdSecondEq,
      });

      const mockGetByIdSelect = vi.fn().mockReturnValue({
        eq: mockGetByIdFirstEq,
      });

      // Mock for getTypeSpecificData (called by getCollaborationById)
      const mockTypeSpecificSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockTypeSpecificSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockTypeSpecificSingle,
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborators') {
          return {
            select: mockCollabSelect,
          };
        }
        if (table === 'applications') {
          return {
            select: mockAppSelect,
          };
        }
        if (table === 'collaborations') {
          return {
            insert: mockInsert,
            select: mockGetByIdSelect,
          };
        }
        if (table === 'guidance_collaborations') {
          return {
            insert: mockInsert,
            select: mockTypeSpecificSelect,
          };
        }
        return {
          select: mockCollabSelect,
          insert: mockInsert,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createCollaboration(1, newCollab);

      expect(result).toBeDefined();
    });
  });

  describe('updateCollaboration', () => {
    it('should update collaboration status', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateCollaboration } = await import('./collaborations.service.js');

      const updates = { status: 'in_progress' };
      const updatedCollab = { ...mockCollaborations.recommendationPending, status: 'in_progress' };

      // Mock for getCollaborationById - called twice (beginning and end)
      // First call returns original, second call returns updated
      const mockGetByIdSingle = vi.fn()
        .mockResolvedValueOnce({
          data: { ...mockCollaborations.recommendationPending, collaborators: { user_id: 1 } },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...updatedCollab, collaborators: { user_id: 1 } },
          error: null,
        });

      const mockGetByIdSecondEq = vi.fn().mockReturnValue({
        single: mockGetByIdSingle,
      });

      const mockGetByIdFirstEq = vi.fn().mockReturnValue({
        eq: mockGetByIdSecondEq,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockGetByIdFirstEq,
      });

      // Mock for getTypeSpecificData (called by getCollaborationById) - called twice
      const mockTypeSpecificSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockTypeSpecificSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockTypeSpecificSingle,
        }),
      });

      // Mock for update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      // Mock for history insert (status change logging)
      const mockHistoryInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborations') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        if (table === 'collaboration_history') {
          return {
            insert: mockHistoryInsert,
          };
        }
        if (table === 'recommendation_collaborations' || 
            table === 'essay_review_collaborations' || 
            table === 'guidance_collaborations') {
          return {
            select: mockTypeSpecificSelect,
          };
        }
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateCollaboration(1, 1, updates);

      // Result will have type-specific data merged in from getCollaborationById
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('status', 'in_progress');
    });
  });

  describe('addCollaborationHistory', () => {
    it('should add a history entry for a collaboration', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { addCollaborationHistory } = await import('./collaborations.service.js');

      const historyData = {
        action: 'invited',
        details: 'Invitation sent to collaborator',
      };

      const historyEntry = {
        id: 1,
        collaboration_id: 1,
        action: 'invited',
        details: 'Invitation sent to collaborator',
        created_at: new Date().toISOString(),
      };

      // Mock for getCollaborationById (called first) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: { ...mockCollaborations.recommendationPending, collaborators: { user_id: 1 } },
        error: null,
      });

      const mockGetByIdSecondEq = vi.fn().mockReturnValue({
        single: mockGetByIdSingle,
      });

      const mockGetByIdFirstEq = vi.fn().mockReturnValue({
        eq: mockGetByIdSecondEq,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockGetByIdFirstEq,
      });

      // Mock for getTypeSpecificData (called by getCollaborationById)
      const mockTypeSpecificSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockTypeSpecificSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockTypeSpecificSingle,
        }),
      });

      // Mock for insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: historyEntry,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborations') {
          return {
            select: mockSelect,
          };
        }
        if (table === 'collaboration_history') {
          return {
            insert: mockInsert,
          };
        }
        if (table === 'recommendation_collaborations' || 
            table === 'essay_review_collaborations' || 
            table === 'guidance_collaborations') {
          return {
            select: mockTypeSpecificSelect,
          };
        }
        return {
          select: mockSelect,
          insert: mockInsert,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await addCollaborationHistory(1, 1, historyData);

      expect(result).toEqual(historyEntry);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('getCollaborationHistory', () => {
    it('should return collaboration history', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getCollaborationHistory } = await import('./collaborations.service.js');

      const mockHistory = [
        { id: 1, collaboration_id: 1, action: 'created', details: 'Collaboration created' },
        { id: 2, collaboration_id: 1, action: 'invited', details: 'Invitation sent' },
      ];

      // Mock for getCollaborationById (called first) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: { ...mockCollaborations.recommendationPending, collaborators: { user_id: 1 } },
        error: null,
      });

      const mockGetByIdSecondEq = vi.fn().mockReturnValue({
        single: mockGetByIdSingle,
      });

      const mockGetByIdFirstEq = vi.fn().mockReturnValue({
        eq: mockGetByIdSecondEq,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockGetByIdFirstEq,
      });

      // Mock for getTypeSpecificData (called by getCollaborationHistory)
      const mockTypeSpecificSingle = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const mockTypeSpecificSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockTypeSpecificSingle,
        }),
      });

      // Mock for history query
      const mockHistorySelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockHistory,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborations') {
          return {
            select: mockSelect,
          };
        }
        if (table === 'collaboration_history') {
          return {
            select: mockHistorySelect,
          };
        }
        if (table === 'recommendation_collaborations' || 
            table === 'essay_review_collaborations' || 
            table === 'guidance_collaborations') {
          return {
            select: mockTypeSpecificSelect,
          };
        }
        return {
          select: mockSelect,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getCollaborationHistory(1, 1);

      expect(result).toEqual(mockHistory);
    });
  });
});
