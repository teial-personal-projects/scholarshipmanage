/**
 * API Mocks for testing
 * Mock responses for all API endpoints
 */

import { vi } from 'vitest';

/**
 * Mock API responses
 */
export const mockApiResponses = {
  // User endpoints
  getUser: {
    id: 1,
    emailAddress: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },

  // Application endpoints
  getApplications: [
    {
      id: 1,
      userId: 1,
      scholarshipName: 'Merit Scholarship',
      organization: 'State University',
      amount: 5000,
      deadline: '2024-12-31',
      status: 'In Progress',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],

  getApplication: {
    id: 1,
    userId: 1,
    scholarshipName: 'Merit Scholarship',
    organization: 'State University',
    amount: 5000,
    deadline: '2024-12-31',
    status: 'In Progress',
    url: 'https://example.com/scholarship',
    description: 'A merit-based scholarship',
    requirements: 'GPA 3.5+, Essay',
    notes: 'Important scholarship',
    appliedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },

  // Essay endpoints
  getEssays: [
    {
      id: 1,
      applicationId: 1,
      userId: 1,
      title: 'Personal Statement',
      prompt: 'Describe your goals',
      content: 'My goals are...',
      wordCount: 500,
      essayLink: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],

  // Collaborator endpoints
  getCollaborators: [
    {
      id: 1,
      userId: 1,
      name: 'Dr. Sarah Johnson',
      emailAddress: 'teacher@school.edu',
      relationship: 'Teacher',
      phoneNumber: '+1234567890',
      notes: 'English teacher',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],

  // Collaboration endpoints
  getCollaborations: [
    {
      id: 1,
      collaboratorId: 1,
      applicationId: 1,
      collaborationType: 'recommendation',
      status: 'pending',
      awaitingActionFrom: 'student',
      awaitingActionType: 'send_invite',
      nextActionDescription: 'Send invitation',
      nextActionDueDate: '2024-12-15',
      notes: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
};

/**
 * Mock API service
 */
export const mockApiService = {
  get: vi.fn((url: string) => {
    if (url === '/users/me') return Promise.resolve(mockApiResponses.getUser);
    if (url === '/applications') return Promise.resolve(mockApiResponses.getApplications);
    if (url.startsWith('/applications/')) {
      if (url.includes('/essays')) return Promise.resolve(mockApiResponses.getEssays);
      if (url.includes('/collaborations')) return Promise.resolve(mockApiResponses.getCollaborations);
      return Promise.resolve(mockApiResponses.getApplication);
    }
    if (url === '/collaborators') return Promise.resolve(mockApiResponses.getCollaborators);
    return Promise.resolve(null);
  }),

  post: vi.fn((_url: string, _data?: any) => Promise.resolve({ success: true })),
  patch: vi.fn((_url: string, _data?: any) => Promise.resolve({ success: true })),
  delete: vi.fn((_url: string) => Promise.resolve()),
};

/**
 * Mock apiGet function
 */
export const mockApiGet = vi.fn(async <T,>(url: string): Promise<T> => {
  return mockApiService.get(url) as Promise<T>;
});

/**
 * Mock apiPost function
 */
export const mockApiPost = vi.fn(async <T,>(url: string, data?: any): Promise<T> => {
  return mockApiService.post(url, data) as Promise<T>;
});

/**
 * Mock apiPatch function
 */
export const mockApiPatch = vi.fn(async <T,>(url: string, data?: any): Promise<T> => {
  return mockApiService.patch(url, data) as Promise<T>;
});

/**
 * Mock apiDelete function
 */
export const mockApiDelete = vi.fn(async (url: string): Promise<void> => {
  await mockApiService.delete(url);
});

/**
 * Reset all API mocks
 */
export function resetApiMocks() {
  mockApiService.get.mockClear();
  mockApiService.post.mockClear();
  mockApiService.patch.mockClear();
  mockApiService.delete.mockClear();
  mockApiGet.mockClear();
  mockApiPost.mockClear();
  mockApiPatch.mockClear();
  mockApiDelete.mockClear();
}
