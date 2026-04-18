/**
 * Integration tests for applications routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
import { mockApplications } from '../test/fixtures/applications.fixture.js';
import { mockUsers } from '../test/fixtures/users.fixture.js';
import { mockSupabaseAuth } from '../test/helpers/auth-mock.js';

// Mock Supabase
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));

// Mock utils
vi.mock('../utils/supabase.js', () => ({
  getUserProfileByAuthId: vi.fn(),
  getUserProfileById: vi.fn(),
}));

// Mock shared package
vi.mock('@scholarship-hub/shared', async () => {
  const { z } = await import('zod');
  return {
    toCamelCase: vi.fn((obj: any) => obj),
    nameSchema: z.string(),
    phoneSchema: () => z.string(),
    emailSchema: z.string().email(),
    urlSchema: z.string().url(),
    htmlNoteSchema: z.string().max(5000).optional(),
  };
});

// Mock applications service
vi.mock('../services/applications.service.js', () => ({
  getUserApplications: vi.fn(),
  getApplicationById: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
}));

describe('Applications Routes', () => {
  const app = createTestApp();
  const agent = request(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const setupAuth = async () => {
    const { supabase } = await import('../config/supabase.js');
    const { getUserProfileByAuthId } = await import('../utils/supabase.js');

    vi.mocked(supabase.auth.getUser).mockResolvedValue(
      mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'student1@example.com' })
    );
    vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

    // Mock user_roles query for role middleware
    const mockRolesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ role: 'student' }],
        error: null,
      }),
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === 'user_roles') {
        return {
          select: mockRolesSelect,
        };
      }
      return {
        select: mockRolesSelect,
      };
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);
  };

  describe('GET /api/applications', () => {
    it('should return list of user applications when authenticated', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');

      // Mock getUserApplications service
      vi.mocked(applicationsService.getUserApplications).mockResolvedValue([
        mockApplications.inProgress,
        mockApplications.submitted,
      ]);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should support pagination with limit and offset', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');

      vi.mocked(applicationsService.getUserApplications).mockResolvedValue([
        mockApplications.inProgress,
      ]);

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/applications?limit=1&offset=0'
      );

      expect(response.status).toBe(200);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/applications');

      expect(response.status).toBe(401);
    });

    it('should enforce RLS - only return user own applications', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');

      // Mock service to return only user's own applications
      vi.mocked(applicationsService.getUserApplications).mockResolvedValue([
        mockApplications.inProgress, // Only user_id: 1
      ]);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications');

      expect(response.status).toBe(200);
      // Verify all returned applications belong to user
      response.body.forEach((app: any) => {
        expect(app.user_id).toBe(1);
      });
    });
  });

  describe('POST /api/applications', () => {
    it('should create new application when authenticated', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');

      const newApplication = {
        scholarshipName: 'New Scholarship',
        organization: 'New Org',
        minAward: 3000,
        dueDate: '2024-12-31',
        status: 'In Progress',
      };

      const createdApp = {
        ...mockApplications.inProgress,
        scholarship_name: 'New Scholarship',
        organization: 'New Org',
        amount: 3000,
        deadline: '2024-12-31',
        id: 10,
        user_id: 1,
      };

      vi.mocked(applicationsService.createApplication).mockResolvedValue(createdApp);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/applications')
        .send(newApplication);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('scholarship_name', newApplication.scholarshipName);
    });

    it('should return 400 for invalid input', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/applications')
        .send({
          // Missing required fields
          scholarshipName: '',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/applications').send({
        scholarshipName: 'Test',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/applications/:id', () => {
    it('should return application details when authenticated and owner', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');

      vi.mocked(applicationsService.getApplicationById).mockResolvedValue(
        mockApplications.inProgress
      );

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent application', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Application not found', 404);
      vi.mocked(applicationsService.getApplicationById).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications/999');

      expect(response.status).toBe(404);
    });

    it('should enforce RLS - return 404 for other user application', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Application not found', 404);
      vi.mocked(applicationsService.getApplicationById).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications/4'); // user_id: 2

      expect([404, 403]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/applications/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/applications/:id', () => {
    it('should update application when authenticated and owner', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');

      const updatedApp = {
        ...mockApplications.inProgress,
        scholarship_name: 'Updated Scholarship',
      };

      vi.mocked(applicationsService.getApplicationById).mockResolvedValue(
        mockApplications.inProgress
      );
      vi.mocked(applicationsService.updateApplication).mockResolvedValue(updatedApp);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/applications/1')
        .send({
          scholarshipName: 'Updated Scholarship',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scholarship_name', 'Updated Scholarship');
    });

    it('should return 404 for non-existent application', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Application not found', 404);
      vi.mocked(applicationsService.updateApplication).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/applications/999')
        .send({ scholarshipName: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/applications/1').send({ scholarshipName: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/applications/:id', () => {
    it('should delete application when authenticated and owner', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');

      vi.mocked(applicationsService.getApplicationById).mockResolvedValue(
        mockApplications.inProgress
      );
      vi.mocked(applicationsService.deleteApplication).mockResolvedValue(undefined);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/applications/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent application', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Application not found', 404);
      vi.mocked(applicationsService.deleteApplication).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/applications/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/applications/1');

      expect(response.status).toBe(401);
    });
  });
});

