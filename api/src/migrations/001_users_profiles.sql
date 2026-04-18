-- Migration 001: Users & Profiles
-- This migration creates the user profiles, search preferences, and roles tables
-- Supabase Auth handles the actual user authentication (auth.users table)

-- User role enum
CREATE TYPE user_role AS ENUM (
  'student',
  'recommender',
  'collaborator'
);

CREATE TABLE public.user_profiles (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email_address TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User search preferences table - normalized representation of nested User.searchPreferences
CREATE TABLE public.user_search_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  target_type TEXT,
  subject_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  gender TEXT,
  ethnicity TEXT,
  min_award NUMERIC(10,2),
  geographic_restrictions TEXT,
  essay_required BOOLEAN,
  recommendation_required BOOLEAN,
  academic_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table - tracks what roles a user has in the system
-- A user can have multiple roles (e.g., both student and recommender)
CREATE TABLE public.user_roles (
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policies for user_search_preferences
CREATE POLICY "Users can view own search preferences" ON public.user_search_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = user_search_preferences.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own search preferences" ON public.user_search_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = user_search_preferences.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own search preferences" ON public.user_search_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = user_search_preferences.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for user_roles
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

-- Indexes for performance
CREATE INDEX idx_user_profiles_auth_user_id ON public.user_profiles(id);
CREATE INDEX idx_user_profiles_email_address ON public.user_profiles(email_address);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_search_preferences_updated_at
  BEFORE UPDATE ON public.user_search_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Function to create default profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id BIGINT;
BEGIN
  INSERT INTO public.user_profiles (auth_user_id, email_address)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO new_user_id;

  -- Assign default 'student' role
  IF new_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE public.user_profiles IS 'Extended user account data. id is auto-generated primary key, auth_user_id links to Supabase auth.users';
COMMENT ON TABLE public.user_search_preferences IS 'Normalized storage of nested User.searchPreferences object';
COMMENT ON TABLE public.user_roles IS 'User roles in the system - users can have multiple roles';
