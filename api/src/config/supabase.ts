import { createClient } from '@supabase/supabase-js';
import { config } from './index.js';

// Create Supabase client with service role key
// This bypasses Row Level Security (RLS) - use with caution!
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to verify Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }

    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection test error:', err);
    return false;
  }
};
