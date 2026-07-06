-- Migration 018: Add recommendation count to applications

ALTER TABLE public.applications
ADD COLUMN recommendation_count INTEGER NOT NULL DEFAULT 0
CHECK (recommendation_count >= 0);
