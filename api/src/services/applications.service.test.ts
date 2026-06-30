/**
 * Tests for applications service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockApplications } from '../test/fixtures/applications.fixture';

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('applications.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getUserApplications', () => {
    it('should return all applications for a user', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserApplications } = await import('./applications.service.js');

      const mockApps = [mockApplications.inProgress, mockApplications.submitted];
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockApps,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getUserApplications(1);

      expect(result).toEqual(mockApps);
      expect(mockFrom).toHaveBeenCalledWith('applications');
      expect(mockSelect).toHaveBeenCalledWith('*, essays(status), collaborations(status, collaboration_type)');
    });
  });

  describe('getApplicationById', () => {
    it('should return a single application by ID', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getApplicationById } = await import('./applications.service.js');

      // Support chained .eq() calls
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockApplications.inProgress,
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

      const result = await getApplicationById(1, 1);

      expect(result).toEqual(mockApplications.inProgress);
    });

    it('should throw error if application not found', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getApplicationById } = await import('./applications.service.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found', code: 'PGRST116' },
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(getApplicationById(999, 1)).rejects.toThrow();
    });
  });

  describe('createApplication', () => {
    it('should create a new application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createApplication } = await import('./applications.service.js');

      const newApp = {
        scholarshipName: 'Test Scholarship',
        organization: 'Test Org',
        dueDate: '2024-12-31',
      };

      const createdApp = { ...mockApplications.inProgress, ...newApp };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdApp,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createApplication(1, newApp);

      expect(result).toEqual(createdApp);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should default submission date when creating a submitted application without one', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-30T16:30:00Z'));

      const { supabase } = await import('../config/supabase.js');
      const { createApplication } = await import('./applications.service.js');

      const newApp = {
        scholarshipName: 'Test Scholarship',
        dueDate: '2026-07-15',
        status: 'Submitted',
        submissionDate: null,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockApplications.submitted,
              submission_date: '2026-06-30',
            },
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await createApplication(1, newApp);

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        status: 'Submitted',
        submission_date: '2026-06-30',
      }));
    });
  });

  describe('updateApplication', () => {
    it('should update an existing application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateApplication } = await import('./applications.service.js');

      const updates = { status: 'Submitted' };
      const updatedApp = { ...mockApplications.inProgress, status: 'Submitted' };

      // Mock for getApplicationById (called first) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: mockApplications.inProgress,
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

      // Mock for update - supports chained .eq() calls
      const mockUpdateSecondEq = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: updatedApp,
            error: null,
          }),
        }),
      });

      const mockUpdateFirstEq = vi.fn().mockReturnValue({
        eq: mockUpdateSecondEq,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateFirstEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateApplication(1, 1, updates);

      expect(result).toEqual(updatedApp);
    });

    it('should default submission date when updating status to submitted without one', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-30T16:30:00Z'));

      const { supabase } = await import('../config/supabase.js');
      const { updateApplication } = await import('./applications.service.js');

      const updates = { status: 'Submitted' };
      const existingApp = {
        ...mockApplications.inProgress,
        submission_date: null,
      };
      const updatedApp = {
        ...existingApp,
        status: 'Submitted',
        submission_date: '2026-06-30',
      };

      // Mock for getApplicationById (called first) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: existingApp,
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

      // Mock for update - supports chained .eq() calls
      const mockUpdateSecondEq = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: updatedApp,
            error: null,
          }),
        }),
      });

      const mockUpdateFirstEq = vi.fn().mockReturnValue({
        eq: mockUpdateSecondEq,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateFirstEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateApplication(1, 1, updates);

      expect(result).toEqual(updatedApp);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'Submitted',
        submission_date: '2026-06-30',
      }));
    });

    it('should keep an existing submission date when updating status to submitted', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-30T16:30:00Z'));

      const { supabase } = await import('../config/supabase.js');
      const { updateApplication } = await import('./applications.service.js');

      const updates = { status: 'Submitted' };
      const existingApp = {
        ...mockApplications.inProgress,
        submission_date: '2026-06-01',
      };
      const updatedApp = {
        ...existingApp,
        status: 'Submitted',
      };

      // Mock for getApplicationById (called first) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: existingApp,
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

      // Mock for update - supports chained .eq() calls
      const mockUpdateSecondEq = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: updatedApp,
            error: null,
          }),
        }),
      });

      const mockUpdateFirstEq = vi.fn().mockReturnValue({
        eq: mockUpdateSecondEq,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateFirstEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await updateApplication(1, 1, updates);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'Submitted',
      }));
      expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({
        submission_date: expect.any(String),
      }));
    });

    it('should default submission date when submitted update explicitly clears the field', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-30T16:30:00Z'));

      const { supabase } = await import('../config/supabase.js');
      const { updateApplication } = await import('./applications.service.js');

      const updates = {
        status: 'Submitted',
        submissionDate: null,
      };
      const existingApp = {
        ...mockApplications.inProgress,
        submission_date: '2026-06-01',
      };

      // Mock for getApplicationById (called first) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: existingApp,
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

      // Mock for update - supports chained .eq() calls
      const mockUpdateSecondEq = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...existingApp,
              status: 'Submitted',
              submission_date: '2026-06-30',
            },
            error: null,
          }),
        }),
      });

      const mockUpdateFirstEq = vi.fn().mockReturnValue({
        eq: mockUpdateSecondEq,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateFirstEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await updateApplication(1, 1, updates);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'Submitted',
        submission_date: '2026-06-30',
      }));
    });
  });

  describe('deleteApplication', () => {
    it('should delete an application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { deleteApplication } = await import('./applications.service.js');

      // Mock for getApplicationById (called first) - supports chained .eq() calls
      const mockGetByIdSingle = vi.fn().mockResolvedValue({
        data: mockApplications.inProgress,
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

      // Mock for delete - supports chained .eq() calls
      const mockDeleteSecondEq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockDeleteFirstEq = vi.fn().mockReturnValue({
        eq: mockDeleteSecondEq,
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockDeleteFirstEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await deleteApplication(1, 1);

      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
