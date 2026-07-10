import { describe, expect, it } from 'vitest';

import { moveApplicationStatusToInProgress } from './applicationStatus';

describe('moveApplicationStatusToInProgress', () => {
  it('moves not-started applications to in-progress', () => {
    expect(moveApplicationStatusToInProgress('Not Started')).toBe('In Progress');
  });

  it('leaves other statuses unchanged', () => {
    expect(moveApplicationStatusToInProgress('In Progress')).toBe('In Progress');
    expect(moveApplicationStatusToInProgress('Submitted')).toBe('Submitted');
  });
});
