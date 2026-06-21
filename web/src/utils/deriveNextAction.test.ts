import { describe, expect, it } from 'vitest';

import { deriveNextAction, looksLikeWaiting } from './deriveNextAction';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

const baseApplication: ApplicationResponse = {
  id: 1,
  userId: 1,
  scholarshipName: 'Example Scholarship',
  targetType: 'Merit',
  organization: 'Example Org',
  status: 'In Progress',
  currentAction: null,
  dueDate: '2026-07-01',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

describe('looksLikeWaiting', () => {
  it('matches blocked manual current action keywords', () => {
    expect(looksLikeWaiting('Waiting for Recommendations')).toBe(true);
    expect(looksLikeWaiting('Recommendation letter pending')).toBe(true);
    expect(looksLikeWaiting('Pending counselor response')).toBe(true);
  });

  it('does not match applicant-controlled action text', () => {
    expect(looksLikeWaiting('Write essay draft')).toBe(false);
    expect(looksLikeWaiting(null)).toBe(false);
  });
});

describe('deriveNextAction', () => {
  it('returns none for decided applications', () => {
    expect(deriveNextAction({ ...baseApplication, status: 'Submitted' })).toEqual({
      label: '',
      kind: 'none',
      actionable: false,
    });
  });

  it('returns essay work before manual fallback actions', () => {
    expect(
      deriveNextAction({
        ...baseApplication,
        currentAction: 'Waiting for Recommendations',
        essays: [{ status: 'completed' }, { status: 'in_progress' }],
      }),
    ).toEqual({
      label: 'Finish 1 of 2 essays, then submit',
      kind: 'essays',
      actionable: true,
    });
  });

  it('pluralizes essay work when more than one essay is unfinished', () => {
    expect(
      deriveNextAction({
        ...baseApplication,
        essays: [{ status: 'not_started' }, { status: 'in_progress' }, { status: 'completed' }],
      }),
    ).toEqual({
      label: 'Finish 2 of 3 essays',
      kind: 'essays',
      actionable: true,
    });
  });

  it('returns waiting when manual current action is blocked externally', () => {
    expect(
      deriveNextAction({
        ...baseApplication,
        currentAction: 'Waiting for recommender upload',
        essays: [{ status: 'completed' }],
      }),
    ).toEqual({
      label: 'Waiting for recommender upload',
      kind: 'waiting',
      actionable: false,
    });
  });

  it('returns start for unstarted applications with no remaining essay work', () => {
    expect(
      deriveNextAction({
        ...baseApplication,
        status: 'Not Started',
        essays: [],
      }),
    ).toEqual({
      label: 'Start application',
      kind: 'start',
      actionable: true,
    });
  });

  it('returns review and submit for active applications with no blockers', () => {
    expect(
      deriveNextAction({
        ...baseApplication,
        essays: [{ status: 'completed' }],
      }),
    ).toEqual({
      label: 'Review and submit',
      kind: 'submit',
      actionable: true,
    });
  });
});
