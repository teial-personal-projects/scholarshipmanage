import { describe, expect, it } from 'vitest';

import { getDeadlineUrgency, getUrgencyLabel } from './deadline';

const TODAY = new Date(2026, 5, 21);

describe('deadline urgency', () => {
  it('returns normal urgency and a no-deadline label when no due date is set', () => {
    expect(getDeadlineUrgency(null, 'In Progress', TODAY)).toBe('normal');
    expect(getUrgencyLabel(null, 'In Progress', TODAY)).toBe('No deadline');
  });

  it('marks unfinished past-due applications as overdue', () => {
    expect(getDeadlineUrgency('2026-06-20', 'In Progress', TODAY)).toBe('overdue');
    expect(getUrgencyLabel('2026-06-20', 'In Progress', TODAY)).toBe('Overdue');
  });

  it('does not mark done applications as urgent', () => {
    expect(getDeadlineUrgency('2026-06-20', 'Submitted', TODAY)).toBe('normal');
    expect(getUrgencyLabel('2026-06-20', 'Submitted', TODAY)).toBeNull();
  });

  it('marks deadlines through seven days away as critical', () => {
    expect(getDeadlineUrgency('2026-06-21', 'In Progress', TODAY)).toBe('critical');
    expect(getUrgencyLabel('2026-06-21', 'In Progress', TODAY)).toBe('0 days left');
    expect(getDeadlineUrgency('2026-06-28', 'In Progress', TODAY)).toBe('critical');
    expect(getUrgencyLabel('2026-06-22', 'In Progress', TODAY)).toBe('1 day left');
  });

  it('marks deadlines eight through fourteen days away as warning', () => {
    expect(getDeadlineUrgency('2026-06-29', 'In Progress', TODAY)).toBe('warning');
    expect(getDeadlineUrgency('2026-07-05', 'In Progress', TODAY)).toBe('warning');
  });

  it('marks deadlines more than fourteen days away as normal', () => {
    expect(getDeadlineUrgency('2026-07-06', 'In Progress', TODAY)).toBe('normal');
    expect(getUrgencyLabel('2026-07-06', 'In Progress', TODAY)).toBe('15 days left');
  });
});
