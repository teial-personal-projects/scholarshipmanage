-- Migration: Add Scraper Categories Table
-- Description: Stores categories for scholarship discovery (STEM, Arts, Healthcare, etc.)
-- Dependencies: None

-- ============================================================================
-- Scraper Categories Table
-- Stores categories for scholarship discovery (STEM, Arts, Healthcare, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraper_categories (
  id SERIAL PRIMARY KEY,

  -- Category Info
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,  -- URL-friendly identifier
  description TEXT,

  -- Configuration
  enabled BOOLEAN DEFAULT TRUE,  -- Whether to scrape this category
  priority INTEGER DEFAULT 5,    -- 1-10, higher = more important

  -- Search Keywords (for AI discovery)
  keywords JSONB DEFAULT '[]'::jsonb,  -- Array of search keywords

  -- Performance Metrics
  total_scholarships_found INTEGER DEFAULT 0,
  last_scraped_at TIMESTAMP,
  average_success_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scraper_categories_enabled ON scraper_categories(enabled);
CREATE INDEX IF NOT EXISTS idx_scraper_categories_slug ON scraper_categories(slug);
CREATE INDEX IF NOT EXISTS idx_scraper_categories_priority ON scraper_categories(priority DESC);

-- Enable Row Level Security
ALTER TABLE scraper_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view categories (for frontend)
CREATE POLICY "Anyone can view categories"
  ON scraper_categories
  FOR SELECT
  USING (true);

-- Admin can manage categories (using service role key)
-- This is enforced at the application level

COMMENT ON TABLE scraper_categories IS 'Manages scholarship discovery categories and their search keywords';

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER update_scraper_categories_updated_at
  BEFORE UPDATE ON scraper_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data: Migrate from source_categories.json
-- Note: IDs are auto-generated (SERIAL), not using JSON file IDs
-- ============================================================================
INSERT INTO scraper_categories (name, slug, enabled, priority, keywords, description)
VALUES
  (
    'STEM',
    'stem',
    true,
    10,
    '["engineering", "computer science", "information technology", "cybersecurity", "data science", "artificial intelligence", "machine learning", "robotics", "STEM", "Science", "Math"]'::jsonb,
    'Science, Technology, Engineering, and Mathematics scholarships'
  ),
  (
    'Arts',
    'arts',
    true,
    8,
    '["art", "arts", "fine arts", "visual arts", "graphic design", "painting", "sculpture", "photography", "digital art", "art history", "studio art", "creative arts"]'::jsonb,
    'Fine arts, visual arts, and creative arts scholarships'
  ),
  (
    'Music',
    'music',
    true,
    8,
    '["music", "music education", "music performance", "music theory", "music composition", "orchestra", "band", "choir", "jazz", "music production", "audio engineering", "sound design"]'::jsonb,
    'Music performance, education, and production scholarships'
  ),
  (
    'Healthcare & Medical',
    'healthcare-medical',
    false,
    7,
    '["healthcare", "medical", "hospital", "biomedical", "registered nurse", "nursing", "nursing school"]'::jsonb,
    'Healthcare, medical, and nursing scholarships'
  ),
  (
    'Financial Services',
    'financial-services',
    false,
    6,
    '["economics", "financial", "banking", "insurance", "investment", "finance"]'::jsonb,
    'Finance, banking, and economics scholarships'
  ),
  (
    'Law',
    'law',
    false,
    7,
    '["law", "legal", "law school", "jurisprudence", "attorney", "lawyer", "paralegal", "legal studies", "pre-law", "criminal justice", "criminal law", "corporate law", "forensics"]'::jsonb,
    'Law, legal studies, and criminal justice scholarships'
  )
ON CONFLICT (slug) DO NOTHING;
