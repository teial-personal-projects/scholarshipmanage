-- Migration 016: Remove essay_id from essay_review_collaborations
-- Purpose: Essay review collaborations no longer link to a specific essay row.

-- Drop index that depended on essay_id (created in 004_collaborators.sql)
DROP INDEX IF EXISTS public.idx_essay_review_essay;

-- If any collaboration somehow has multiple essay_review_collaborations rows,
-- keep the most recent row and delete the rest. This prevents the UNIQUE
-- constraint on (collaboration_id) from failing below.
DELETE FROM public.essay_review_collaborations a
USING public.essay_review_collaborations b
WHERE a.collaboration_id = b.collaboration_id
  AND a.id < b.id;

-- Drop the uniqueness constraint on (collaboration_id, essay_id)
ALTER TABLE public.essay_review_collaborations
  DROP CONSTRAINT IF EXISTS essay_review_collaborations_collaboration_id_essay_id_key;

-- Drop the essay_id column (and any dependent FK)
ALTER TABLE public.essay_review_collaborations
  DROP COLUMN IF EXISTS essay_id;

-- Enforce one-to-one relationship with collaborations (one row per collaboration)
ALTER TABLE public.essay_review_collaborations
  ADD CONSTRAINT essay_review_collaborations_collaboration_id_key UNIQUE (collaboration_id);

COMMENT ON TABLE public.essay_review_collaborations IS
  'Type-specific data for essay review collaborations (one row per collaboration; no essay_id link)';

