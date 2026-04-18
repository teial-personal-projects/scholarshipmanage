-- Migration: Remove document_info_link column from applications table
-- This field is redundant as document information is typically found on the application portal

ALTER TABLE applications
DROP COLUMN IF EXISTS document_info_link;
