import type { TApplicationStatus } from '@scholarshipmanage/shared';

export function moveApplicationStatusToInProgress(status: TApplicationStatus): TApplicationStatus {
  return status === 'Not Started' ? 'In Progress' : status;
}
