import { supabase } from '../config/supabase.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';

/**
 * Helper to get user profile by auth user ID
 */
export const getUserProfileByAuthId = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Helper to get user profile by ID
 */
export const getUserProfileById = async (userId: number) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Generic helper for SELECT queries
 */
export const fetchOne = async <T>(
  table: string,
  filters: Record<string, unknown>
): Promise<T | null> => {
  let query = supabase.from(table).select('*');

  // Apply filters
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query.single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) return null;
    throw error;
  }

  return data as T;
};

/**
 * Generic helper for SELECT queries returning multiple rows
 */
export const fetchMany = async <T>(
  table: string,
  filters?: Record<string, unknown>
): Promise<T[]> => {
  let query = supabase.from(table).select('*');

  // Apply filters if provided
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []) as T[];
};

/**
 * Generic helper for INSERT queries
 */
export const insertOne = async <T>(
  table: string,
  values: Record<string, unknown>
): Promise<T> => {
  const { data, error } = await supabase
    .from(table)
    .insert(values)
    .select()
    .single();

  if (error) throw error;

  return data as T;
};

/**
 * Generic helper for UPDATE queries
 */
export const updateOne = async <T>(
  table: string,
  id: number,
  values: Record<string, unknown>
): Promise<T> => {
  const { data, error } = await supabase
    .from(table)
    .update(values)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return data as T;
};

/**
 * Generic helper for DELETE queries
 */
export const deleteOne = async (table: string, id: number): Promise<void> => {
  const { error } = await supabase.from(table).delete().eq('id', id);

  if (error) throw error;
};
