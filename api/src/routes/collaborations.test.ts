/**
 * Integration tests for collaborations routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
import { mockCollaborations } from '../test/fixtures/collaborations.fixture.js';
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

// Mock collaborations service
vi.mock('../services/collaborations.service.js', () => ({
  getCollaborationsByApplicationId: vi.fn(),
  getCollaborationById: vi.fn(),
  createCollaboration: vi.fn(),
  updateCollaboration: vi.fn(),
  deleteCollaboration: vi.fn(),
  getCollaborationHistory: vi.fn(),
}));

describe('Collaborations Routes', () => {
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

  describe('POST /api/collaborations', () => {
    it('should create recommendation collaboration when authenticated', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');

      const newCollaboration = {
        collaboratorId: 1,
        applicationId: 1,
        collaborationType: 'recommendation',
        nextActionDueDate: '2024-12-31',
        notes: 'Need recommendation letter',
      };

      const createdCollaboration = {
        ...mockCollaborations.recommendationPending,
        ...newCollaboration,
        id: 10,
      };

      vi.mocked(collaborationsService.createCollaboration).mockResolvedValue(createdCollaboration);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborations')
        .send(newCollaboration);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('collaboration_type', 'recommendation');
    });

    it('should create essay review collaboration when authenticated', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');

      const newCollaboration = {
        collaboratorId: 1,
        applicationId: 1,
        collaborationType: 'essayReview',
        notes: 'Need essay review',
      };

      const createdCollaboration = {
        ...mockCollaborations.essayReviewPending,
        ...newCollaboration,
        id: 11,
      };

      vi.mocked(collaborationsService.createCollaboration).mockResolvedValue(createdCollaboration);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborations')
        .send(newCollaboration);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('collaboration_type', 'essayReview');
    });

    it('should create guidance collaboration when authenticated', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');

      const newCollaboration = {
        collaboratorId: 2,
        applicationId: 1,
        collaborationType: 'guidance',
        notes: 'Need guidance session',
      };

      const createdCollaboration = {
        ...mockCollaborations.guidancePending,
        ...newCollaboration,
        id: 12,
      };

      vi.mocked(collaborationsService.createCollaboration).mockResolvedValue(createdCollaboration);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborations')
        .send(newCollaboration);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('collaborationType', 'guidance');
    });

    it('should return 400 for invalid collaboration type', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborations')
        .send({
          collaboratorId: 1,
          applicationId: 1,
          collaborationType: 'invalidType',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/collaborations').send({
        collaboratorId: 1,
        applicationId: 1,
        collaborationType: 'recommendation',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/collaborations/:id', () => {
    it('should return collaboration details when authenticated and owner', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');

      vi.mocked(collaborationsService.getCollaborationById).mockResolvedValue(
        mockCollaborations.recommendationPending
      );

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborations/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent collaboration', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Collaboration not found', 404);
      vi.mocked(collaborationsService.getCollaborationById).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborations/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/collaborations/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/collaborations/:id', () => {
    it('should update collaboration status when authenticated and owner', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');

      const updatedCollaboration = {
        ...mockCollaborations.recommendationPending,
        status: 'invited',
        awaiting_action_from: 'collaborator',
      };

      vi.mocked(collaborationsService.getCollaborationById).mockResolvedValue(
        mockCollaborations.recommendationPending
      );
      vi.mocked(collaborationsService.updateCollaboration).mockResolvedValue(updatedCollaboration);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/collaborations/1')
        .send({
          status: 'invited',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'invited');
    });

    it('should track status transitions', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');

      const updatedCollaboration = {
        ...mockCollaborations.recommendationPending,
        status: 'in_progress',
      };

      vi.mocked(collaborationsService.getCollaborationById).mockResolvedValue(
        mockCollaborations.recommendationPending
      );
      vi.mocked(collaborationsService.updateCollaboration).mockResolvedValue(updatedCollaboration);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/collaborations/1')
        .send({
          status: 'in_progress',
        });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent collaboration', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Collaboration not found', 404);
      vi.mocked(collaborationsService.updateCollaboration).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/collaborations/999')
        .send({ status: 'invited' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/collaborations/1').send({ status: 'invited' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/collaborations/:id/history', () => {
    it('should return collaboration history when authenticated and owner', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');

      const mockHistory = [
        {
          id: 1,
          collaboration_id: 1,
          status: 'pending',
          notes: 'Created',
          created_at: '2024-01-10T00:00:00Z',
        },
        {
          id: 2,
          collaboration_id: 1,
          status: 'invited',
          notes: 'Invitation sent',
          created_at: '2024-01-12T00:00:00Z',
        },
      ];

      vi.mocked(collaborationsService.getCollaborationById).mockResolvedValue(
        mockCollaborations.recommendationPending
      );
      vi.mocked(collaborationsService.getCollaborationHistory).mockResolvedValue(mockHistory);

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/collaborations/1/history'
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/collaborations/1/history');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/collaborations/:id', () => {
    it('should delete collaboration when authenticated and owner', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');

      vi.mocked(collaborationsService.getCollaborationById).mockResolvedValue(
        mockCollaborations.recommendationPending
      );
      vi.mocked(collaborationsService.deleteCollaboration).mockResolvedValue(undefined);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/collaborations/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent collaboration', async () => {
      await setupAuth();
      const collaborationsService = await import('../services/collaborations.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Collaboration not found', 404);
      vi.mocked(collaborationsService.deleteCollaboration).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/collaborations/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/collaborations/1');

      expect(response.status).toBe(401);
    });
  });
});

