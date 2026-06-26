import { useState } from 'react';
import { SquarePen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

import {
  getDeadlineBadgeLabel,
  getDeadlineDaysRemaining,
  getDeadlineUrgency,
  type DeadlineUrgency,
} from '../utils/deadline';
import { parseDateOnlyToLocalDate } from '../utils/date';
import { deriveNextAction } from '../utils/deriveNextAction';
import { formatMinimumAwardAmount } from '../utils/award';
import { getPendingWorkChips } from '../utils/pendingWork';
import { useToastHelpers } from '../utils/toast';

interface ActionRowProps {
  application: ApplicationResponse;
  onOpen?: (application: ApplicationResponse) => void;
  onDelete?: (id: number) => Promise<void>;
}

const urgencyStyles: Record<DeadlineUrgency, string> = {
  overdue: 'border-l-red-500',
  critical: 'border-l-orange-600',
  warning: 'border-l-yellow-400',
  normal: 'border-l-gray-200',
};
const FAR_FUTURE_DEADLINE_DAYS = 100;

function getDeadlineBorderStyle(application: ApplicationResponse): string {
  const urgency = getDeadlineUrgency(application.dueDate, application.status);
  if (urgency !== 'normal') return urgencyStyles[urgency];
  if (application.status === 'Not Started') return 'border-l-blue-500';
  return urgencyStyles.normal;
}

function formatDueDate(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  const parsed = parseDateOnlyToLocalDate(dueDate);
  if (!parsed) return null;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ActionRow({ application, onOpen, onDelete }: ActionRowProps) {
  const navigate = useNavigate();
  const { showError } = useToastHelpers();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deadlineBorderStyle = getDeadlineBorderStyle(application);
  const daysRemaining = getDeadlineDaysRemaining(application.dueDate);
  const hasFarFutureDeadline = daysRemaining !== null && daysRemaining > FAR_FUTURE_DEADLINE_DAYS;
  const urgencyLabel = hasFarFutureDeadline ? null : getDeadlineBadgeLabel(application.dueDate, application.status);
  const dateLabel = hasFarFutureDeadline ? null : formatDueDate(application.dueDate);
  const nextAction = deriveNextAction(application);
  const actionLabel = hasFarFutureDeadline ? 'Start Application' : nextAction.label;
  const isWaiting = nextAction.kind === 'waiting';
  const pendingWorkChips = hasFarFutureDeadline ? [] : getPendingWorkChips(application);
  const minimumAwardAmount = formatMinimumAwardAmount(application);

  const handleOpen = () => {
    if (onOpen) { onOpen(application); return; }
    navigate(`/applications/${application.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    setDeletingId(application.id);
    try {
      await onDelete(application.id);
    } catch {
      showError('Delete failed', 'We could not delete that application. Please try again.', 5000);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`relative h-full min-h-28 w-full border border-gray-200 border-l-4 rounded-lg bg-white shadow-sm ${deadlineBorderStyle} ${isWaiting ? 'opacity-75' : ''}`}>
      {/* Full-card click overlay */}
      <button
        type="button"
        aria-label={`Edit ${application.scholarshipName}`}
        className="absolute inset-0 w-full h-full rounded-lg hover:bg-gray-50/80 transition-colors"
        onClick={handleOpen}
      />

      {/* Card content — pointer-events-none so the overlay button catches clicks */}
      <div className="relative z-10 pointer-events-none p-3 flex flex-col h-full justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{application.scholarshipName}</p>
            {application.organization && (
              <p className="text-xs text-gray-600 truncate">{application.organization}</p>
            )}
            <p className="text-xs font-semibold text-brand-700">{minimumAwardAmount}</p>
          </div>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 shrink-0">
            <SquarePen size={14} aria-hidden />
          </span>
        </div>

        <div className="space-y-1.5">
          {actionLabel && (
            <p className={`text-sm line-clamp-1 ${isWaiting ? 'text-gray-500' : 'text-brand-700 font-medium'}`}>
              {actionLabel}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {urgencyLabel && <span className="badge badge-gray">{urgencyLabel}</span>}
            {pendingWorkChips.map((chip) => (
              <span key={chip.key} className="badge bg-amber-50 text-amber-800 border border-amber-200">
                {chip.label}
              </span>
            ))}
            {dateLabel && <span className="text-xs text-gray-500">{dateLabel}</span>}
          </div>
        </div>
      </div>

      {/* Delete button — above the overlay */}
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${application.scholarshipName}`}
          className="absolute bottom-2.5 right-2.5 z-20 text-red-300 hover:text-red-600 transition-colors disabled:opacity-40"
          disabled={deletingId === application.id}
          onClick={handleDelete}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
