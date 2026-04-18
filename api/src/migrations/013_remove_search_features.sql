-- Migration: Remove User-Facing Search Features
-- Description: Removes tables related to user scholarship search and interactions
-- Reason: Ethical concerns - many scholarship sites prohibit scraping and require authentication
-- Note: Keeps scraper infrastructure (scholarships, scholarship_sources, finder_jobs tables)
-- Dependencies: 012_add_scholarships_tables.sql, 001_users_profiles.sql

-- ============================================================================
-- Background & Rationale
-- ============================================================================
--
-- This migration removes user-facing scholarship search features while preserving
-- the underlying scholarship scraper infrastructure. The scraper tables remain for:
-- - Internal research and data analysis
-- - Potential future official partnerships with scholarship providers
-- - Code reuse in other features
--
-- Tables being removed:
-- 1. user_scholarships - Tracked user interactions (saves, views, dismissals)
-- 2. user_search_preferences - Stored user search criteria and preferences
--
-- Tables being preserved:
-- 1. scholarships - Core scholarship data (populated by scrapers)
-- 2. scholarship_sources - Scraper source configuration
-- 3. finder_jobs - Scraper execution tracking
--
-- See WHY_NO_SEARCH.md for full explanation of ethical considerations
--
-- ============================================================================

-- ============================================================================
-- 1. Drop User Scholarships Table
-- ============================================================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can delete own scholarship interactions" ON user_scholarships;
DROP POLICY IF EXISTS "Users can update own scholarship interactions" ON user_scholarships;
DROP POLICY IF EXISTS "Users can insert own scholarship interactions" ON user_scholarships;
DROP POLICY IF EXISTS "Users can view own scholarship interactions" ON user_scholarships;

-- Drop trigger
DROP TRIGGER IF EXISTS update_user_scholarships_updated_at ON user_scholarships;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_scholarships_match_score;
DROP INDEX IF EXISTS idx_user_scholarships_status;
DROP INDEX IF EXISTS idx_user_scholarships_scholarship_id;
DROP INDEX IF EXISTS idx_user_scholarships_user_id;

-- Drop table
DROP TABLE IF EXISTS user_scholarships CASCADE;

COMMENT ON TABLE scholarships IS 'Stores scholarship opportunities discovered from various sources (for internal/research use only - not exposed to end users)';

-- ============================================================================
-- 2. Drop User Search Preferences Table
-- ============================================================================

-- Drop RLS policies if they exist
DROP POLICY IF EXISTS "Users can view own search preferences" ON user_search_preferences;
DROP POLICY IF EXISTS "Users can update own search preferences" ON user_search_preferences;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_user_search_preferences_updated_at ON user_search_preferences;

-- Drop table
DROP TABLE IF EXISTS public.user_search_preferences CASCADE;

-- ============================================================================
-- 3. Update Scholarship Sources for Resources Page
-- ============================================================================

-- Only update scholarship_sources if it exists (migration 012 must be run first)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'scholarship_sources'
  ) THEN
    -- Add columns to support the scholarship resources page
    -- This will allow us to display trusted scholarship search websites to users
    ALTER TABLE scholarship_sources
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS category VARCHAR(100), -- General, STEM, Arts, etc.
      ADD COLUMN IF NOT EXISTS requires_auth BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

    -- Update display name to match name if not set
    UPDATE scholarship_sources
    SET display_name = name
    WHERE display_name IS NULL;

    -- Add helpful descriptions to existing sources
    UPDATE scholarship_sources
    SET
      description = CASE name
        WHEN 'CollegeScholarships' THEN 'Comprehensive database of college scholarships with detailed filtering options.'
        WHEN 'CareerOneStop' THEN 'U.S. Department of Labor''s official scholarship finder with verified opportunities.'
        ELSE 'Scholarship search and discovery platform.'
      END,
      category = 'General',
      requires_auth = false,
      is_free = true
    WHERE description IS NULL;

    -- Create index for resources page queries only if status column exists
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'scholarship_sources'
      AND column_name = 'status'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_scholarship_sources_status_enabled ON scholarship_sources(status, enabled);
    ELSE
      -- If status doesn't exist, just index on enabled
      CREATE INDEX IF NOT EXISTS idx_scholarship_sources_enabled ON scholarship_sources(enabled);
    END IF;

    RAISE NOTICE 'Updated scholarship_sources table for resources page';
  ELSE
    RAISE NOTICE 'scholarship_sources table does not exist - skipping enhancement (migration 012 may not have been run)';
  END IF;
END $$;

-- ============================================================================
-- 4. Add Migration Tracking
-- ============================================================================

-- Update comments on tables if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'scholarship_sources'
  ) THEN
    COMMENT ON TABLE scholarship_sources IS 'Manages scholarship sources - can be used for both scraper configuration and displaying trusted scholarship search websites to users';
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'scholarships'
  ) THEN
    COMMENT ON TABLE scholarships IS 'Scholarship data from various sources. Note: User-facing search features removed in migration 013. This data is preserved for internal/research purposes and potential future official partnerships.';
  END IF;
END $$;

-- ============================================================================
-- End of Migration
-- ============================================================================

-- Verification queries (run manually to verify migration success):
--
-- -- Verify user_scholarships table is gone:
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_scholarships');
--
-- -- Verify user_search_preferences table is gone:
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_search_preferences');
--
-- -- Verify scraper tables still exist:
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scholarships');
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scholarship_sources');
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'finder_jobs');
--
-- -- Verify new columns added to scholarship_sources:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'scholarship_sources'
-- AND column_name IN ('display_name', 'description', 'category', 'requires_auth', 'is_free', 'logo_url', 'tags');
