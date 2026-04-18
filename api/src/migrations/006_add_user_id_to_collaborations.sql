-- Migration: Add user_id to collaborations table
-- Purpose: Add direct foreign key to user_profiles for efficient querying and RLS
-- Date: 2025-11-29

-- Step 1: Add user_id column to collaborations table
ALTER TABLE public.collaborations
ADD COLUMN user_id BIGINT;

-- Step 2: Populate user_id from application_id
-- This backfills the user_id for existing collaborations
UPDATE public.collaborations c
SET user_id = a.user_id
FROM public.applications a
WHERE c.application_id = a.id;

-- Step 3: Make user_id NOT NULL and add foreign key constraint
ALTER TABLE public.collaborations
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.collaborations
ADD CONSTRAINT collaborations_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Step 4: Create index on user_id for performance
CREATE INDEX idx_collaborations_user_id ON public.collaborations(user_id);

-- Step 5: Drop old RLS policies
DROP POLICY IF EXISTS "Users can view own collaborations" ON public.collaborations;
DROP POLICY IF EXISTS "Users can insert own collaborations" ON public.collaborations;
DROP POLICY IF EXISTS "Users can update own collaborations" ON public.collaborations;
DROP POLICY IF EXISTS "Users can delete own collaborations" ON public.collaborations;

-- Step 6: Create new RLS policies using user_id
CREATE POLICY "Users can view own collaborations" ON public.collaborations
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own collaborations" ON public.collaborations
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own collaborations" ON public.collaborations
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own collaborations" ON public.collaborations
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- Step 7: Add comment
COMMENT ON COLUMN public.collaborations.user_id IS 'Foreign key to user_profiles - owner of the collaboration (student)';

-- Verification queries (run these to verify the migration):
-- SELECT COUNT(*) FROM public.collaborations WHERE user_id IS NULL;  -- Should return 0
-- SELECT c.id, c.user_id, a.user_id FROM public.collaborations c JOIN public.applications a ON c.application_id = a.id WHERE c.user_id != a.user_id;  -- Should return 0
