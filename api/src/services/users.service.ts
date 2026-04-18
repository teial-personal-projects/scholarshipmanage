import { supabase } from '../config/supabase.js';
import { getUserProfileById } from '../utils/supabase.js';
import type { DashboardReminders } from '@scholarship-hub/shared';
import { sanitizePhoneNumber } from '@scholarship-hub/shared';
import { AppError } from '../middleware/error-handler.js';

/**
 * Get user profile by user ID
 */
export const getUserProfile = async (userId: number) => {
  const profile = await getUserProfileById(userId);
  return profile;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: number,
  updates: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string | null;
    applicationRemindersEnabled?: boolean;
    collaborationRemindersEnabled?: boolean;
  }
) => {
  // Convert camelCase to snake_case for database and sanitize inputs
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName.trim();
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName.trim();
  
  if (updates.phoneNumber !== undefined) {
    if (updates.phoneNumber === '' || updates.phoneNumber === null) {
      // Allow clearing phone number
      dbUpdates.phone_number = null;
    } else {
      try {
        dbUpdates.phone_number = sanitizePhoneNumber(updates.phoneNumber, {
          defaultCountry: 'US',
          format: 'E164', // Store in international format
        });
      } catch (error) {
        throw new AppError(
          error instanceof Error ? error.message : 'Invalid phone number format',
          400
        );
      }
    }
  }
  
  if (updates.applicationRemindersEnabled !== undefined) {
    dbUpdates.application_reminders_enabled = updates.applicationRemindersEnabled;
  }
  if (updates.collaborationRemindersEnabled !== undefined) {
    dbUpdates.collaboration_reminders_enabled = updates.collaborationRemindersEnabled;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Get user roles
 */
export const getUserRoles = async (userId: number) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) throw error;

  return data.map((row) => row.role);
};

/**
 * Get dashboard reminders for a user
 * Returns upcoming and overdue applications and collaborations
 */
export const getUserReminders = async (userId: number): Promise<DashboardReminders> => {
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Query applications due soon (within 7 days)
  const { data: dueSoonApps, error: dueSoonError } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .gte('due_date', now.toISOString().split('T')[0])
    .lte('due_date', sevenDaysFromNow.toISOString().split('T')[0])
    .neq('status', 'Submitted')
    .neq('status', 'Awarded')
    .neq('status', 'Not Awarded')
    .order('due_date', { ascending: true });

  if (dueSoonError) throw dueSoonError;

  // Query overdue applications (past due date and not submitted)
  const { data: overdueApps, error: overdueError } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .lt('due_date', now.toISOString().split('T')[0])
    .neq('status', 'Submitted')
    .neq('status', 'Awarded')
    .neq('status', 'Not Awarded')
    .order('due_date', { ascending: true });

  if (overdueError) throw overdueError;

  // Query collaborations due soon (within 7 days)
  const { data: dueSoonCollabs, error: dueSoonCollabsError } = await supabase
    .from('collaborations')
    .select('*')
    .eq('user_id', userId)
    .not('next_action_due_date', 'is', null)
    .gte('next_action_due_date', now.toISOString().split('T')[0])
    .lte('next_action_due_date', sevenDaysFromNow.toISOString().split('T')[0])
    .neq('status', 'completed')
    .neq('status', 'declined')
    .order('next_action_due_date', { ascending: true });

  if (dueSoonCollabsError) throw dueSoonCollabsError;

  // Query overdue collaborations
  const { data: overdueCollabs, error: overdueCollabsError } = await supabase
    .from('collaborations')
    .select('*')
    .eq('user_id', userId)
    .not('next_action_due_date', 'is', null)
    .lt('next_action_due_date', now.toISOString().split('T')[0])
    .neq('status', 'completed')
    .neq('status', 'declined')
    .order('next_action_due_date', { ascending: true });

  if (overdueCollabsError) throw overdueCollabsError;

  // Query pending collaborations (invited but not accepted)
  const { data: pendingCollabs, error: pendingCollabsError } = await supabase
    .from('collaborations')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'invited'])
    .order('created_at', { ascending: false });

  if (pendingCollabsError) throw pendingCollabsError;

  return {
    applications: {
      dueSoon: dueSoonApps || [],
      overdue: overdueApps || [],
    },
    collaborations: {
      pendingResponse: pendingCollabs || [],
      dueSoon: dueSoonCollabs || [],
      overdue: overdueCollabs || [],
    },
    stats: {
      totalUpcoming: (dueSoonApps?.length || 0) + (dueSoonCollabs?.length || 0),
      totalOverdue: (overdueApps?.length || 0) + (overdueCollabs?.length || 0),
    },
  };
};
