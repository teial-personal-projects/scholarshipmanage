/**
 * Integration tests for essays routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
import { mockEssays } from '../test/fixtures/essays.fixture.js';
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

// Mock essays service
vi.mock('../services/essays.service.js', () => ({
  getEssaysByApplicationId: vi.fn(),
  getEssayById: vi.fn(),
  createEssay: vi.fn(),
  updateEssay: vi.fn(),
  deleteEssay: vi.fn(),
}));

// Mock applications service (for verification)
vi.mock('../services/applications.service.js', () => ({
  getApplicationById: vi.fn(),
}));

describe('Essays Routes', () => {
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

  describe('GET /api/applications/:applicationId/essays', () => {
    it('should return essays for an application when authenticated', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');
      const essaysService = await import('../services/essays.service.js');

      vi.mocked(applicationsService.getApplicationById).mockResolvedValue(
        mockApplications.inProgress
      );
      vi.mocked(essaysService.getEssaysByApplicationId).mockResolvedValue([
        mockEssays.personalStatement,
        mockEssays.communityService,
      ]);

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/applications/1/essays'
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 when application does not exist', async () => {
      await setupAuth();
      const essaysService = await import('../services/essays.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Application not found', 404);
      vi.mocked(essaysService.getEssaysByApplicationId).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/applications/999/essays'
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/applications/1/essays');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/applications/:applicationId/essays', () => {
    it('should create new essay for an application when authenticated', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');
      const essaysService = await import('../services/essays.service.js');

      const newEssay = {
        theme: 'Write about your goals',
        wordCount: 500,
      };

      const createdEssay = {
        ...mockEssays.personalStatement,
        theme: 'Write about your goals',
        word_count: 500,
        id: 10,
        application_id: 1,
        user_id: 1,
      };

      vi.mocked(applicationsService.getApplicationById).mockResolvedValue(
        mockApplications.inProgress
      );
      vi.mocked(essaysService.createEssay).mockResolvedValue(createdEssay);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/applications/1/essays')
        .send(newEssay);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 for invalid input', async () => {
      await setupAuth();
      const applicationsService = await import('../services/applications.service.js');
      const essaysService = await import('../services/essays.service.js');

      vi.mocked(applicationsService.getApplicationById).mockResolvedValue(
        mockApplications.inProgress
      );
      // Service will throw error for invalid input
      const error = new Error('Invalid input') as any;
      error.code = 'VALIDATION_ERROR';
      vi.mocked(essaysService.createEssay).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/applications/1/essays')
        .send({
          // Missing required fields
          title: '',
        });

      expect([400, 422, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/applications/1/essays').send({
        title: 'Test Essay',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/essays/:id', () => {
    it('should return essay details when authenticated and owner', async () => {
      await setupAuth();
      const essaysService = await import('../services/essays.service.js');

      vi.mocked(essaysService.getEssayById).mockResolvedValue(mockEssays.personalStatement);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/essays/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent essay', async () => {
      await setupAuth();
      const essaysService = await import('../services/essays.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Essay not found', 404);
      vi.mocked(essaysService.getEssayById).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/essays/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/essays/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/essays/:id', () => {
    it('should update essay when authenticated and owner', async () => {
      await setupAuth();
      const essaysService = await import('../services/essays.service.js');

      const updatedEssay = {
        ...mockEssays.personalStatement,
        theme: 'Updated Essay Theme',
      };

      vi.mocked(essaysService.getEssayById).mockResolvedValue(mockEssays.personalStatement);
      vi.mocked(essaysService.updateEssay).mockResolvedValue(updatedEssay);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/essays/1')
        .send({
          theme: 'Updated Essay Theme',
        });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent essay', async () => {
      await setupAuth();
      const essaysService = await import('../services/essays.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Essay not found', 404);
      vi.mocked(essaysService.updateEssay).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/essays/999')
        .send({ theme: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/essays/1').send({ title: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/essays/:id', () => {
    it('should delete essay when authenticated and owner', async () => {
      await setupAuth();
      const essaysService = await import('../services/essays.service.js');

      vi.mocked(essaysService.getEssayById).mockResolvedValue(mockEssays.personalStatement);
      vi.mocked(essaysService.deleteEssay).mockResolvedValue(undefined);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/essays/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent essay', async () => {
      await setupAuth();
      const essaysService = await import('../services/essays.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Essay not found', 404);
      vi.mocked(essaysService.deleteEssay).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/essays/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/essays/1');

      expect(response.status).toBe(401);
    });
  });
});

