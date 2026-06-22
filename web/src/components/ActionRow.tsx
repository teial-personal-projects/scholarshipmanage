import { useState } from 'react';
import { SquarePen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { getDeadlineBadgeLabel, getDeadlineUrgency, type DeadlineUrgency } from '../utils/deadline';
import { parseDateOnlyToLocalDate } from '../utils/date';
import { deriveNextAction } from '../utils/deriveNextAction';

interface ActionRowProps {
  application: ApplicationResponse;
  onOpen?: (application: ApplicationResponse) => void;
  onDelete?: (id: number) => Promise<void>;
}

const urgencyStyles: Record<DeadlineUrgency, string> = {
  overdue: 'border-l-red-500',
  critical: 'border-l-orange-500',
  warning: 'border-l-amber-400',
  normal: 'border-l-gray-200',
};

function formatDueDate(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  const parsed = parseDateOnlyToLocalDate(dueDate);
  if (!parsed) return null;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ActionRow({ application, onOpen, onDelete }: ActionRowProps) {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const urgency = getDeadlineUrgency(application.dueDate, application.status);
  const urgencyLabel = getDeadlineBadgeLabel(application.dueDate, application.status);
  const dateLabel = formatDueDate(application.dueDate);
  const nextAction = deriveNextAction(application);
  const isWaiting = nextAction.kind === 'waiting';

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
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`relative h-full min-h-32 w-full border border-gray-200 border-l-4 rounded-lg bg-white shadow-sm ${urgencyStyles[urgency]} ${isWaiting ? 'opacity-75' : ''}`}>
      {/* Full-card click overlay */}
      <button
        type="button"
        aria-label={`Edit ${application.scholarshipName}`}
        className="absolute inset-0 w-full h-full rounded-lg hover:bg-gray-50/80 transition-colors"
        onClick={handleOpen}
      />

      {/* Card content — pointer-events-none so the overlay button catches clicks */}
      <div className="relative z-10 pointer-events-none p-4 flex flex-col h-full justify-between gap-4">
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

        <div className="space-y-2">
          {nextAction.label && (
            <p className={`text-sm line-clamp-2 ${isWaiting ? 'text-gray-500' : 'text-brand-700 font-medium'}`}>
              {nextAction.label}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {urgencyLabel && <span className="badge badge-gray">{urgencyLabel}</span>}
            {dateLabel && <span className="text-xs text-gray-500">{dateLabel}</span>}
          </div>
        </div>
      </div>

      {/* Delete button — above the overlay */}
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${application.scholarshipName}`}
          className="absolute bottom-3 right-3 z-20 text-red-300 hover:text-red-600 transition-colors disabled:opacity-40"
          disabled={deletingId === application.id}
          onClick={handleDelete}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
