/**
 * Collaborators Service
 * Business logic for collaborator management
 */

import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';
import { sanitizePhoneNumber, sanitizeEmail } from '@scholarship-hub/shared';

/**
 * Get all collaborators for a user
 */
export const getUserCollaborators = async (userId: number) => {
  const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

/**
 * Get single collaborator by ID
 */
export const getCollaboratorById = async (collaboratorId: number, userId: number) => {
  const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('id', collaboratorId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
      throw new AppError('Collaborator not found', 404);
    }
    throw error;
  }

  return data;
};

/**
 * Create new collaborator
 */
export const createCollaborator = async (
  userId: number,
  collaboratorData: {
    firstName: string;
    lastName: string;
    emailAddress: string;
    relationship?: string;
    phoneNumber?: string | null;
  }
) => {
  // Sanitize and validate email
  const sanitizedEmail = sanitizeEmail(collaboratorData.emailAddress);
  
  // Sanitize and validate phone number (store in E.164 format)
  let phoneToStore: string | undefined | null;
  if (collaboratorData.phoneNumber) {
    try {
      phoneToStore = sanitizePhoneNumber(collaboratorData.phoneNumber, {
        defaultCountry: 'US',
        format: 'E164', // Store in international format
      });
    } catch (error) {
      // Be lenient: store the trimmed original if normalization fails.
      // This avoids blocking saves when users enter placeholders like (555) 555-5555.
      phoneToStore = collaboratorData.phoneNumber.trim() || null;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ collaborator phone not normalized, storing raw', {
          phoneNumber: collaboratorData.phoneNumber,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Convert camelCase to snake_case
  const dbData: Record<string, unknown> = {
    user_id: userId,
    first_name: collaboratorData.firstName.trim(),
    last_name: collaboratorData.lastName.trim(),
    email_address: sanitizedEmail,
  };

  if (collaboratorData.relationship !== undefined) {
    dbData.relationship = collaboratorData.relationship.trim();
  }
  if (phoneToStore !== undefined) {
    dbData.phone_number = phoneToStore;
  }

  const { data, error } = await supabase
    .from('collaborators')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Update collaborator
 */
export const updateCollaborator = async (
  collaboratorId: number,
  userId: number,
  updates: {
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    relationship?: string;
    phoneNumber?: string | null;
  }
) => {
  // First verify the collaborator belongs to the user
  await getCollaboratorById(collaboratorId, userId);

  // Convert camelCase to snake_case and sanitize inputs
  const dbUpdates: Record<string, unknown> = {};

  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName.trim();
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName.trim();
  
  if (updates.emailAddress !== undefined) {
    try {
      dbUpdates.email_address = sanitizeEmail(updates.emailAddress);
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : 'Invalid email format',
        400
      );
    }
  }
  
  if (updates.relationship !== undefined) {
    dbUpdates.relationship = updates.relationship.trim();
  }
  
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
        // Be lenient: store the trimmed original if normalization fails.
        dbUpdates.phone_number = updates.phoneNumber.trim();
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ collaborator phone not normalized, storing raw', {
            phoneNumber: updates.phoneNumber,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('collaborators')
    .update(dbUpdates)
    .eq('id', collaboratorId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Delete collaborator
 */
export const deleteCollaborator = async (collaboratorId: number, userId: number) => {
  // First verify the collaborator belongs to the user
  await getCollaboratorById(collaboratorId, userId);

  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('id', collaboratorId)
    .eq('user_id', userId);

  if (error) throw error;
};

