/**
 * User Test Fixtures
 * Sample user data for testing
 */

export const mockUsers = {
  student1: {
    id: 1,
    auth_user_id: 'auth-user-1',
    email_address: 'student1@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '+1234567890',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    application_reminders_enabled: true,
    collaboration_reminders_enabled: true,
    reminder_intervals: { application: [7, 3, 1], collaboration: [7, 3, 1] },
  },
  student2: {
    id: 2,
    auth_user_id: 'auth-user-2',
    email_address: 'student2@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    phone_number: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    application_reminders_enabled: true,
    collaboration_reminders_enabled: false,
    reminder_intervals: { application: [7, 3, 1], collaboration: [7, 3, 1] },
  },
};

export const createMockUser = (overrides: Partial<typeof mockUsers.student1> = {}) => ({
  ...mockUsers.student1,
  ...overrides,
});
