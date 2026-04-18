/**
 * Integration tests for auth routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../test/helpers/test-server.js';
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

// Mock auth service
vi.mock('../services/auth.service.js', () => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}));

// Mock users service
vi.mock('../services/users.service.js', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserRoles: vi.fn().mockResolvedValue(['student']),
  getUserReminders: vi.fn(),
}));

describe('Auth Routes', () => {
  const app = createTestApp();
  const agent = request(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const authService = await import('../services/auth.service.js');

      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
      };

      const newUser = {
        ...mockUsers.student1,
        id: 10,
        auth_user_id: 'new-auth-user-id',
        email_address: registrationData.email,
        first_name: registrationData.firstName,
        last_name: registrationData.lastName,
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer' as const,
        user: {
          id: 'new-auth-user-id',
          email: registrationData.email,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated' as const,
          created_at: new Date().toISOString(),
        },
      };

      vi.mocked(authService.register).mockResolvedValue({
        user: {
          id: 'new-auth-user-id',
          email: registrationData.email,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
        profile: newUser,
        session: mockSession,
      });

      const response = await agent.post('/api/auth/register').send(registrationData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
    });

    it('should return 400 for invalid email', async () => {
      const response = await agent.post('/api/auth/register').send({
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 for weak password', async () => {
      const response = await agent.post('/api/auth/register').send({
        email: 'test@example.com',
        password: '123', // Too weak
        firstName: 'Test',
        lastName: 'User',
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await agent.post('/api/auth/register').send({
        email: 'test@example.com',
        // Missing password, firstName, lastName
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const authService = await import('../services/auth.service.js');

      const loginData = {
        email: 'student1@example.com',
        password: 'SecurePassword123!',
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer' as const,
        user: {
          id: 'auth-user-1',
          email: loginData.email,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated' as const,
          created_at: new Date().toISOString(),
        },
      };

      vi.mocked(authService.login).mockResolvedValue({
        user: {
          id: 'auth-user-1',
          email: loginData.email,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
        session: mockSession,
      });

      const response = await agent.post('/api/auth/login').send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
    });

    it('should return 401 for invalid credentials', async () => {
      const authService = await import('../services/auth.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Invalid email or password', 401);
      vi.mocked(authService.login).mockRejectedValue(error);

      const response = await agent.post('/api/auth/login').send({
        email: 'student1@example.com',
        password: 'WrongPassword',
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing email or password', async () => {
      const response = await agent.post('/api/auth/login').send({
        email: 'student1@example.com',
        // Missing password
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const authService = await import('../services/auth.service.js');

      vi.mocked(authService.logout).mockResolvedValue({ success: true });

      const response = await agent
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const authService = await import('../services/auth.service.js');

      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };

      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer' as const,
        user: {
          id: 'auth-user-1',
          email: 'student1@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated' as const,
          created_at: new Date().toISOString(),
        },
      };

      vi.mocked(authService.refreshSession).mockResolvedValue({
        session: mockSession,
        user: {
          id: 'auth-user-1',
          email: 'student1@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      });

      const response = await agent.post('/api/auth/refresh').send(refreshData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session');
    });

    it('should return 401 for invalid refresh token', async () => {
      const authService = await import('../services/auth.service.js');
      const { AppError } = await import('../middleware/error-handler.js');

      const error = new AppError('Invalid refresh token', 401);
      vi.mocked(authService.refreshSession).mockRejectedValue(error);

      const response = await agent.post('/api/auth/refresh').send({
        refreshToken: 'invalid-refresh-token',
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await agent.post('/api/auth/refresh').send({});

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Protected Route Access', () => {
    it('should allow access to protected routes with valid token', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');
      const usersService = await import('../services/users.service.js');

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

      // Mock getUserProfile service
      vi.mocked(usersService.getUserProfile).mockResolvedValue({
        ...mockUsers.student1,
        searchPreferences: null,
      });

      const response = await agent
        .get('/api/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
    });

    it('should deny access to protected routes without token', async () => {
      const response = await agent.get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should deny access to protected routes with invalid token', async () => {
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

      const response = await agent
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should deny access to protected routes with expired token', async () => {
      const { supabase } = await import('../config/supabase.js');

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: {
          message: 'Token expired',
          status: 401,
          code: 'AUTH_ERROR',
          __isAuthError: true,
          name: 'AuthError',
        } as any,
      });

      const response = await agent
        .get('/api/users/me')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
    });
  });
});

