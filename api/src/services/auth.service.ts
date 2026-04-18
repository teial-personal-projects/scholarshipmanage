import { supabase } from '../config/supabase.js';
import { insertOne } from '../utils/supabase.js';
import {
  DB_ERROR_CODES,
  isAnyDbErrorCode,
  isDbErrorCode,
} from '../constants/db-errors.js';

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginData {
  email: string;
  password: string;
}

/**
 * Register a new user
 * Creates user in Supabase Auth, then creates profile and default role
 */
export const register = async (data: RegisterData) => {
  const { email, password, firstName, lastName } = data;

  // Create user in Supabase Auth
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email (for development)
  });

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  const authUserId = authData.user.id;

  // The database trigger automatically creates a profile, so we need to check if it exists
  // and update it, or handle the conflict if we try to insert
  let profile;
  try {
    // Try to insert profile (will fail if trigger already created it)
    profile = await insertOne<{
      id: number;
      auth_user_id: string;
      email_address: string;
      first_name: string | null;
      last_name: string | null;
    }>('user_profiles', {
      auth_user_id: authUserId,
      email_address: email,
      first_name: firstName || null,
      last_name: lastName || null,
    });
  } catch (error: unknown) {
    // Profile might already exist from trigger, try to fetch and update it
    if (
      isAnyDbErrorCode(error, [
        DB_ERROR_CODES.UNIQUE_VIOLATION,
        DB_ERROR_CODES.NO_ROWS_FOUND,
      ])
    ) {
      // Get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (fetchError || !existingProfile) {
        throw fetchError || new Error('Failed to fetch existing profile');
      }

      // Update with firstName/lastName if provided
      if (firstName || lastName) {
        const { data: updatedProfile, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            first_name: firstName || existingProfile.first_name,
            last_name: lastName || existingProfile.last_name,
          })
          .eq('auth_user_id', authUserId)
          .select()
          .single();

        if (updateError) throw updateError;
        profile = updatedProfile;
      } else {
        profile = existingProfile;
      }
    } else {
      throw error;
    }
  }

  // Ensure default 'student' role exists (might already exist from trigger)
  try {
    await insertOne('user_roles', {
      user_id: profile.id,
      role: 'student',
    });
  } catch (error: unknown) {
    // Role might already exist, that's fine
    if (!isDbErrorCode(error, DB_ERROR_CODES.UNIQUE_VIOLATION)) {
      // If it's not a unique violation, rethrow the error
      throw error;
    }
  }

  // Get the session by signing in (to return tokens)
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError || !sessionData.session) {
    // User was created but session creation failed
    // Return user data without session (frontend can handle login separately)
    return {
      user: authData.user,
      profile,
      session: null,
    };
  }

  return {
    user: sessionData.user,
    profile,
    session: sessionData.session,
  };
};

/**
 * Login user (proxy to Supabase Auth)
 * This is primarily handled by the frontend, but we provide a backend proxy
 * for cases where backend-to-backend auth is needed
 */
export const login = async (data: LoginData) => {
  const { email, password } = data;

  const {
    data: sessionData,
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !sessionData.session) {
    throw error || new Error('Login failed');
  }

  return {
    user: sessionData.user,
    session: sessionData.session,
  };
};

/**
 * Logout user
 * Note: Supabase uses stateless JWT tokens, so logout is primarily handled client-side
 * by clearing tokens. This endpoint acknowledges the logout request.
 * For server-side session invalidation, we could use admin API to revoke refresh tokens,
 * but for simplicity, we just return success since JWTs expire naturally.
 */
export const logout = async (_accessToken: string) => {
  // Since Supabase uses stateless JWT tokens, logout is primarily client-side
  // The client should clear tokens from storage
  // If needed, we could use admin API to revoke refresh tokens server-side:
  // await supabase.auth.admin.signOut(userId);
  
  return { success: true };
};

/**
 * Refresh session (proxy to Supabase Auth)
 * Gets a new access token using the refresh token
 */
export const refreshSession = async (refreshToken: string) => {
  const {
    data: sessionData,
    error,
  } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !sessionData.session) {
    throw error || new Error('Failed to refresh session');
  }

  return {
    user: sessionData.user,
    session: sessionData.session,
  };
};

