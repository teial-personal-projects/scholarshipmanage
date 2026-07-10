-- Migration 019: Add awaiting_review as an essay status.

ALTER TABLE public.essays
  DROP CONSTRAINT IF EXISTS essays_status_check;

ALTER TABLE public.essays
  ADD CONSTRAINT essays_status_check
  CHECK (status IN ('not_started', 'in_progress', 'awaiting_review', 'completed'));
