-- Migration 020: Add scholarship resource sources.

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
