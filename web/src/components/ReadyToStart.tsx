import { CalendarDays, ChevronRight, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineBadgeLabel, getDeadlineDaysRemaining } from '../utils/deadline';
import { isReadyToStartApplication, sortReadyToStartApplications } from '../utils/readyToStart';

interface ReadyToStartProps {
  applications: ApplicationResponse[];
}

const NEW_BADGE_DAYS = 7;

function isNewApplication(application: ApplicationResponse): boolean {
  const daysSinceCreated = getDeadlineDaysRemaining(application.createdAt);
  return daysSinceCreated !== null && daysSinceCreated >= -NEW_BADGE_DAYS && daysSinceCreated <= 0;
}

export default function ReadyToStart({ applications }: ReadyToStartProps) {
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
            className="w-full rounded-lg border border-blue-100 bg-white px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
            onClick={() => navigate(`/applications/${application.id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <PlayCircle size={18} aria-hidden />
              </div>

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

              <ChevronRight size={18} className="text-gray-400 shrink-0" aria-hidden />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
