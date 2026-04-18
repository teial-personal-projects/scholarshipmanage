-- Migration 004: Collaborators & Collaborations
-- This migration creates the collaborators and collaborations system

-- Collaboration types: what kind of help they're providing
CREATE TYPE collaboration_type AS ENUM (
  'recommendation',
  'essayReview',
  'guidance'
);

-- Collaboration status
CREATE TYPE collaboration_status AS ENUM (
  'pending',
  'invited',
  'in_progress',
  'submitted',
  'completed',
  'declined'
);

-- Action ownership: who needs to act next
CREATE TYPE action_owner AS ENUM (
  'student',
  'collaborator'
);

-- Session types for guidance collaborations
CREATE TYPE session_type AS ENUM (
  'initial',
  'followup',
  'final'
);

-- Collaborators table (people who help students - owned by user)
-- NOTE: No collaborator_type field - same person can do multiple collaboration types
CREATE TABLE public.collaborators (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL, -- Student who owns this collaborator
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  relationship TEXT, -- e.g., 'Teacher', 'Counselor', 'Tutor', 'Parent'
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base collaborations table (common fields for all types)
CREATE TABLE public.collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaborator_id BIGINT REFERENCES public.collaborators(id) ON DELETE CASCADE NOT NULL,
  application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  collaboration_type collaboration_type NOT NULL,
  status collaboration_status DEFAULT 'pending',

  -- Action tracking: who needs to act next
  awaiting_action_from action_owner,
  awaiting_action_type TEXT,
  next_action_description TEXT,
  next_action_due_date DATE,

  notes TEXT, -- Additional context or instructions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- A collaborator can only have one collaboration of each type per application
  UNIQUE(collaborator_id, application_id, collaboration_type)
);

-- Essay review-specific table (one collaboration can review multiple essays)
CREATE TABLE public.essay_review_collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
  essay_id BIGINT REFERENCES public.essays(id) ON DELETE CASCADE NOT NULL,

  -- Essay review tracking
  current_draft_version INT DEFAULT 0,
  feedback_rounds INT DEFAULT 0,
  last_feedback_at TIMESTAMPTZ,

  UNIQUE(collaboration_id, essay_id)
);

-- Recommendation-specific table (one-to-one with collaboration)
CREATE TABLE public.recommendation_collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Recommendation tracking
  portal_url TEXT,
  portal_deadline DATE,
  questionnaire_completed BOOLEAN DEFAULT FALSE,
  letter_submitted_at TIMESTAMPTZ
);

-- Guidance/counseling-specific table (one-to-one with collaboration)
CREATE TABLE public.guidance_collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Guidance tracking
  session_type session_type,
  meeting_url TEXT,
  scheduled_for TIMESTAMPTZ
);

-- Collaboration history - tracks all actions
CREATE TABLE public.collaboration_history (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'invited', 'reminder_sent', 'viewed', 'uploaded', 'comment_added', etc.
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_collaborations_collaborator ON public.collaborations(collaborator_id);
CREATE INDEX idx_collaborations_application ON public.collaborations(application_id);
CREATE INDEX idx_collaborations_type ON public.collaborations(collaboration_type);
CREATE INDEX idx_collaborations_status ON public.collaborations(status);
CREATE INDEX idx_collaborations_action_owner ON public.collaborations(awaiting_action_from);
CREATE INDEX idx_essay_review_essay ON public.essay_review_collaborations(essay_id);

-- Enable Row Level Security
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_review_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Students can view their own collaborators
CREATE POLICY "Users can view own collaborators" ON public.collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaborators.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies: Students can insert their own collaborators
CREATE POLICY "Users can insert own collaborators" ON public.collaborators
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies: Students can update their own collaborators
CREATE POLICY "Users can update own collaborators" ON public.collaborators
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaborators.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies: Students can view their collaborations
CREATE POLICY "Users can view own collaborations" ON public.collaborations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      JOIN public.user_profiles p ON p.id = c.user_id
      WHERE c.id = collaborations.collaborator_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for type-specific tables (inherit from base collaborations)
CREATE POLICY "Users can view own essay reviews" ON public.essay_review_collaborations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      JOIN public.collaborators co ON co.id = c.collaborator_id
      JOIN public.user_profiles p ON p.id = co.user_id
      WHERE c.id = essay_review_collaborations.collaboration_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own recommendations" ON public.recommendation_collaborations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      JOIN public.collaborators co ON co.id = c.collaborator_id
      JOIN public.user_profiles p ON p.id = co.user_id
      WHERE c.id = recommendation_collaborations.collaboration_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own guidance sessions" ON public.guidance_collaborations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      JOIN public.collaborators co ON co.id = c.collaborator_id
      JOIN public.user_profiles p ON p.id = co.user_id
      WHERE c.id = guidance_collaborations.collaboration_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Policies for collaboration_history
CREATE POLICY "Users can view own collaboration history" ON public.collaboration_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      JOIN public.collaborators co ON co.id = c.collaborator_id
      JOIN public.user_profiles p ON p.id = co.user_id
      WHERE c.id = collaboration_history.collaboration_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Triggers to automatically update updated_at timestamp
CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaborations_updated_at
  BEFORE UPDATE ON public.collaborations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.collaborators IS 'People who help students with applications. No type field - same person can do multiple collaboration types.';
COMMENT ON COLUMN public.collaborators.user_id IS 'The student who owns this collaborator';
COMMENT ON COLUMN public.collaborators.relationship IS 'Descriptive relationship like Teacher, Counselor, Tutor';

COMMENT ON TABLE public.collaborations IS 'Base table linking collaborators to applications with specific collaboration types';
COMMENT ON COLUMN public.collaborations.collaboration_type IS 'Defines what type of help this is - same collaborator can have multiple types';
COMMENT ON COLUMN public.collaborations.awaiting_action_from IS 'Who needs to act next: student or collaborator';

COMMENT ON TABLE public.essay_review_collaborations IS 'Type-specific data for essay review collaborations - one collaboration can review multiple essays';
COMMENT ON TABLE public.recommendation_collaborations IS 'Type-specific data for recommendation collaborations';
COMMENT ON TABLE public.guidance_collaborations IS 'Type-specific data for guidance/counseling collaborations';
COMMENT ON TABLE public.collaboration_history IS 'Audit log of all collaboration actions';
