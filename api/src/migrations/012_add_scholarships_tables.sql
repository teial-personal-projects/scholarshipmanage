-- Migration: Add Scholarships Tables
-- Description: Creates tables for the automated scholarship discovery system
-- Dependencies: 001_users_profiles.sql (for users table)

-- ============================================================================
-- 1. Scholarships Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS scholarships (
  id SERIAL PRIMARY KEY,

  -- Core Information
  name VARCHAR(500) NOT NULL,
  organization VARCHAR(300),
  organization_website TEXT,
  description TEXT,
  eligibility TEXT,
  requirements TEXT,

  -- Award Information
  min_award DECIMAL(10, 2),
  max_award DECIMAL(10, 2),

  -- URLs
  url TEXT NOT NULL,
  application_url TEXT,
  apply_url TEXT, -- Alias for application_url
  source_url TEXT, -- Where we found it

  -- Dates
  deadline DATE,
  deadline_type VARCHAR(50), -- 'fixed', 'rolling', 'varies'
  renewable BOOLEAN DEFAULT FALSE, -- Can be renewed

  -- Classification
  category VARCHAR(100), -- STEM, Business, etc.
  target_type VARCHAR(50), -- Merit, Need-Based, Both
  education_level VARCHAR(100), -- Undergraduate, Graduate, etc.
  field_of_study VARCHAR(200),

  -- Demographics & Restrictions
  ethnicity VARCHAR(100) DEFAULT 'unspecified',
  gender VARCHAR(50) DEFAULT 'unspecified',
  geographic_restrictions TEXT,
  country VARCHAR(50) DEFAULT 'US',

  -- Application Requirements
  essay_required BOOLEAN DEFAULT FALSE,
  recommendation_required BOOLEAN DEFAULT FALSE,

  -- Deduplication
  checksum VARCHAR(64), -- SHA-256 of org+name+amount+deadline

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, expired, invalid
  verified BOOLEAN DEFAULT FALSE,

  -- Metadata
  source_type VARCHAR(50), -- 'scraper', 'ai_discovery', 'manual'
  source_name VARCHAR(100), -- Which scraper/source found it
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TIMESTAMP,
  expires_at TIMESTAMP, -- Auto-calculated from deadline

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_scholarship_url UNIQUE(url),
  CONSTRAINT unique_scholarship_checksum UNIQUE(checksum)
);

-- Indexes for scholarships table
CREATE INDEX IF NOT EXISTS idx_scholarships_checksum ON scholarships(checksum);
CREATE INDEX IF NOT EXISTS idx_scholarships_status ON scholarships(status);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON scholarships(deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_category ON scholarships(category);
CREATE INDEX IF NOT EXISTS idx_scholarships_organization ON scholarships(organization);
CREATE INDEX IF NOT EXISTS idx_scholarships_expires_at ON scholarships(expires_at);
CREATE INDEX IF NOT EXISTS idx_scholarships_discovered_at ON scholarships(discovered_at);
CREATE INDEX IF NOT EXISTS idx_scholarships_target_type ON scholarships(target_type);
CREATE INDEX IF NOT EXISTS idx_scholarships_ethnicity ON scholarships(ethnicity);
CREATE INDEX IF NOT EXISTS idx_scholarships_gender ON scholarships(gender);
CREATE INDEX IF NOT EXISTS idx_scholarships_country ON scholarships(country);
CREATE INDEX IF NOT EXISTS idx_scholarships_education_level ON scholarships(education_level);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline_target_type ON scholarships(deadline, target_type);
CREATE INDEX IF NOT EXISTS idx_scholarships_education_level_target_type ON scholarships(education_level, target_type);
CREATE INDEX IF NOT EXISTS idx_scholarships_organization_deadline ON scholarships(organization, deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_ethnicity_gender ON scholarships(ethnicity, gender);
CREATE INDEX IF NOT EXISTS idx_scholarships_country_education_level ON scholarships(country, education_level);

-- Enable Row Level Security
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scholarships
-- Anyone can view active scholarships
CREATE POLICY "Anyone can view active scholarships"
  ON scholarships
  FOR SELECT
  USING (status = 'active');

-- Only admins can insert/update/delete scholarships (using service role key)
-- This will be enforced at the application level

COMMENT ON TABLE scholarships IS 'Stores scholarship opportunities discovered from various sources';

-- ============================================================================
-- 2. Scholarship Sources Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS scholarship_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  source_type VARCHAR(50), -- 'website', 'search_engine', 'api'

  -- Scraping Configuration
  scraper_class VARCHAR(100), -- Python class name
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important

  -- Rate Limiting
  rate_limit_per_hour INTEGER DEFAULT 100,
  last_scraped_at TIMESTAMP,

  -- Performance Metrics
  total_scholarships_found INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 100.00,
  average_response_time INTEGER, -- milliseconds

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE scholarship_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can access scholarship sources
-- This prevents users from seeing backend scraper configuration

COMMENT ON TABLE scholarship_sources IS 'Manages scholarship scraper sources and their configurations';

-- ============================================================================
-- 3. Finder Jobs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS finder_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL, -- 'scraper', 'ai_discovery', 'expiration_check'
  source_id INTEGER REFERENCES scholarship_sources(id) ON DELETE SET NULL,

  -- Execution
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,

  -- Results
  scholarships_found INTEGER DEFAULT 0,
  scholarships_new INTEGER DEFAULT 0,
  scholarships_updated INTEGER DEFAULT 0,
  scholarships_expired INTEGER DEFAULT 0,

  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  config JSONB, -- Job-specific configuration
  results JSONB, -- Detailed results

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for finder_jobs
CREATE INDEX IF NOT EXISTS idx_finder_jobs_status ON finder_jobs(status);
CREATE INDEX IF NOT EXISTS idx_finder_jobs_created_at ON finder_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_finder_jobs_job_type ON finder_jobs(job_type);

-- Enable Row Level Security
ALTER TABLE finder_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can access finder jobs
-- This is internal tracking information

COMMENT ON TABLE finder_jobs IS 'Tracks scholarship finder job executions and results';

-- ============================================================================
-- 4. User Scholarships Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_scholarships (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  scholarship_id INTEGER NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) DEFAULT 'suggested', -- suggested, viewed, saved, applied, dismissed

  -- Interaction
  viewed_at TIMESTAMP,
  saved_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  notes TEXT,

  -- Matching
  match_score DECIMAL(5, 2), -- 0-100, how well it matches user preferences
  match_reasons JSONB, -- Why it was suggested

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_user_scholarship UNIQUE(user_id, scholarship_id)
);

-- Indexes for user_scholarships
CREATE INDEX IF NOT EXISTS idx_user_scholarships_user_id ON user_scholarships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scholarships_scholarship_id ON user_scholarships(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_user_scholarships_status ON user_scholarships(status);
CREATE INDEX IF NOT EXISTS idx_user_scholarships_match_score ON user_scholarships(match_score);

-- Enable Row Level Security
ALTER TABLE user_scholarships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_scholarships
-- Users can view their own scholarship interactions
CREATE POLICY "Users can view own scholarship interactions"
  ON user_scholarships
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can insert their own scholarship interactions
CREATE POLICY "Users can insert own scholarship interactions"
  ON user_scholarships
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can update their own scholarship interactions
CREATE POLICY "Users can update own scholarship interactions"
  ON user_scholarships
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can delete their own scholarship interactions
CREATE POLICY "Users can delete own scholarship interactions"
  ON user_scholarships
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE user_scholarships IS 'Tracks user interactions with scholarships (saves, applications, dismissals)';

-- ============================================================================
-- Trigger for updated_at columns
-- ============================================================================
-- Reuse the existing update_updated_at_column function from previous migrations

CREATE TRIGGER update_scholarships_updated_at
  BEFORE UPDATE ON scholarships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scholarship_sources_updated_at
  BEFORE UPDATE ON scholarship_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_scholarships_updated_at
  BEFORE UPDATE ON user_scholarships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sample Data (Optional - for development/testing)
-- ============================================================================

-- Insert a sample scholarship source
INSERT INTO scholarship_sources (name, url, source_type, scraper_class, enabled, priority)
VALUES
  ('CollegeScholarships', 'www.collegescholarships.org', 'website', 'CollegeScholarshipsScraper', true, 8),
  ('CareerOneStop', 'https://www.careeronestop.org', 'website', 'CareerOneStopScraper', true, 7)
ON CONFLICT (name) DO NOTHING;

-- Insert a sample scholarship (for testing purposes)
INSERT INTO scholarships (
  name,
  organization,
  organization_website,
  min_award,
  max_award,
  description,
  eligibility,
  url,
  application_url,
  deadline,
  deadline_type,
  renewable,
  category,
  target_type,
  education_level,
  field_of_study,
  ethnicity,
  gender,
  country,
  essay_required,
  recommendation_required,
  checksum,
  source_type,
  source_name,
  status
)
VALUES (
  'Computer Science Excellence Scholarship',
  'Tech Foundation',
  'https://techfoundation.org',
  5000.00,
  5000.00,
  'Annual scholarship for outstanding computer science students.',
  'Must be enrolled in a computer science program with a GPA of 3.5 or higher.',
  'https://example.com/cs-scholarship',
  'https://example.com/cs-scholarship/apply',
  '2025-05-01',
  'fixed',
  true,
  'STEM',
  'Merit',
  'Undergraduate',
  'Computer Science',
  'unspecified',
  'unspecified',
  'US',
  true,
  false,
  'sample_checksum_1234567890abcdef',
  'manual',
  'sample_data',
  'active'
)
ON CONFLICT (url) DO NOTHING;
