import { CalendarDays, SquarePen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineBadgeLabel, getDeadlineDaysRemaining } from '../utils/deadline';
import { isReadyToStartApplication, sortReadyToStartApplications } from '../utils/readyToStart';

interface ReadyToStartProps {
  applications: ApplicationResponse[];
  onApplicationOpen?: (application: ApplicationResponse) => void;
}

const NEW_BADGE_DAYS = 7;

function isNewApplication(application: ApplicationResponse): boolean {
  const daysSinceCreated = getDeadlineDaysRemaining(application.createdAt);
  return daysSinceCreated !== null && daysSinceCreated >= -NEW_BADGE_DAYS && daysSinceCreated <= 0;
}

export default function ReadyToStart({ applications, onApplicationOpen }: ReadyToStartProps) {
  const navigate = useNavigate();
  const readyApplications = sortReadyToStartApplications(
    applications.filter(isReadyToStartApplication),
  );

  if (readyApplications.length === 0) return null;

  return (
    <section className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-blue-800">Ready to start</h3>
          <p className="text-xs text-blue-700">New opportunities outside the urgent deadline window.</p>
        </div>
        <span className="badge badge-blue">{readyApplications.length}</span>
      </div>

      <div className="space-y-2">
        {readyApplications.map((application) => (
          <button
            key={application.id}
            type="button"
            aria-label={`Edit ${application.scholarshipName}`}
            className="w-full rounded-lg border border-blue-100 bg-white px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
            onClick={() => {
              if (onApplicationOpen) {
                onApplicationOpen(application);
                return;
              }

              navigate(`/applications/${application.id}`);
            }}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{application.scholarshipName}</p>
                    {application.organization && (
                      <p className="text-sm text-gray-600 truncate">{application.organization}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isNewApplication(application) && <span className="badge badge-blue">New</span>}
                    <span className="badge badge-gray inline-flex items-center gap-1">
                      <CalendarDays size={12} aria-hidden />
                      {getDeadlineBadgeLabel(application.dueDate, application.status) ?? 'No deadline'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-blue-700 font-medium mt-1">Start application</p>
              </div>

              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 shrink-0">
                <SquarePen size={16} aria-hidden />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
