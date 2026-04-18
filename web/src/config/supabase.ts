import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

/**
 * Supabase client with secure token storage configuration.
 *
 * Security: Uses sessionStorage instead of localStorage for token storage.
 * Trade-offs:
 * - sessionStorage: More secure (tokens cleared when tab closes, reducing XSS risk window)
 * - localStorage: Better UX (persists across tabs/refreshes) but higher XSS risk
 *
 * The current configuration prioritizes security over convenience.
 * Users will need to re-login when opening new tabs or closing the browser.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage, // Use sessionStorage instead of localStorage for better security
    autoRefreshToken: true,          // Automatically refresh tokens before expiration
    persistSession: true,             // Persist session in sessionStorage
    detectSessionInUrl: true,         // Detect session from URL (for OAuth redirects)
  },
});
