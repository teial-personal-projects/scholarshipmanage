-- Migration 008: Notification Preferences
-- Adds notification preference fields to user_profiles table
-- Allows users to control reminder emails and customize reminder intervals

-- Add notification preference columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS application_reminders_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS collaboration_reminders_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_intervals JSONB DEFAULT '{"application": [7, 3, 1], "collaboration": [7, 3, 1]}'::jsonb;

-- Comments for documentation
COMMENT ON COLUMN public.user_profiles.application_reminders_enabled IS 'Whether to send reminder emails for application due dates';
COMMENT ON COLUMN public.user_profiles.collaboration_reminders_enabled IS 'Whether to send reminder emails for collaboration due dates';
COMMENT ON COLUMN public.user_profiles.reminder_intervals IS 'Custom reminder intervals in days before due date. Format: {"application": [7, 3, 1], "collaboration": [7, 3, 1]}';

-- Note: No need for new routes - these fields can be updated via existing user profile endpoints
-- Frontend can add a notification preferences section to the user settings/profile page
