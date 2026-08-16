import { beforeEach, describe, expect, it, vi } from 'vitest';

const { privilegedSignIn, authSignIn, authRefresh } = vi.hoisted(() => ({
  privilegedSignIn: vi.fn(),
  authSignIn: vi.fn(),
  authRefresh: vi.fn(),
}));

vi.mock('../config/supabase.js', () => ({
  supabase: {
    auth: {
      admin: { createUser: vi.fn() },
      signInWithPassword: privilegedSignIn,
    },
  },
  supabaseAuth: {
    auth: {
      signInWithPassword: authSignIn,
      refreshSession: authRefresh,
    },
  },
}));

vi.mock('../utils/supabase.js', () => ({
  insertOne: vi.fn(),
}));

import { login, refreshSession } from './auth.service.js';

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'auth-user-id',
    email: 'student@example.com',
  },
};

describe('auth service client isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs in through the isolated auth client', async () => {
    authSignIn.mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    });

    await expect(login({
      email: 'student@example.com',
      password: 'SecurePassword123!',
    })).resolves.toEqual({ session, user: session.user });

    expect(authSignIn).toHaveBeenCalledOnce();
    expect(privilegedSignIn).not.toHaveBeenCalled();
  });

  it('refreshes sessions through the isolated auth client', async () => {
    authRefresh.mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    });

    await expect(refreshSession('refresh-token')).resolves.toEqual({
      session,
      user: session.user,
    });

    expect(authRefresh).toHaveBeenCalledWith({
      refresh_token: 'refresh-token',
    });
    expect(privilegedSignIn).not.toHaveBeenCalled();
  });
});
