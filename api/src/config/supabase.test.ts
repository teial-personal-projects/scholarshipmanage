import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn()
    .mockReturnValueOnce({ client: 'privileged' })
    .mockReturnValueOnce({ client: 'auth' }),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient }));

vi.mock('./index.js', () => ({
  config: {
    supabase: {
      url: 'https://example.supabase.co',
      serviceRoleKey: 'test-service-role-key',
    },
  },
}));

describe('Supabase clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isolates privileged database access from user auth sessions', async () => {
    const { supabase, supabaseAuth } = await import('./supabase.js');

    expect(supabase).not.toBe(supabaseAuth);
    expect(createClient).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co',
      'test-service-role-key',
      expect.any(Object)
    );
    expect(createClient).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co',
      'test-service-role-key',
      expect.any(Object)
    );
  });
});
