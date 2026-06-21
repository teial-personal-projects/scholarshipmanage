import {
  DEADLINE_URGENCY_DAYS,
  DONE_APPLICATION_STATUSES,
  MILLISECONDS_PER_DAY,
  type TApplicationStatus,
} from '@scholarshipmanage/shared';

import { parseDateOnlyToLocalDate } from './date';

export type DeadlineUrgency = 'overdue' | 'critical' | 'warning' | 'normal';

const doneStatuses = new Set<TApplicationStatus>(DONE_APPLICATION_STATUSES);

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDeadlineDaysRemaining(
  dueDate: string | Date | null | undefined,
  today: Date = new Date(),
): number | null {
  if (!dueDate) return null;

  const parsedDueDate = dueDate instanceof Date ? dueDate : parseDateOnlyToLocalDate(dueDate);
  if (!parsedDueDate) return null;

  const due = startOfLocalDay(parsedDueDate);
  const now = startOfLocalDay(today);

  return Math.round((due.getTime() - now.getTime()) / MILLISECONDS_PER_DAY);
}

export function getDeadlineUrgency(
  dueDate: string | Date | null | undefined,
  status: TApplicationStatus,
  today?: Date,
): DeadlineUrgency {
  if (doneStatuses.has(status)) return 'normal';

  const daysRemaining = getDeadlineDaysRemaining(dueDate, today);
  if (daysRemaining === null) return 'normal';
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= DEADLINE_URGENCY_DAYS.CRITICAL) return 'critical';
  if (daysRemaining <= DEADLINE_URGENCY_DAYS.WARNING) return 'warning';

  return 'normal';
}

export function getUrgencyLabel(
  dueDate: string | Date | null | undefined,
  status: TApplicationStatus,
  today?: Date,
): string | null {
  if (!dueDate) return 'No deadline';
  if (doneStatuses.has(status)) return null;

  const daysRemaining = getDeadlineDaysRemaining(dueDate, today);
  if (daysRemaining === null) return 'No deadline';
  if (daysRemaining < 0) return 'Overdue';

  const unit = daysRemaining === 1 ? 'day' : 'days';
  return `${daysRemaining} ${unit} left`;
}

export function getDeadlineBadgeLabel(
  dueDate: string | Date | null | undefined,
  status: TApplicationStatus,
  today?: Date,
): string | null {
  if (doneStatuses.has(status)) return null;

  const daysRemaining = getDeadlineDaysRemaining(dueDate, today);
  if (daysRemaining === null) return 'No deadline';
  if (daysRemaining < 0) {
    const daysOverdue = Math.abs(daysRemaining);
    const unit = daysOverdue === 1 ? 'day' : 'days';
    return `${daysOverdue} ${unit} overdue`;
  }

  const unit = daysRemaining === 1 ? 'day' : 'days';
  return `${daysRemaining} ${unit} left`;
}
