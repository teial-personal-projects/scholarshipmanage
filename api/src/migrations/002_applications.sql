-- Migration 002: Applications
-- This migration creates the applications table for tracking scholarship applications

-- Application status enum
CREATE TYPE application_status AS ENUM (
  'Not Started',
  'In Progress',
  'Submitted',
  'Awarded',
  'Not Awarded'
);

-- Target type enum
CREATE TYPE target_type AS ENUM (
  'Merit',
  'Need',
  'Both'
);

-- Applications table
CREATE TABLE public.applications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,

  -- Scholarship details
  scholarship_name TEXT NOT NULL,
  target_type target_type,
  organization TEXT,
  org_website TEXT,
  platform TEXT,
  application_link TEXT,
  theme TEXT,
  min_award NUMERIC(10,2),
  max_award NUMERIC(10,2),
  requirements TEXT,
  renewable BOOLEAN DEFAULT FALSE,
  renewable_terms TEXT,
  document_info_link TEXT,

  -- Application tracking
  current_action TEXT,
  status application_status DEFAULT 'Not Started',
  submission_date DATE,
  open_date DATE,
  due_date DATE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_applications_user_id ON public.applications(user_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_applications_due_date ON public.applications(due_date);

-- Enable Row Level Security
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own applications" ON public.applications
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own applications" ON public.applications
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own applications" ON public.applications
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own applications" ON public.applications
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.applications IS 'Scholarship applications tracked by students';
COMMENT ON COLUMN public.applications.user_id IS 'The student who owns this application';

