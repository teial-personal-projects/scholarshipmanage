import { useState } from 'react';

import { isApplicationDone, type ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineDaysRemaining, getDeadlineUrgency } from '../utils/deadline';
import { deriveNextAction } from '../utils/deriveNextAction';
import ActionRow from './ActionRow';

interface ActionFeedProps {
  applications: ApplicationResponse[];
  onApplicationOpen?: (application: ApplicationResponse) => void;
  onDelete?: (id: number) => Promise<void>;
}

interface FeedGroup {
  key: string;
  title: string;
  applications: ApplicationResponse[];
}

const LATER_PREVIEW_LIMIT = 4;

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
    (application) => !isApplicationDone(application.status),
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

export default function ActionFeed({ applications, onApplicationOpen, onDelete }: ActionFeedProps) {
  const [showDecided, setShowDecided] = useState(false);
  const [showAllLater, setShowAllLater] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const decidedApplications = applications.filter((application) => isApplicationDone(application.status));
  const groups = groupApplications(applications);
  const hasActionableApplications = groups.length > 0;

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="font-semibold text-brand-700 text-lg mb-2">No actions yet</h3>
        <p className="text-gray-600 text-sm">Create an application to start tracking next steps.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hasActionableApplications ? (
        groups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.key);
          const canShowMore = group.key === 'later' && group.applications.length > LATER_PREVIEW_LIMIT;
          const visibleApplications = canShowMore && !showAllLater
            ? group.applications.slice(0, LATER_PREVIEW_LIMIT)
            : group.applications;
          const hiddenApplicationCount = group.applications.length - visibleApplications.length;
          const showGroupHeading = !(groups.length === 1 && group.key === 'later');

          return (
            <section key={group.key} className="space-y-2">
              {(showGroupHeading || canShowMore) && (
                <div className="flex items-center justify-between gap-3">
                  {showGroupHeading ? (
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wide">{group.title}</h3>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-bold uppercase text-gray-500 tracking-wide hover:text-gray-700"
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.title}`}
                        aria-expanded={!isCollapsed}
                        onClick={() => toggleGroup(group.key)}
                      >
                        {isCollapsed ? '▶' : '▼'}
                        {`(${group.applications.length})`}
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}
                  {canShowMore && !isCollapsed && (
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-800 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-100"
                      onClick={() => setShowAllLater((current) => !current)}
                    >
                      {showAllLater ? 'Show fewer' : `Show ${hiddenApplicationCount} more`}
                    </button>
                  )}
                </div>
              )}
              {!isCollapsed && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleApplications.map((application) => (
                    <ActionRow
                      key={application.id}
                      application={application}
                      onOpen={onApplicationOpen}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })
      ) : (
        <div className="text-center py-10">
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
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {decidedApplications.map((application) => (
                <ActionRow
                  key={application.id}
                  application={application}
                  onOpen={onApplicationOpen}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
