-- Migration 011: Remove portal_deadline from recommendation_collaborations
-- This migration removes the redundant portal_deadline field since next_action_due_date
-- in the base collaborations table serves the same purpose for all collaboration types.

-- Drop the portal_deadline column from recommendation_collaborations
ALTER TABLE public.recommendation_collaborations
  DROP COLUMN IF EXISTS portal_deadline;

-- Add comment to document the change
COMMENT ON TABLE public.recommendation_collaborations IS 'Type-specific data for recommendation collaborations. Use next_action_due_date in collaborations table for deadline tracking.';
