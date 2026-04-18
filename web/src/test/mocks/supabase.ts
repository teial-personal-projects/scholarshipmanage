/**
 * Supabase Mocks for frontend testing
 */

import { vi } from 'vitest';

/**
 * Mock Supabase auth user
 */
export const mockAuthUser = {
  id: 'test-auth-user-id',
  email: 'test@example.com',
  user_metadata: {
    firstName: 'Test',
    lastName: 'User',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Supabase session
 */
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockAuthUser,
};

/**
 * Mock Supabase auth
 */
export const mockSupabaseAuth = {
  getSession: vi.fn().mockResolvedValue({
    data: { session: mockSession },
    error: null,
  }),

  getUser: vi.fn().mockResolvedValue({
    data: { user: mockAuthUser },
    error: null,
  }),

  signInWithPassword: vi.fn().mockResolvedValue({
    data: { user: mockAuthUser, session: mockSession },
    error: null,
  }),

  signUp: vi.fn().mockResolvedValue({
    data: { user: mockAuthUser, session: mockSession },
    error: null,
  }),

  signOut: vi.fn().mockResolvedValue({
    error: null,
  }),

  onAuthStateChange: vi.fn((callback) => {
    // Immediately invoke callback with initial session
    callback('SIGNED_IN', mockSession);
    // Return unsubscribe function
    return {
      data: { subscription: { unsubscribe: vi.fn() } },
    };
  }),
};

/**
 * Mock Supabase client
 */
export const createMockSupabaseClient = () => ({
  auth: mockSupabaseAuth,
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
});

/**
 * Reset Supabase mocks
 */
export function resetSupabaseMocks() {
  mockSupabaseAuth.getSession.mockClear();
  mockSupabaseAuth.getUser.mockClear();
  mockSupabaseAuth.signInWithPassword.mockClear();
  mockSupabaseAuth.signUp.mockClear();
  mockSupabaseAuth.signOut.mockClear();
  mockSupabaseAuth.onAuthStateChange.mockClear();
}
