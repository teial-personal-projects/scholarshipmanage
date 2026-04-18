/**
 * Supabase Mock Helper
 * Provides mock Supabase client for testing
 */

import { vi } from 'vitest';

/**
 * Mock Supabase query builder
 * Supports chaining common Supabase methods
 */
export class MockQueryBuilder {
  private mockData: any[] = [];
  private mockError: any = null;
  private mockCount: number | null = null;

  constructor(data: any[] = [], error: any = null, count: number | null = null) {
    this.mockData = data;
    this.mockError = error;
    this.mockCount = count;
  }

  select(_columns?: string) {
    return this;
  }

  insert(_data: any) {
    return this;
  }

  update(_data: any) {
    return this;
  }

  delete() {
    return this;
  }

  eq(_column: string, _value: any) {
    return this;
  }

  neq(_column: string, _value: any) {
    return this;
  }

  gt(_column: string, _value: any) {
    return this;
  }

  gte(_column: string, _value: any) {
    return this;
  }

  lt(_column: string, _value: any) {
    return this;
  }

  lte(_column: string, _value: any) {
    return this;
  }

  like(_column: string, _pattern: string) {
    return this;
  }

  ilike(_column: string, _pattern: string) {
    return this;
  }

  in(_column: string, _values: any[]) {
    return this;
  }

  is(_column: string, _value: any) {
    return this;
  }

  order(_column: string, _options?: { ascending?: boolean }) {
    return this;
  }

  limit(_count: number) {
    return this;
  }

  range(_from: number, _to: number) {
    return this;
  }

  single() {
    return {
      data: this.mockData[0] || null,
      error: this.mockError,
    };
  }

  maybeSingle() {
    return {
      data: this.mockData[0] || null,
      error: this.mockError,
    };
  }

  async then(resolve: (value: any) => void) {
    const result = {
      data: this.mockData,
      error: this.mockError,
      count: this.mockCount,
    };
    return resolve(result);
  }
}

/**
 * Mock Supabase client
 */
export const createMockSupabaseClient = (options: {
  selectData?: any[];
  selectError?: any;
  insertData?: any[];
  insertError?: any;
  updateData?: any[];
  updateError?: any;
  deleteData?: any[];
  deleteError?: any;
  count?: number | null;
} = {}) => {
  return {
    from: vi.fn((_table: string) => ({
      select: vi.fn(() => new MockQueryBuilder(
        options.selectData || [],
        options.selectError || null,
        options.count || null
      )),
      insert: vi.fn(() => new MockQueryBuilder(
        options.insertData || [],
        options.insertError || null
      )),
      update: vi.fn(() => new MockQueryBuilder(
        options.updateData || [],
        options.updateError || null
      )),
      delete: vi.fn(() => new MockQueryBuilder(
        options.deleteData || [],
        options.deleteError || null
      )),
    })),
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
  };
};

/**
 * Common test data generators
 */
export const generateMockUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  auth_user_id: 'test-auth-user-id',
  email_address: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone_number: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockApplication = (overrides: Partial<any> = {}) => ({
  id: 1,
  user_id: 1,
  scholarship_name: 'Test Scholarship',
  organization: 'Test Organization',
  amount: 5000,
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  status: 'In Progress',
  applied_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockEssay = (overrides: Partial<any> = {}) => ({
  id: 1,
  application_id: 1,
  user_id: 1,
  title: 'Test Essay',
  prompt: 'Write about your goals',
  content: 'This is test essay content',
  word_count: 100,
  essay_link: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockCollaborator = (overrides: Partial<any> = {}) => ({
  id: 1,
  user_id: 1,
  name: 'John Doe',
  email_address: 'collaborator@example.com',
  relationship: 'Teacher',
  phone_number: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockCollaboration = (overrides: Partial<any> = {}) => ({
  id: 1,
  collaborator_id: 1,
  application_id: 1,
  collaboration_type: 'recommendation',
  status: 'pending',
  awaiting_action_from: 'student',
  awaiting_action_type: 'send_invite',
  next_action_description: 'Send invitation',
  next_action_due_date: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});
