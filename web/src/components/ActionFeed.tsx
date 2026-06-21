import { useState } from 'react';

import { isApplicationDone, type ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineDaysRemaining, getDeadlineUrgency } from '../utils/deadline';
import { deriveNextAction } from '../utils/deriveNextAction';
import { isReadyToStartApplication } from '../utils/readyToStart';
import ActionRow from './ActionRow';
import ReadyToStart from './ReadyToStart';

interface ActionFeedProps {
  applications: ApplicationResponse[];
}

interface FeedGroup {
  key: string;
  title: string;
  applications: ApplicationResponse[];
}

function compareApplications(first: ApplicationResponse, second: ApplicationResponse): number {
  const firstAction = deriveNextAction(first);
  const secondAction = deriveNextAction(second);

  if (firstAction.actionable !== secondAction.actionable) {
    return firstAction.actionable ? -1 : 1;
  }

  const firstDaysRemaining = getDeadlineDaysRemaining(first.dueDate) ?? Number.POSITIVE_INFINITY;
  const secondDaysRemaining = getDeadlineDaysRemaining(second.dueDate) ?? Number.POSITIVE_INFINITY;
  if (firstDaysRemaining !== secondDaysRemaining) {
    return firstDaysRemaining - secondDaysRemaining;
  }

  return first.scholarshipName.localeCompare(second.scholarshipName);
}

function groupApplications(applications: ApplicationResponse[]): FeedGroup[] {
  const activeApplications = applications.filter(
    (application) => !isApplicationDone(application.status) && !isReadyToStartApplication(application),
  );

  const groups: FeedGroup[] = [
    { key: 'overdue', title: 'Overdue', applications: [] },
    { key: 'critical', title: 'Due this week', applications: [] },
    { key: 'warning', title: 'Next two weeks', applications: [] },
    { key: 'later', title: 'Later', applications: [] },
    { key: 'noDeadline', title: 'No deadline set', applications: [] },
  ];

  activeApplications.forEach((application) => {
    if (!application.dueDate) {
      groups[4].applications.push(application);
      return;
    }

    const urgency = getDeadlineUrgency(application.dueDate, application.status);
    if (urgency === 'overdue') groups[0].applications.push(application);
    else if (urgency === 'critical') groups[1].applications.push(application);
    else if (urgency === 'warning') groups[2].applications.push(application);
    else groups[3].applications.push(application);
  });

  return groups
    .map((group) => ({
      ...group,
      applications: [...group.applications].sort(compareApplications),
    }))
    .filter((group) => group.applications.length > 0);
}

export default function ActionFeed({ applications }: ActionFeedProps) {
  const [showDecided, setShowDecided] = useState(false);
  const decidedApplications = applications.filter((application) => isApplicationDone(application.status));
  const readyApplications = applications.filter(isReadyToStartApplication);
  const groups = groupApplications(applications);
  const hasActionableApplications = groups.length > 0;
  const hasReadyApplications = readyApplications.length > 0;

  if (!hasActionableApplications && !hasReadyApplications && decidedApplications.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="font-semibold text-brand-700 text-lg mb-2">No actions yet</h3>
        <p className="text-gray-600 text-sm">Create an application to start tracking next steps.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ReadyToStart applications={applications} />

      {hasActionableApplications ? (
        groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wide">{group.title}</h3>
            <div className="space-y-2">
              {group.applications.map((application) => (
                <ActionRow key={application.id} application={application} />
              ))}
            </div>
          </section>
        ))
      ) : (
        !hasReadyApplications && <div className="text-center py-10">
          <h3 className="font-semibold text-brand-700 text-lg mb-2">Nothing needs action</h3>
          <p className="text-gray-600 text-sm">Submitted or decided applications are hidden below.</p>
        </div>
      )}

      {decidedApplications.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900"
            onClick={() => setShowDecided((current) => !current)}
          >
            {decidedApplications.length} submitted or decided, hidden from the feed
            {' '}
            <span className="text-brand-700">{showDecided ? 'Hide' : 'Show'}</span>
          </button>

          {showDecided && (
            <div className="mt-3 space-y-2">
              {decidedApplications.map((application) => (
                <ActionRow key={application.id} application={application} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
