import { AlertTriangle, ChevronRight, Clock, Flag, Hourglass, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineBadgeLabel, getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { deriveNextAction, type ActionKind } from '../utils/deriveNextAction';

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

const urgencyIconStyles: Record<DeadlineUrgency, string> = {
  overdue: 'text-red-600 bg-red-50',
  critical: 'text-orange-600 bg-orange-50',
  warning: 'text-amber-600 bg-amber-50',
  normal: 'text-gray-500 bg-gray-50',
};

const actionIconStyles: Record<ActionKind, string> = {
  essays: 'text-purple-600 bg-purple-50',
  submit: 'text-brand-700 bg-green-50',
  start: 'text-blue-600 bg-blue-50',
  waiting: 'text-gray-500 bg-gray-100',
  none: 'text-gray-500 bg-gray-100',
};

function getIconContainerStyle(kind: ActionKind, urgency: DeadlineUrgency): string {
  if (kind === 'waiting') return actionIconStyles.waiting;
  if (urgency !== 'normal') return urgencyIconStyles[urgency];
  return actionIconStyles[kind];
}

function getActionIcon(kind: ActionKind, urgency: DeadlineUrgency) {
  if (kind === 'waiting') return Hourglass;
  if (kind === 'start') return Play;
  if (urgency === 'overdue') return AlertTriangle;
  if (urgency === 'critical' || urgency === 'warning') return Clock;
  if (kind === 'submit') return Flag;
  return Clock;
}

export default function ActionRow({ application, onOpen }: ActionRowProps) {
  const navigate = useNavigate();
  const urgency = getDeadlineUrgency(application.dueDate, application.status);
  const urgencyLabel = getDeadlineBadgeLabel(application.dueDate, application.status);
  const nextAction = deriveNextAction(application);
  const Icon = getActionIcon(nextAction.kind, urgency);
  const isWaiting = nextAction.kind === 'waiting';

  return (
    <button
      type="button"
      className={`w-full text-left border border-l-4 rounded-lg bg-white px-4 py-3 transition-colors hover:border-gray-300 hover:bg-gray-50 ${
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
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getIconContainerStyle(
          nextAction.kind,
          urgency,
        )}`}
        >
          <Icon size={18} aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 flex items-baseline gap-2">
              <p className="font-semibold text-gray-900 truncate">{application.scholarshipName}</p>
              {application.organization && (
                <p className="text-sm text-gray-600 truncate shrink-0 max-w-[45%]">
                  {application.organization}
                </p>
              )}
            </div>
            <div className="min-w-0 flex items-center gap-2 sm:justify-end sm:shrink-0 sm:max-w-[52%]">
              {nextAction.label && (
                <p className={`text-sm truncate ${isWaiting ? 'text-gray-500' : 'text-brand-700 font-medium'}`}>
                  {nextAction.label}
                </p>
              )}
              {urgencyLabel && (
                <span className="badge badge-gray shrink-0">{urgencyLabel}</span>
              )}
            </div>
          </div>
        </div>

        <ChevronRight size={18} className="text-gray-400 shrink-0" aria-hidden />
      </div>
    </button>
  );
}
