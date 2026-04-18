/**
 * Integration tests for users routes
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

// Mock users service
vi.mock('../services/users.service.js', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserRoles: vi.fn().mockResolvedValue(['student']),
  getUserReminders: vi.fn(),
}));

describe('Users Routes', () => {
  const app = createTestApp();
  const agent = request(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile when authenticated', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');
      const usersService = await import('../services/users.service.js');

      // Mock auth middleware
      vi.mocked(supabase.auth.getUser).mockResolvedValue(
        mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'student1@example.com' })
      );
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

      // Mock getUserProfile service
      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        ...mockUsers.student1,
        searchPreferences: null,
      });

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/users/me');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email_address');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 when token is invalid', async () => {
      const { supabase } = await import('../config/supabase.js');

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: {
          message: 'Invalid token',
          status: 401,
          code: 'AUTH_ERROR',
          __isAuthError: true,
          name: 'AuthError',
        } as any,
      });

      const response = await agent.get('/api/users/me').set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update current user profile when authenticated', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');
      const usersService = await import('../services/users.service.js');

      // Mock auth
      vi.mocked(supabase.auth.getUser).mockResolvedValue(
        mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'student1@example.com' })
      );
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

      // Mock updateUserProfile service
      const updatedUser = { ...mockUsers.student1, first_name: 'Updated', last_name: 'Name' };
      vi.mocked(usersService.updateUserProfile).mockResolvedValue(updatedUser);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/users/me')
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('first_name', 'Updated');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/users/me').send({ firstName: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid input', async () => {
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

      const usersService = await import('../services/users.service.js');
      vi.mocked(usersService.updateUserProfile).mockResolvedValue(mockUsers.student1);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/users/me')
        .send({
          emailAddress: 'invalid-email', // Not in schema, strict validation will reject it
        });

      // Schema validation rejects unrecognized fields (strict mode)
      expect(response.status).toBe(400);
    });
  });

});

