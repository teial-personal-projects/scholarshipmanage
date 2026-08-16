import { createClient } from '@supabase/supabase-js';
import { config } from './index.js';

const supabaseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

// Privileged server client. Never use this client for operations that create a
// user session, because Supabase JS prefers a session access token over the
// service-role key for subsequent database requests.
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  supabaseOptions
);

// Isolated client for password login and token refresh operations. Any user
// session held by this client cannot change the privileged client's RLS role.
export const supabaseAuth = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  supabaseOptions
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
