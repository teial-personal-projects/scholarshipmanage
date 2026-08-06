-- Scholarship Manage consolidated production schema
-- Run this file once against a fresh Supabase/PostgreSQL project.
--
-- This file represents the current desired schema after migrations 001-020.
-- Keep numbered migrations for history; use this file for new production bootstrap.

-- ============================================================================
-- Types
-- ============================================================================

CREATE TYPE public.user_role AS ENUM (
  'student',
  'recommender',
  'collaborator'
);

CREATE TYPE public.application_status AS ENUM (
  'Not Started',
  'In Progress',
  'Submitted',
  'Awarded',
  'Not Awarded'
);

CREATE TYPE public.target_type AS ENUM (
  'Merit',
  'Need',
  'Both'
);

CREATE TYPE public.collaboration_type AS ENUM (
  'recommendation',
  'essayReview',
  'guidance'
);

CREATE TYPE public.collaboration_status AS ENUM (
  'pending',
  'invited',
  'in_progress',
  'submitted',
  'completed',
  'declined'
);

CREATE TYPE public.action_owner AS ENUM (
  'student',
  'collaborator'
);

CREATE TYPE public.session_type AS ENUM (
  'initial',
  'followup',
  'final'
);

CREATE TYPE public.recommendation_status AS ENUM (
  'Pending',
  'Submitted'
);

CREATE TYPE public.invite_delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'bounced',
  'failed'
);

-- ============================================================================
-- Shared trigger functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id BIGINT;
BEGIN
  INSERT INTO public.user_profiles (auth_user_id, email_address)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO new_user_id;

  IF new_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Users
-- ============================================================================

CREATE TABLE public.user_profiles (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email_address TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  application_reminders_enabled BOOLEAN DEFAULT true,
  collaboration_reminders_enabled BOOLEAN DEFAULT true,
  reminder_intervals JSONB DEFAULT '{"application": [7, 3, 1], "collaboration": [7, 3, 1]}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  role public.user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX idx_user_profiles_email_address ON public.user_profiles(email_address);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = user_roles.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = user_roles.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE public.user_profiles IS 'Extended user account data. id is auto-generated primary key, auth_user_id links to Supabase auth.users';
COMMENT ON TABLE public.user_roles IS 'User roles in the system - users can have multiple roles';
COMMENT ON COLUMN public.user_profiles.application_reminders_enabled IS 'Whether to send reminder emails for application due dates';
COMMENT ON COLUMN public.user_profiles.collaboration_reminders_enabled IS 'Whether to send reminder emails for collaboration due dates';
COMMENT ON COLUMN public.user_profiles.reminder_intervals IS 'Custom reminder intervals in days before due date. Format: {"application": [7, 3, 1], "collaboration": [7, 3, 1]}';

-- ============================================================================
-- Applications and essays
-- ============================================================================

CREATE TABLE public.applications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  scholarship_name TEXT NOT NULL,
  target_type public.target_type,
  organization TEXT,
  org_website TEXT,
  platform TEXT,
  application_link TEXT,
  theme TEXT,
  min_award NUMERIC(10,2),
  recommendation_count INTEGER NOT NULL DEFAULT 0 CHECK (recommendation_count >= 0),
  max_award NUMERIC(10,2),
  requirements TEXT,
  renewable BOOLEAN DEFAULT FALSE,
  renewable_terms TEXT,
  status public.application_status DEFAULT 'Not Started',
  submission_date DATE,
  open_date DATE,
  due_date DATE NOT NULL,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.essays (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  theme TEXT,
  units TEXT,
  essay_link TEXT,
  word_count INTEGER,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'awaiting_review', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_user_id ON public.applications(user_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_applications_due_date ON public.applications(due_date);
CREATE INDEX idx_applications_last_reminder_sent_at ON public.applications(last_reminder_sent_at);
CREATE INDEX idx_essays_application ON public.essays(application_id);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view essays for own applications" ON public.essays
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert essays for own applications" ON public.essays
  FOR INSERT WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update essays for own applications" ON public.essays
  FOR UPDATE USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete essays for own applications" ON public.essays
  FOR DELETE USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.user_profiles p ON p.id = a.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_essays_updated_at
  BEFORE UPDATE ON public.essays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.complete_essays_on_application_submission()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.essays
  SET status = 'completed'
  WHERE application_id = NEW.id
    AND status IS DISTINCT FROM 'completed';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complete_essays_on_application_submission
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (NEW.status = 'Submitted' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.complete_essays_on_application_submission();

COMMENT ON TABLE public.applications IS 'Scholarship applications tracked by students';
COMMENT ON COLUMN public.applications.user_id IS 'The student who owns this application';
COMMENT ON COLUMN public.applications.last_reminder_sent_at IS 'Timestamp when the last reminder email was sent for this application. Used to prevent duplicate reminders within 24 hours.';
COMMENT ON TABLE public.essays IS 'Essays associated with scholarship applications';
COMMENT ON COLUMN public.essays.application_id IS 'References the application this essay belongs to';
COMMENT ON COLUMN public.essays.theme IS 'Essay topic/theme/prompt';
COMMENT ON COLUMN public.essays.units IS 'Unit type for word_count: words or characters';
COMMENT ON COLUMN public.essays.word_count IS 'Target or actual word count for the essay';
COMMENT ON COLUMN public.essays.essay_link IS 'Link to essay document (Google Docs, etc.)';

-- ============================================================================
-- Collaborators and collaborations
-- ============================================================================

CREATE TABLE public.collaborators (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email_address TEXT NOT NULL,
  relationship TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.collaborations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  collaborator_id BIGINT REFERENCES public.collaborators(id) ON DELETE CASCADE NOT NULL,
  application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  collaboration_type public.collaboration_type NOT NULL,
  status public.collaboration_status DEFAULT 'pending',
  awaiting_action_from public.action_owner,
  awaiting_action_type TEXT,
  next_action_description TEXT,
  next_action_due_date DATE,
  notes TEXT,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collaborator_id, application_id, collaboration_type)
);

CREATE TABLE public.essay_review_collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_draft_version INT DEFAULT 0,
  feedback_rounds INT DEFAULT 0,
  last_feedback_at TIMESTAMPTZ
);

CREATE TABLE public.recommendation_collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  portal_url TEXT,
  questionnaire_completed BOOLEAN DEFAULT FALSE,
  letter_submitted_at TIMESTAMPTZ
);

CREATE TABLE public.guidance_collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  session_type public.session_type,
  meeting_url TEXT,
  scheduled_for TIMESTAMPTZ
);

CREATE TABLE public.collaboration_history (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collaborators_user_id ON public.collaborators(user_id);
CREATE INDEX idx_collaborators_email_address ON public.collaborators(email_address);
CREATE INDEX idx_collaborations_user_id ON public.collaborations(user_id);
CREATE INDEX idx_collaborations_collaborator ON public.collaborations(collaborator_id);
CREATE INDEX idx_collaborations_application ON public.collaborations(application_id);
CREATE INDEX idx_collaborations_type ON public.collaborations(collaboration_type);
CREATE INDEX idx_collaborations_status ON public.collaborations(status);
CREATE INDEX idx_collaborations_action_owner ON public.collaborations(awaiting_action_from);
CREATE INDEX idx_collaborations_last_reminder_sent_at ON public.collaborations(last_reminder_sent_at);

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_review_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collaborators" ON public.collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaborators.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own collaborators" ON public.collaborators
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own collaborators" ON public.collaborators
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaborators.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own collaborators" ON public.collaborators
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaborators.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

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

CREATE POLICY "Users can view own essay reviews" ON public.essay_review_collaborations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = essay_review_collaborations.collaboration_id
        AND c.user_id IN (
          SELECT id FROM public.user_profiles
          WHERE auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can view own recommendations" ON public.recommendation_collaborations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = recommendation_collaborations.collaboration_id
        AND c.user_id IN (
          SELECT id FROM public.user_profiles
          WHERE auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can view own guidance sessions" ON public.guidance_collaborations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = guidance_collaborations.collaboration_id
        AND c.user_id IN (
          SELECT id FROM public.user_profiles
          WHERE auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can view own collaboration history" ON public.collaboration_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = collaboration_history.collaboration_id
        AND c.user_id IN (
          SELECT id FROM public.user_profiles
          WHERE auth_user_id = auth.uid()
        )
    )
  );

CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborations_updated_at
  BEFORE UPDATE ON public.collaborations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.collaborators IS 'People who help students with applications. No type field - same person can do multiple collaboration types.';
COMMENT ON COLUMN public.collaborators.user_id IS 'The student who owns this collaborator';
COMMENT ON COLUMN public.collaborators.relationship IS 'Descriptive relationship like Teacher, Counselor, Tutor';
COMMENT ON COLUMN public.collaborators.email_address IS 'Email address of the collaborator';
COMMENT ON TABLE public.collaborations IS 'Base table linking collaborators to applications with specific collaboration types';
COMMENT ON COLUMN public.collaborations.user_id IS 'Foreign key to user_profiles - owner of the collaboration (student)';
COMMENT ON COLUMN public.collaborations.collaboration_type IS 'Defines what type of help this is - same collaborator can have multiple types';
COMMENT ON COLUMN public.collaborations.awaiting_action_from IS 'Who needs to act next: student or collaborator';
COMMENT ON COLUMN public.collaborations.last_reminder_sent_at IS 'Timestamp when the last reminder email was sent for this collaboration. Used to prevent duplicate reminders within 24 hours.';
COMMENT ON TABLE public.essay_review_collaborations IS 'Type-specific data for essay review collaborations (one row per collaboration; no essay_id link)';
COMMENT ON TABLE public.recommendation_collaborations IS 'Type-specific data for recommendation collaborations. Use next_action_due_date in collaborations table for deadline tracking.';
COMMENT ON TABLE public.guidance_collaborations IS 'Type-specific data for guidance/counseling collaborations';
COMMENT ON TABLE public.collaboration_history IS 'Audit log of all collaboration actions';

-- ============================================================================
-- Recommendations and invites
-- ============================================================================

CREATE TABLE public.recommendations (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  recommender_id BIGINT REFERENCES public.collaborators(id) ON DELETE CASCADE NOT NULL,
  status public.recommendation_status DEFAULT 'Pending',
  submitted_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(application_id, recommender_id)
);

CREATE TABLE public.collaboration_invites (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  resend_email_id TEXT,
  delivery_status public.invite_delivery_status DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_application_id ON public.recommendations(application_id);
CREATE INDEX idx_recommendations_recommender_id ON public.recommendations(recommender_id);
CREATE INDEX idx_recommendations_status ON public.recommendations(status);
CREATE INDEX idx_collaboration_invites_collaboration_id ON public.collaboration_invites(collaboration_id);
CREATE INDEX idx_collaboration_invites_user_id ON public.collaboration_invites(user_id);
CREATE INDEX idx_collaboration_invites_invite_token ON public.collaboration_invites(invite_token);
CREATE INDEX idx_collaboration_invites_resend_email_id ON public.collaboration_invites(resend_email_id) WHERE resend_email_id IS NOT NULL;
CREATE INDEX idx_collaboration_invites_expires_at ON public.collaboration_invites(expires_at);
CREATE INDEX idx_collaboration_invites_delivery_status ON public.collaboration_invites(delivery_status);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_invites ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view invites for own collaborations" ON public.collaboration_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaboration_invites.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invites for own collaborations" ON public.collaboration_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaboration_invites.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invites for own collaborations" ON public.collaboration_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaboration_invites.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON public.recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaboration_invites_updated_at
  BEFORE UPDATE ON public.collaboration_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.recommendations IS 'Recommendation letters for scholarship applications';
COMMENT ON COLUMN public.recommendations.recommender_id IS 'The collaborator writing the recommendation';
COMMENT ON COLUMN public.recommendations.status IS 'Current status of the recommendation: Pending or Submitted';
COMMENT ON COLUMN public.recommendations.submitted_at IS 'Timestamp when the recommendation was submitted';
COMMENT ON COLUMN public.recommendations.due_date IS 'Deadline for submitting the recommendation';
COMMENT ON TABLE public.collaboration_invites IS 'Stores email invitations for collaborations. Separate table allows multiple invites/resends per collaboration.';
COMMENT ON COLUMN public.collaboration_invites.user_id IS 'The student who owns this collaboration invitation. Stored for easier querying and RLS policies.';
COMMENT ON COLUMN public.collaboration_invites.invite_token IS 'Secure random token used in invite link. Expires after 7 days.';
COMMENT ON COLUMN public.collaboration_invites.resend_email_id IS 'Resend email ID for tracking delivery status via webhooks.';
COMMENT ON COLUMN public.collaboration_invites.delivery_status IS 'Email delivery status updated via Resend webhooks.';
COMMENT ON COLUMN public.collaboration_invites.expires_at IS 'Token expiry timestamp (typically 7 days from creation).';
COMMENT ON COLUMN public.collaboration_invites.sent_at IS 'Timestamp when invitation email was sent via Resend.';
COMMENT ON COLUMN public.collaboration_invites.opened_at IS 'Timestamp when email was opened (from Resend webhook).';
COMMENT ON COLUMN public.collaboration_invites.clicked_at IS 'Timestamp when invite link was clicked (from Resend webhook).';

-- ============================================================================
-- Scholarship resource and discovery infrastructure
-- ============================================================================

CREATE TABLE public.scholarships (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  organization VARCHAR(300),
  organization_website TEXT,
  description TEXT,
  eligibility TEXT,
  requirements TEXT,
  min_award DECIMAL(10, 2),
  max_award DECIMAL(10, 2),
  url TEXT NOT NULL,
  application_url TEXT,
  apply_url TEXT,
  source_url TEXT,
  deadline DATE,
  deadline_type VARCHAR(50),
  renewable BOOLEAN DEFAULT FALSE,
  category VARCHAR(100),
  target_type VARCHAR(50),
  education_level VARCHAR(100),
  field_of_study VARCHAR(200),
  ethnicity VARCHAR(100) DEFAULT 'unspecified',
  gender VARCHAR(50) DEFAULT 'unspecified',
  geographic_restrictions TEXT,
  country VARCHAR(50) DEFAULT 'US',
  essay_required BOOLEAN DEFAULT FALSE,
  recommendation_required BOOLEAN DEFAULT FALSE,
  checksum VARCHAR(64),
  status VARCHAR(50) DEFAULT 'active',
  verified BOOLEAN DEFAULT FALSE,
  source_type VARCHAR(50),
  source_name VARCHAR(100),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_scholarship_url UNIQUE(url),
  CONSTRAINT unique_scholarship_checksum UNIQUE(checksum)
);

CREATE TABLE public.scholarship_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  url TEXT NOT NULL,
  source_type VARCHAR(50),
  scraper_class VARCHAR(100),
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5,
  rate_limit_per_hour INTEGER DEFAULT 100,
  display_name VARCHAR(200),
  description TEXT,
  category VARCHAR(100),
  requires_auth BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT true,
  logo_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.finder_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  source_id INTEGER REFERENCES public.scholarship_sources(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  scholarships_found INTEGER DEFAULT 0,
  scholarships_new INTEGER DEFAULT 0,
  scholarships_updated INTEGER DEFAULT 0,
  scholarships_expired INTEGER DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  config JSONB,
  results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.scraper_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5,
  keywords JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scholarships_checksum ON public.scholarships(checksum);
CREATE INDEX idx_scholarships_status ON public.scholarships(status);
CREATE INDEX idx_scholarships_deadline ON public.scholarships(deadline);
CREATE INDEX idx_scholarships_category ON public.scholarships(category);
CREATE INDEX idx_scholarships_organization ON public.scholarships(organization);
CREATE INDEX idx_scholarships_expires_at ON public.scholarships(expires_at);
CREATE INDEX idx_scholarships_discovered_at ON public.scholarships(discovered_at);
CREATE INDEX idx_scholarships_target_type ON public.scholarships(target_type);
CREATE INDEX idx_scholarships_ethnicity ON public.scholarships(ethnicity);
CREATE INDEX idx_scholarships_gender ON public.scholarships(gender);
CREATE INDEX idx_scholarships_country ON public.scholarships(country);
CREATE INDEX idx_scholarships_education_level ON public.scholarships(education_level);
CREATE INDEX idx_scholarships_deadline_target_type ON public.scholarships(deadline, target_type);
CREATE INDEX idx_scholarships_education_level_target_type ON public.scholarships(education_level, target_type);
CREATE INDEX idx_scholarships_organization_deadline ON public.scholarships(organization, deadline);
CREATE INDEX idx_scholarships_ethnicity_gender ON public.scholarships(ethnicity, gender);
CREATE INDEX idx_scholarships_country_education_level ON public.scholarships(country, education_level);
CREATE INDEX idx_scholarship_sources_enabled ON public.scholarship_sources(enabled);
CREATE INDEX idx_finder_jobs_status ON public.finder_jobs(status);
CREATE INDEX idx_finder_jobs_created_at ON public.finder_jobs(created_at);
CREATE INDEX idx_finder_jobs_job_type ON public.finder_jobs(job_type);
CREATE INDEX idx_scraper_categories_enabled ON public.scraper_categories(enabled);
CREATE INDEX idx_scraper_categories_slug ON public.scraper_categories(slug);
CREATE INDEX idx_scraper_categories_priority ON public.scraper_categories(priority DESC);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finder_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active scholarships" ON public.scholarships
  FOR SELECT USING (status = 'active');

CREATE POLICY "Anyone can view categories" ON public.scraper_categories
  FOR SELECT USING (true);

CREATE TRIGGER update_scholarships_updated_at
  BEFORE UPDATE ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scholarship_sources_updated_at
  BEFORE UPDATE ON public.scholarship_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scraper_categories_updated_at
  BEFORE UPDATE ON public.scraper_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.scholarships IS 'Scholarship data from various sources. Note: User-facing search features removed in migration 013. This data is preserved for internal/research purposes and potential future official partnerships.';
COMMENT ON TABLE public.scholarship_sources IS 'Source configuration for scrapers (websites, APIs) - lookup table only';
COMMENT ON TABLE public.finder_jobs IS 'Tracks scholarship finder job executions and results';
COMMENT ON TABLE public.scraper_categories IS 'Category configuration for scholarship discovery (STEM, Arts, etc.) - lookup table only';

INSERT INTO public.scholarship_sources (
  name,
  url,
  source_type,
  scraper_class,
  enabled,
  priority,
  display_name,
  description,
  category,
  requires_auth,
  is_free,
  tags
)
VALUES
  (
    'CollegeScholarships',
    'www.collegescholarships.org',
    'website',
    'CollegeScholarshipsScraper',
    true,
    8,
    'College Scholarships',
    'Comprehensive database of college scholarships with detailed filtering options.',
    'General',
    false,
    true,
    ARRAY['scholarships', 'college', 'database']
  ),
  (
    'CareerOneStop',
    'https://www.careeronestop.org',
    'website',
    'CareerOneStopScraper',
    true,
    7,
    'CareerOneStop',
    'U.S. Department of Labor official scholarship finder with verified opportunities.',
    'General',
    false,
    true,
    ARRAY['official', 'scholarships', 'career']
  ),
  (
    'JLVCollegeCounseling',
    'https://jlvcollegecounseling.com/',
    'website',
    NULL,
    true,
    7,
    'JLV College Counseling',
    'College counseling resource offering scholarship listings, application advice, and college planning guidance.',
    'General',
    false,
    true,
    ARRAY['scholarships', 'college', 'counseling']
  ),
  (
    'Scholarships360',
    'https://scholarships360.org/',
    'website',
    NULL,
    true,
    8,
    'Scholarships360',
    'Scholarship discovery platform offering vetted opportunities and financial aid guidance.',
    'General',
    false,
    true,
    ARRAY['scholarships', 'college', 'financial-aid']
  ),
  (
    'RedKite',
    'https://myredkite.com/',
    'website',
    NULL,
    true,
    7,
    'Red Kite',
    'Scholarship search platform that helps students discover and organize financial aid opportunities.',
    'General',
    false,
    true,
    ARRAY['scholarships', 'financial-aid', 'search']
  )
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.scraper_categories (name, slug, enabled, priority, keywords, description)
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
