-- Migration 009: Reminder Tracking
-- Adds last_reminder_sent_at fields to applications and collaborations tables
-- Enables better tracking and prevents duplicate reminders within 24 hours

-- Add last_reminder_sent_at to applications table
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Add last_reminder_sent_at to collaborations table
ALTER TABLE public.collaborations
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Create indexes for performance (querying reminders checks this field)
CREATE INDEX IF NOT EXISTS idx_applications_last_reminder_sent_at
  ON public.applications(last_reminder_sent_at);

CREATE INDEX IF NOT EXISTS idx_collaborations_last_reminder_sent_at
  ON public.collaborations(last_reminder_sent_at);

-- Comments for documentation
COMMENT ON COLUMN public.applications.last_reminder_sent_at IS 'Timestamp when the last reminder email was sent for this application. Used to prevent duplicate reminders within 24 hours.';
COMMENT ON COLUMN public.collaborations.last_reminder_sent_at IS 'Timestamp when the last reminder email was sent for this collaboration. Used to prevent duplicate reminders within 24 hours.';

-- Note: The reminder service will:
-- 1. Check this field before sending a reminder
-- 2. Only send if last_reminder_sent_at is NULL or more than 24 hours ago
-- 3. Update this field after successfully sending a reminder
