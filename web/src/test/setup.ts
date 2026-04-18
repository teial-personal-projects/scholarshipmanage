/**
 * Vitest Test Setup for React Components
 * Runs before all tests to configure the test environment
 */

import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createMockSupabaseClient } from './mocks/supabase';

// Mock Supabase config module
vi.mock('../config/supabase', () => ({
  supabase: createMockSupabaseClient(),
}));

// Set up environment
beforeAll(() => {
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';

  // Mock API URL for tests
  process.env.VITE_API_URL = 'http://localhost:3000/api';
});

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (required for Chakra UI)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (sometimes needed for UI components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
