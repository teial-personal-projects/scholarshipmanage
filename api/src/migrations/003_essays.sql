-- Migration 003: Essays
-- This migration creates the essays table for tracking essays associated with applications

-- Essays table
CREATE TABLE public.essays (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  theme TEXT,
  units TEXT, -- 'words' | 'characters'
  essay_link TEXT, -- URL to Google Docs or storage
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_essays_application ON public.essays(application_id);

-- Enable Row Level Security
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view essays for their own applications
CREATE POLICY "Users can view essays for own applications" ON public.essays
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies: Users can insert essays for their own applications
CREATE POLICY "Users can insert essays for own applications" ON public.essays
  FOR INSERT WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies: Users can update essays for their own applications
CREATE POLICY "Users can update essays for own applications" ON public.essays
  FOR UPDATE USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies: Users can delete essays for their own applications
CREATE POLICY "Users can delete essays for own applications" ON public.essays
  FOR DELETE USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_essays_updated_at
  BEFORE UPDATE ON public.essays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.essays IS 'Essays associated with scholarship applications';
COMMENT ON COLUMN public.essays.application_id IS 'References the application this essay belongs to';
COMMENT ON COLUMN public.essays.theme IS 'Essay topic/theme/prompt';
COMMENT ON COLUMN public.essays.units IS 'Unit type for word_count: words or characters';
COMMENT ON COLUMN public.essays.word_count IS 'Target or actual word count for the essay';
COMMENT ON COLUMN public.essays.essay_link IS 'Link to essay document (Google Docs, etc.)';
