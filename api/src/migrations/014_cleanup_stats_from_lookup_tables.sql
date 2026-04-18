-- Migration: Clean up stats from lookup tables
-- Description: Remove statistics fields from scraper_categories and scholarship_sources
--              Stats should only live in finder_jobs table
-- Dependencies: 012_add_scholarships_tables.sql, 013_add_category_tables.sql

-- ============================================================================
-- 1. Clean up scraper_categories - Remove stats fields
-- ============================================================================

-- Remove stats fields from scraper_categories
-- This table should ONLY hold category configuration (names, keywords, enabled)
ALTER TABLE scraper_categories
  DROP COLUMN IF EXISTS total_scholarships_found,
  DROP COLUMN IF EXISTS last_scraped_at,
  DROP COLUMN IF EXISTS average_success_rate;

COMMENT ON TABLE scraper_categories IS 'Category configuration for scholarship discovery (STEM, Arts, etc.) - lookup table only';

-- ============================================================================
-- 2. Clean up scholarship_sources - Remove stats fields
-- ============================================================================

-- Remove stats fields from scholarship_sources
-- This table should ONLY hold source configuration
-- Stats are tracked per-run in finder_jobs table
ALTER TABLE scholarship_sources
  DROP COLUMN IF EXISTS last_scraped_at,
  DROP COLUMN IF EXISTS total_scholarships_found,
  DROP COLUMN IF EXISTS success_rate,
  DROP COLUMN IF EXISTS average_response_time,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS error_count,
  DROP COLUMN IF EXISTS last_error,
  DROP COLUMN IF EXISTS last_error_at;

COMMENT ON TABLE scholarship_sources IS 'Source configuration for scrapers (websites, APIs) - lookup table only';

-- ============================================================================
-- Summary of Table Responsibilities
-- ============================================================================

-- scraper_categories:     Category configuration ONLY (name, slug, keywords, enabled, priority)
-- scholarship_sources:    Source configuration ONLY (name, url, scraper_class, enabled, priority)
-- finder_jobs:            ALL execution stats (status, timestamps, scholarships found, errors, etc.)

-- To get stats:
--   - Per category: SELECT category, SUM(scholarships_found) FROM finder_jobs GROUP BY category
--   - Per source:   SELECT source_id, SUM(scholarships_found) FROM finder_jobs GROUP BY source_id
--   - Recent runs:  SELECT * FROM finder_jobs ORDER BY created_at DESC LIMIT 10
