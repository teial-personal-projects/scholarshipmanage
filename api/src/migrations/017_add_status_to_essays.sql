-- Migration 017: Add status to essays
-- Essay progress is driven only by this explicit status.

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started'
  CHECK (status IN ('not_started', 'in_progress', 'completed'));
