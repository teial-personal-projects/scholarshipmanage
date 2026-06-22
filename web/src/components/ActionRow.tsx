import { SquarePen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineBadgeLabel, getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { deriveNextAction } from '../utils/deriveNextAction';

interface ActionRowProps {
  application: ApplicationResponse;
  onOpen?: (application: ApplicationResponse) => void;
}

const urgencyStyles: Record<DeadlineUrgency, string> = {
  overdue: 'border-l-red-500',
  critical: 'border-l-orange-500',
  warning: 'border-l-amber-400',
  normal: 'border-l-gray-200',
};

export default function ActionRow({ application, onOpen }: ActionRowProps) {
  const navigate = useNavigate();
  const urgency = getDeadlineUrgency(application.dueDate, application.status);
  const urgencyLabel = getDeadlineBadgeLabel(application.dueDate, application.status);
  const nextAction = deriveNextAction(application);
  const isWaiting = nextAction.kind === 'waiting';

  return (
    <button
      type="button"
      aria-label={`Edit ${application.scholarshipName}`}
      className={`h-full min-h-32 w-full text-left border border-gray-200 border-l-4 rounded-lg bg-white p-4 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 ${
        urgencyStyles[urgency]
      } ${isWaiting ? 'opacity-75' : ''}`}
      onClick={() => {
        if (onOpen) {
          onOpen(application);
          return;
        }

        navigate(`/applications/${application.id}`);
      }}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{application.scholarshipName}</p>
            {application.organization && (
              <p className="text-sm text-gray-600 truncate">{application.organization}</p>
            )}
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 shrink-0">
            <SquarePen size={16} aria-hidden />
          </span>
        </div>

        <div className="space-y-3">
          {nextAction.label && (
            <p className={`text-sm line-clamp-2 ${isWaiting ? 'text-gray-500' : 'text-brand-700 font-medium'}`}>
              {nextAction.label}
            </p>
          )}
          {urgencyLabel && (
            <span className="badge badge-gray">{urgencyLabel}</span>
          )}
        </div>
      </div>
    </button>
  );
}
