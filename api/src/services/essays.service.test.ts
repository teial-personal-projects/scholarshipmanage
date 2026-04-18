/**
 * Tests for essays service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockEssays } from '../test/fixtures/essays.fixture';

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('essays.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEssaysByApplicationId', () => {
    it('should return all essays for an application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getEssaysByApplicationId } = await import('./essays.service.js');

      const mockAppEssays = [mockEssays.personalStatement, mockEssays.draft];

      // Mock for application verification (called first) - supports chained .eq() calls
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

      // Mock for essays query
      const mockEssaysSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockAppEssays,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'applications') {
          return {
            select: mockAppSelect,
          };
        }
        if (table === 'essays') {
          return {
            select: mockEssaysSelect,
          };
        }
        return {
          select: mockAppSelect,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getEssaysByApplicationId(1, 1);

      expect(result).toEqual(mockAppEssays);
    });
  });

  describe('getEssayById', () => {
    it('should return a single essay by ID', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getEssayById } = await import('./essays.service.js');

      // Create a chainable mock that supports multiple .eq() calls
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockEssays.personalStatement, applications: { user_id: 1 } },
        error: null,
      });

      const mockSecondEq = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockFirstEq = vi.fn().mockReturnValue({
        eq: mockSecondEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockFirstEq,
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getEssayById(1, 1);

      expect(result).toEqual(mockEssays.personalStatement);
    });
  });

  describe('createEssay', () => {
    it('should create a new essay', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createEssay } = await import('./essays.service.js');

      const newEssay = {
        essayLink: 'https://example.com/essay',
        wordCount: 500,
      };

      const createdEssay = { ...mockEssays.personalStatement, ...newEssay };

      // Mock for application verification (called first) - supports chained .eq() calls
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

      // Mock for essay insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdEssay,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'applications') {
          return {
            select: mockAppSelect,
          };
        }
        if (table === 'essays') {
          return {
            insert: mockInsert,
          };
        }
        return {
          select: mockAppSelect,
          insert: mockInsert,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createEssay(1, 1, newEssay);

      expect(result).toEqual(createdEssay);
    });
  });

  describe('updateEssay', () => {
    it('should update an existing essay', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateEssay } = await import('./essays.service.js');

      const updates = { essayLink: 'https://updated.com', wordCount: 550 };
      const updatedEssay = { ...mockEssays.personalStatement, ...updates };

      // Mock for getEssayById (called first to verify ownership) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: { ...mockEssays.personalStatement, applications: { user_id: 1 } },
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

      // Mock for update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedEssay,
              error: null,
            }),
          }),
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'essays') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateEssay(1, 1, updates);

      expect(result).toEqual(updatedEssay);
    });
  });

  describe('deleteEssay', () => {
    it('should delete an essay', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { deleteEssay } = await import('./essays.service.js');

      // Mock for getEssayById (called first to verify ownership) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: { ...mockEssays.personalStatement, applications: { user_id: 1 } },
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

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'essays') {
          return {
            select: mockSelect,
            delete: mockDelete,
          };
        }
        return {
          select: mockSelect,
          delete: mockDelete,
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await deleteEssay(1, 1);

      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
