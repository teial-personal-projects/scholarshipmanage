-- Test Data for ScholarshipHub Database
-- This file contains sample data for testing the database schema
-- Run this AFTER all migrations have been applied
-- 
-- WARNING: This will insert test data. Use only in development/test environments!

-- Note: This assumes you have:
-- 1. Run all migrations (001-005)
-- 2. Created at least one test user via Supabase Auth
-- 3. Have the auth_user_id from that user

-- To use this file:
-- 1. Replace the AUTH_USER_ID_UUID below with an actual UUID from auth.users
-- 2. Run this script in Supabase SQL Editor
-- 3. Verify data was inserted correctly

BEGIN;

-- ============================================================================
-- STEP 1: Get or create a test user profile
-- ============================================================================
-- First, you need to create a user via Supabase Auth (in the dashboard or via API)
-- Then get their auth_user_id UUID and replace AUTH_USER_ID_UUID below

-- Example: Get the first user's auth_user_id
-- DO $$
-- DECLARE
--   test_auth_user_id UUID;
--   test_user_id BIGINT;
-- BEGIN
--   -- Get first auth user (or use a specific one)
--   SELECT id INTO test_auth_user_id FROM auth.users LIMIT 1;
--   
--   IF test_auth_user_id IS NULL THEN
--     RAISE EXCEPTION 'No users found in auth.users. Please create a user first.';
--   END IF;
--   
--   -- Get or create user profile
--   INSERT INTO public.user_profiles (auth_user_id, email_address, first_name, last_name)
--   VALUES (test_auth_user_id, 'test@example.com', 'Test', 'User')
--   ON CONFLICT (auth_user_id) DO NOTHING
--   RETURNING id INTO test_user_id;
--   
--   IF test_user_id IS NULL THEN
--     SELECT id INTO test_user_id FROM public.user_profiles WHERE auth_user_id = test_auth_user_id;
--   END IF;
--   
--   -- Assign student role
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES (test_user_id, 'student')
--   ON CONFLICT DO NOTHING;
--   
--   -- ============================================================================
--   -- STEP 2: Create test collaborators
--   -- ============================================================================
--   INSERT INTO public.collaborators (user_id, first_name, last_name, email, relationship)
--   VALUES
--     (test_user_id, 'John', 'Smith', 'john.smith@example.com', 'Teacher'),
--     (test_user_id, 'Jane', 'Doe', 'jane.doe@example.com', 'Counselor'),
--     (test_user_id, 'Bob', 'Johnson', 'bob.johnson@example.com', 'Tutor')
--   ON CONFLICT DO NOTHING;
--   
--   -- ============================================================================
--   -- STEP 3: Create test applications
--   -- ============================================================================
--   INSERT INTO public.applications (
--     user_id, scholarship_name, target_type, organization, 
--     due_date, status, min_award, max_award
--   )
--   VALUES
--     (
--       test_user_id, 
--       'National Merit Scholarship', 
--       'Merit', 
--       'National Merit Scholarship Corporation',
--       CURRENT_DATE + INTERVAL '30 days',
--       'In Progress',
--       2500.00,
--       2500.00
--     ),
--     (
--       test_user_id,
--       'Gates Scholarship',
--       'Both',
--       'Bill & Melinda Gates Foundation',
--       CURRENT_DATE + INTERVAL '60 days',
--       'Not Started',
--       50000.00,
--       50000.00
--     )
--   ON CONFLICT DO NOTHING;
--   
--   -- ============================================================================
--   -- STEP 4: Create test essays
--   -- ============================================================================
--   INSERT INTO public.essays (application_id, theme, word_count, units, essay_link)
--   SELECT 
--     a.id,
--     'Describe your academic goals',
--     500,
--     'words',
--     'https://docs.google.com/document/d/test123'
--   FROM public.applications a
--   WHERE a.user_id = test_user_id
--   LIMIT 1
--   ON CONFLICT DO NOTHING;
--   
--   -- ============================================================================
--   -- STEP 5: Create test collaborations
--   -- ============================================================================
--   INSERT INTO public.collaborations (
--     collaborator_id, application_id, collaboration_type, status, awaiting_action_from
--   )
--   SELECT 
--     c.id,
--     a.id,
--     'recommendation',
--     'invited',
--     'collaborator'
--   FROM public.collaborators c
--   CROSS JOIN public.applications a
--   WHERE c.user_id = test_user_id
--     AND a.user_id = test_user_id
--   LIMIT 1
--   ON CONFLICT DO NOTHING;
--   
--   -- ============================================================================
--   -- STEP 6: Create test recommendations
--   -- ============================================================================
--   INSERT INTO public.recommendations (
--     application_id, recommender_id, status, due_date
--   )
--   SELECT 
--     a.id,
--     c.id,
--     'Pending',
--     CURRENT_DATE + INTERVAL '20 days'
--   FROM public.applications a
--   CROSS JOIN public.collaborators c
--   WHERE a.user_id = test_user_id
--     AND c.user_id = test_user_id
--   LIMIT 1
--   ON CONFLICT DO NOTHING;
--   
--   RAISE NOTICE 'Test data inserted successfully for user_id: %', test_user_id;
-- END $$;

-- ============================================================================
-- ALTERNATIVE: Manual insertion (replace values as needed)
-- ============================================================================

-- Uncomment and modify the following if you prefer manual insertion:

-- 1. Get your test user's profile ID
-- SELECT id, auth_user_id, email_address FROM public.user_profiles LIMIT 1;

-- 2. Insert test collaborators (replace USER_ID with actual ID from step 1)
-- INSERT INTO public.collaborators (user_id, first_name, last_name, email, relationship)
-- VALUES
--   (USER_ID, 'John', 'Smith', 'john.smith@example.com', 'Teacher'),
--   (USER_ID, 'Jane', 'Doe', 'jane.doe@example.com', 'Counselor');

-- 3. Insert test applications (replace USER_ID)
-- INSERT INTO public.applications (
--   user_id, scholarship_name, target_type, organization, due_date, status
-- )
-- VALUES
--   (USER_ID, 'Test Scholarship', 'Merit', 'Test Org', CURRENT_DATE + 30, 'In Progress');

-- 4. Insert test essays (replace APPLICATION_ID with ID from step 3)
-- INSERT INTO public.essays (application_id, theme, word_count, units)
-- VALUES (APPLICATION_ID, 'Test Essay Theme', 500, 'words');

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check user profiles
-- SELECT id, email_address, first_name, last_name FROM public.user_profiles;

-- Check applications
-- SELECT id, scholarship_name, status, due_date FROM public.applications;

-- Check essays
-- SELECT id, application_id, theme, word_count FROM public.essays;

-- Check collaborators
-- SELECT id, user_id, first_name, last_name, email FROM public.collaborators;

-- Check collaborations
-- SELECT id, collaborator_id, application_id, collaboration_type, status FROM public.collaborations;

-- Check recommendations
-- SELECT id, application_id, recommender_id, status FROM public.recommendations;

