import { supabase } from '../config/supabase.js';

/**
 * Get all enabled scholarship resources
 * Returns resources that can be displayed to users
 */
export const getScholarshipResources = async () => {
  const { data, error } = await supabase
    .from('scholarship_sources')
    .select('*')
    .eq('enabled', true)
    .order('priority', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;

  return data || [];
};
