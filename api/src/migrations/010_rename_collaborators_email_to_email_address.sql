-- Migration 010: Rename collaborators.email to email_address
-- This migration renames the email column to email_address for consistency with other tables

-- Rename the column
ALTER TABLE public.collaborators 
  RENAME COLUMN email TO email_address;

-- Update the comment if it exists (optional, for documentation)
COMMENT ON COLUMN public.collaborators.email_address IS 'Email address of the collaborator';

