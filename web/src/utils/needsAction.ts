import { isApplicationDone, type ApplicationResponse } from '@scholarshipmanage/shared';

import { deriveNextAction } from './deriveNextAction';
import { getPendingWorkChips } from './pendingWork';

export function applicationNeedsAction(application: ApplicationResponse): boolean {
  if (isApplicationDone(application.status)) return false;
  if (getPendingWorkChips(application).length > 0) return true;
  if (application.status === 'Not Started') return false;

  const nextAction = deriveNextAction(application);
  return nextAction.actionable || nextAction.kind === 'waiting';
}
