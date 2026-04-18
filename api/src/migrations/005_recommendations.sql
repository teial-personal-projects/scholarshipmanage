-- Migration 005: Recommendations
-- This migration creates the recommendations table for tracking recommendation letters

-- Recommendation status enum
CREATE TYPE recommendation_status AS ENUM (
  'Pending',
  'Submitted'
);

-- Recommendations table
CREATE TABLE public.recommendations (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  recommender_id BIGINT REFERENCES public.collaborators(id) ON DELETE CASCADE NOT NULL,

  -- Recommendation tracking
  status recommendation_status DEFAULT 'Pending',
  submitted_at TIMESTAMPTZ,
  due_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- A recommender can only have one recommendation per application
  UNIQUE(application_id, recommender_id)
);

-- Indexes for performance
CREATE INDEX idx_recommendations_application_id ON public.recommendations(application_id);
CREATE INDEX idx_recommendations_recommender_id ON public.recommendations(recommender_id);
CREATE INDEX idx_recommendations_status ON public.recommendations(status);

-- Enable Row Level Security
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view recommendations for own applications" ON public.recommendations
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recommendations for own applications" ON public.recommendations
  FOR INSERT WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recommendations for own applications" ON public.recommendations
  FOR UPDATE USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recommendations for own applications" ON public.recommendations
  FOR DELETE USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.recommendations IS 'Recommendation letters for scholarship applications';
COMMENT ON COLUMN public.recommendations.recommender_id IS 'The collaborator writing the recommendation';
COMMENT ON COLUMN public.recommendations.status IS 'Current status of the recommendation: Pending or Submitted';
COMMENT ON COLUMN public.recommendations.submitted_at IS 'Timestamp when the recommendation was submitted';
COMMENT ON COLUMN public.recommendations.due_date IS 'Deadline for submitting the recommendation';

