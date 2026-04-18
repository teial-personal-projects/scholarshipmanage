/**
 * Integration tests for recommendations routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
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

// Mock recommendations service
vi.mock('../services/recommendations.service.js', () => ({
  getRecommendationsByApplicationId: vi.fn(),
  getRecommendationById: vi.fn(),
  createRecommendation: vi.fn(),
  updateRecommendation: vi.fn(),
  deleteRecommendation: vi.fn(),
}));

const mockRecommendations = {
  pending: {
    id: 1,
    application_id: 1,
    recommender_id: 1,
    status: 'Pending',
    submitted_at: null,
    due_date: '2024-12-31',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  submitted: {
    id: 2,
    application_id: 1,
    recommender_id: 2,
    status: 'Submitted',
    submitted_at: '2024-11-15T00:00:00Z',
    due_date: '2024-11-30',
    created_at: '2024-01-11T00:00:00Z',
    updated_at: '2024-11-15T00:00:00Z',
  },
};

describe('Recommendations Routes', () => {
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

  describe('POST /api/recommendations', () => {
    it('should create new recommendation when authenticated', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');

      const newRecommendation = {
        applicationId: 1,
        recommenderId: 1,
        dueDate: '2024-12-31',
      };

      const createdRecommendation = {
        ...mockRecommendations.pending,
        application_id: 1,
        recommender_id: 1,
        due_date: '2024-12-31',
        id: 10,
      };

      vi.mocked(recommendationsService.createRecommendation).mockResolvedValue(
        createdRecommendation
      );

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/recommendations')
        .send(newRecommendation);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'Pending');
    });

    it('should return 400 for invalid input', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/recommendations')
        .send({
          // Missing required fields
          applicationId: 1,
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/recommendations').send({
        applicationId: 1,
        recommenderId: 1,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/recommendations/:id', () => {
    it('should return recommendation details when authenticated and owner', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');

      vi.mocked(recommendationsService.getRecommendationById).mockResolvedValue(
        mockRecommendations.pending
      );

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/recommendations/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent recommendation', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Recommendation not found', 404);
      vi.mocked(recommendationsService.getRecommendationById).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/recommendations/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/recommendations/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/recommendations/:id', () => {
    it('should update recommendation status when authenticated and owner', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');

      const updatedRecommendation = {
        ...mockRecommendations.pending,
        status: 'Submitted',
        submitted_at: new Date().toISOString(),
      };

      vi.mocked(recommendationsService.getRecommendationById).mockResolvedValue(
        mockRecommendations.pending
      );
      vi.mocked(recommendationsService.updateRecommendation).mockResolvedValue(updatedRecommendation);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/recommendations/1')
        .send({
          status: 'Submitted',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'Submitted');
    });

    it('should update due date when authenticated and owner', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');

      const updatedRecommendation = {
        ...mockRecommendations.pending,
        due_date: '2025-01-15',
      };

      vi.mocked(recommendationsService.getRecommendationById).mockResolvedValue(
        mockRecommendations.pending
      );
      vi.mocked(recommendationsService.updateRecommendation).mockResolvedValue(updatedRecommendation);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/recommendations/1')
        .send({
          dueDate: '2025-01-15',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('due_date');
    });

    it('should track due date changes', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');

      const updatedRecommendation = {
        ...mockRecommendations.pending,
        due_date: '2025-02-01',
      };

      vi.mocked(recommendationsService.getRecommendationById).mockResolvedValue(
        mockRecommendations.pending
      );
      vi.mocked(recommendationsService.updateRecommendation).mockResolvedValue(updatedRecommendation);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/recommendations/1')
        .send({
          dueDate: '2025-02-01',
        });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent recommendation', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Recommendation not found', 404);
      vi.mocked(recommendationsService.updateRecommendation).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/recommendations/999')
        .send({ status: 'Submitted' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/recommendations/1').send({ status: 'Submitted' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/recommendations/:id', () => {
    it('should delete recommendation when authenticated and owner', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');

      vi.mocked(recommendationsService.getRecommendationById).mockResolvedValue(
        mockRecommendations.pending
      );
      vi.mocked(recommendationsService.deleteRecommendation).mockResolvedValue(undefined);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/recommendations/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent recommendation', async () => {
      await setupAuth();
      const recommendationsService = await import('../services/recommendations.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Recommendation not found', 404);
      vi.mocked(recommendationsService.deleteRecommendation).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/recommendations/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/recommendations/1');

      expect(response.status).toBe(401);
    });
  });
});

