/**
 * Essay Test Fixtures
 * Sample essay data for testing
 */

export const mockEssays = {
  personalStatement: {
    id: 1,
    application_id: 1,
    user_id: 1,
    title: 'Personal Statement',
    prompt: 'Describe your educational goals and how this scholarship will help you achieve them.',
    content: 'My educational journey has been shaped by a passion for learning and a commitment to excellence...',
    word_count: 500,
    essay_link: 'https://docs.google.com/document/d/abc123',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  communityService: {
    id: 2,
    application_id: 2,
    user_id: 1,
    title: 'Community Service Essay',
    prompt: 'Describe your most meaningful community service experience.',
    content: 'Volunteering at the local food bank has taught me the value of giving back to my community...',
    word_count: 350,
    essay_link: null,
    created_at: '2024-01-06T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
  },
  leadershipExperience: {
    id: 3,
    application_id: 5,
    user_id: 1,
    title: 'Leadership Experience',
    prompt: 'Tell us about a time you demonstrated leadership.',
    content: 'As president of the student council, I led initiatives to improve student life on campus...',
    word_count: 450,
    essay_link: 'https://docs.google.com/document/d/xyz789',
    created_at: '2024-01-07T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  careerGoals: {
    id: 4,
    application_id: 3,
    user_id: 1,
    title: 'Career Goals',
    prompt: 'What are your career aspirations?',
    content: 'I aspire to become a software engineer working on innovative solutions to global challenges...',
    word_count: 400,
    essay_link: null,
    created_at: '2024-01-08T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
  },
  draft: {
    id: 5,
    application_id: 1,
    user_id: 1,
    title: 'Why This University - Draft',
    prompt: 'Why do you want to attend this university?',
    content: 'This is still a work in progress...',
    word_count: 150,
    essay_link: null,
    created_at: '2024-01-09T00:00:00Z',
    updated_at: '2024-01-09T00:00:00Z',
  },
};

export const createMockEssay = (overrides: Partial<typeof mockEssays.personalStatement> = {}) => ({
  ...mockEssays.personalStatement,
  ...overrides,
});
