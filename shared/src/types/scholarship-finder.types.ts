/**
 * Scholarship Finder Types
 * Types for the automated scholarship discovery and search system
 */

export interface ScholarshipResponse {
  id: number;
  name: string;
  organization?: string;
  min_award?: number;
  max_award?: number;
  description?: string;
  eligibility?: string;
  requirements?: string;
  url: string;
  application_url?: string;
  source_url?: string;
  deadline?: string;
  deadline_type?: 'fixed' | 'rolling' | 'varies';
  recurring?: boolean;
  category?: string;
  target_type?: string;
  education_level?: string;
  field_of_study?: string;
  status: 'active' | 'expired' | 'invalid' | 'archived';
  verified: boolean;
  source_type: 'scraper' | 'ai_discovery' | 'manual';
  source_name?: string;
  discovered_at: string;
  last_verified_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}
