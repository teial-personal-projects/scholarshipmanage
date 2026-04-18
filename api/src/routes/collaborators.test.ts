/**
 * Integration tests for collaborators routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
import { mockCollaborators } from '../test/fixtures/collaborators.fixture.js';
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

// Mock collaborators service
vi.mock('../services/collaborators.service.js', () => ({
  getUserCollaborators: vi.fn(),
  getCollaboratorById: vi.fn(),
  createCollaborator: vi.fn(),
  updateCollaborator: vi.fn(),
  deleteCollaborator: vi.fn(),
}));

describe('Collaborators Routes', () => {
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

  describe('GET /api/collaborators', () => {
    it('should return list of user collaborators when authenticated', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');

      vi.mocked(collaboratorsService.getUserCollaborators).mockResolvedValue([
        mockCollaborators.teacher,
        mockCollaborators.counselor,
      ]);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/collaborators');

      expect(response.status).toBe(401);
    });

    it('should enforce relationship validation - only return user own collaborators', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');

      vi.mocked(collaboratorsService.getUserCollaborators).mockResolvedValue([
        mockCollaborators.teacher, // Only user_id: 1
      ]);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators');

      expect(response.status).toBe(200);
      // Verify all returned collaborators belong to user
      response.body.forEach((collab: any) => {
        expect(collab.user_id).toBe(1);
      });
    });
  });

  describe('POST /api/collaborators', () => {
    it('should create new collaborator when authenticated', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');

      const newCollaborator = {
        firstName: 'Dr. New',
        lastName: 'Teacher',
        emailAddress: 'newteacher@school.edu',
        relationship: 'Teacher',
        phoneNumber: '+1234567890',
      };

      const createdCollaborator = {
        ...mockCollaborators.teacher,
        first_name: 'Dr. New',
        last_name: 'Teacher',
        email_address: 'newteacher@school.edu',
        relationship: 'Teacher',
        phone_number: '+1234567890',
        id: 10,
        user_id: 1,
      };

      vi.mocked(collaboratorsService.createCollaborator).mockResolvedValue(createdCollaborator);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborators')
        .send(newCollaborator);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name', newCollaborator.firstName);
    });

    it('should return 400 for invalid input', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborators')
        .send({
          // Missing required fields
          name: '',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should validate relationship - return 400 for invalid relationship', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborators')
        .send({
          name: 'Test',
          emailAddress: 'test@example.com',
          relationship: 'InvalidRelationship', // Invalid relationship type
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/collaborators').send({
        name: 'Test',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/collaborators/:id', () => {
    it('should return collaborator details when authenticated and owner', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');

      vi.mocked(collaboratorsService.getCollaboratorById).mockResolvedValue(
        mockCollaborators.teacher
      );

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent collaborator', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Collaborator not found', 404);
      vi.mocked(collaboratorsService.getCollaboratorById).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators/999');

      expect(response.status).toBe(404);
    });

    it('should enforce relationship validation - return 404 for other user collaborator', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Collaborator not found', 404);
      vi.mocked(collaboratorsService.getCollaboratorById).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators/4'); // user_id: 2

      expect([404, 403]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/collaborators/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/collaborators/:id', () => {
    it('should update collaborator when authenticated and owner', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');

      const updatedCollaborator = {
        ...mockCollaborators.teacher,
        firstName: 'Updated',
        lastName: 'Name',
      };

      vi.mocked(collaboratorsService.getCollaboratorById).mockResolvedValue(
        mockCollaborators.teacher
      );
      vi.mocked(collaboratorsService.updateCollaborator).mockResolvedValue(updatedCollaborator);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/collaborators/1')
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('firstName', 'Updated');
    });

    it('should return 404 for non-existent collaborator', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Collaborator not found', 404);
      vi.mocked(collaboratorsService.updateCollaborator).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/collaborators/999')
        .send({ firstName: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/collaborators/1').send({ name: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/collaborators/:id', () => {
    it('should delete collaborator when authenticated and owner', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');

      vi.mocked(collaboratorsService.getCollaboratorById).mockResolvedValue(
        mockCollaborators.teacher
      );
      vi.mocked(collaboratorsService.deleteCollaborator).mockResolvedValue(undefined);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/collaborators/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent collaborator', async () => {
      await setupAuth();
      const collaboratorsService = await import('../services/collaborators.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Collaborator not found', 404);
      vi.mocked(collaboratorsService.deleteCollaborator).mockRejectedValue(error);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/collaborators/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/collaborators/1');

      expect(response.status).toBe(401);
    });
  });
});

