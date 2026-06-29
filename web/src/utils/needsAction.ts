import { isApplicationDone, type ApplicationResponse } from '@scholarshipmanage/shared';

import { getPendingWorkChips } from './pendingWork';

export function applicationNeedsAction(application: ApplicationResponse): boolean {
  if (isApplicationDone(application.status)) return false;
  return getPendingWorkChips(application).length > 0;
}
