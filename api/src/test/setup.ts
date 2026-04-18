/**
 * Vitest Test Setup
 * Runs before all tests to configure the test environment
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Set up test environment
beforeAll(() => {
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';

  // Mock environment variables that tests might need
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test-resend-key';
});

// Clean up after all tests
afterAll(() => {
  // Cleanup code here if needed
});

// Reset state before each test
beforeEach(() => {
  // Reset any global state here
});

// Clean up after each test
afterEach(() => {
  // Clear any mocks or cleanup here
});
