/**
 * Essays Service
 * Business logic for essay management
 */

import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';

/**
 * Get all essays for a specific application
 */
export const getEssaysByApplicationId = async (applicationId: number, userId: number) => {
  // First verify the application belongs to the user
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();

  if (appError || !application) {
    throw new AppError('Application not found', 404);
  }

  const { data, error } = await supabase
    .from('essays')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

/**
 * Get a single essay by ID (with ownership verification)
 */
export const getEssayById = async (essayId: number, userId: number) => {
  const { data, error } = await supabase
    .from('essays')
    .select(`
      *,
      applications!inner(user_id)
    `)
    .eq('id', essayId)
    .eq('applications.user_id', userId)
    .single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
      throw new AppError('Essay not found', 404);
    }
    throw error;
  }

  // Remove the nested applications object
  const { applications, ...essay } = data as any;
  return essay;
};

/**
 * Create a new essay for an application
 */
export const createEssay = async (applicationId: number, userId: number, essayData: {
  theme?: string;
  units?: string;
  essayLink?: string;
  wordCount?: number;
  status?: string;
}) => {
  // First verify the application belongs to the user
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();

  if (appError || !application) {
    throw new AppError('Application not found', 404);
  }

  // Convert camelCase to snake_case
  const dbData: Record<string, unknown> = {
    application_id: applicationId,
  };

  if (essayData.theme !== undefined) dbData.theme = essayData.theme;
  if (essayData.units !== undefined) dbData.units = essayData.units;
  if (essayData.essayLink !== undefined) dbData.essay_link = essayData.essayLink;
  if (essayData.wordCount !== undefined) dbData.word_count = essayData.wordCount;
  if (essayData.status !== undefined) dbData.status = essayData.status;

  const { data, error } = await supabase
    .from('essays')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Update an essay
 */
export const updateEssay = async (essayId: number, userId: number, essayData: {
  theme?: string;
  units?: string;
  essayLink?: string;
  wordCount?: number;
  status?: string;
}) => {
  // First verify the essay belongs to the user's application
  await getEssayById(essayId, userId);

  // Convert camelCase to snake_case
  const dbData: Record<string, unknown> = {};

  if (essayData.theme !== undefined) dbData.theme = essayData.theme;
  if (essayData.units !== undefined) dbData.units = essayData.units;
  if (essayData.essayLink !== undefined) dbData.essay_link = essayData.essayLink;
  if (essayData.wordCount !== undefined) dbData.word_count = essayData.wordCount;
  if (essayData.status !== undefined) dbData.status = essayData.status;

  const { data, error } = await supabase
    .from('essays')
    .update(dbData)
    .eq('id', essayId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Delete an essay
 */
export const deleteEssay = async (essayId: number, userId: number) => {
  // First verify the essay belongs to the user's application
  await getEssayById(essayId, userId);

  const { error } = await supabase
    .from('essays')
    .delete()
    .eq('id', essayId);

  if (error) throw error;
};
