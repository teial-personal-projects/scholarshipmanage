/**
 * Collaborator Test Fixtures
 * Sample collaborator data for testing
 */

export const mockCollaborators = {
  teacher: {
    id: 1,
    user_id: 1,
    name: 'Dr. Sarah Johnson',
    email_address: 'sjohnson@school.edu',
    relationship: 'Teacher',
    phone_number: '+1234567891',
    notes: 'English teacher, knows me well',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  counselor: {
    id: 2,
    user_id: 1,
    name: 'Mr. Michael Brown',
    email_address: 'mbrown@school.edu',
    relationship: 'Counselor',
    phone_number: '+1234567892',
    notes: 'School counselor',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  mentor: {
    id: 3,
    user_id: 1,
    name: 'Dr. Emily Chen',
    email_address: 'echen@university.edu',
    relationship: 'Mentor',
    phone_number: null,
    notes: 'Research mentor from summer program',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  coach: {
    id: 4,
    user_id: 2,
    name: 'Coach David Wilson',
    email_address: 'dwilson@school.edu',
    relationship: 'Coach',
    phone_number: '+1234567893',
    notes: 'Basketball coach',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  employer: {
    id: 5,
    user_id: 1,
    name: 'Ms. Rachel Martinez',
    email_address: 'rmartinez@company.com',
    relationship: 'Employer',
    phone_number: '+1234567894',
    notes: 'Internship supervisor',
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
};

export const createMockCollaborator = (overrides: Partial<typeof mockCollaborators.teacher> = {}) => ({
  ...mockCollaborators.teacher,
  ...overrides,
});
