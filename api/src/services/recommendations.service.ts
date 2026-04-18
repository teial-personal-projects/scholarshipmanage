/**
 * Recommendations Service
 * Business logic for recommendation management
 */

import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';

/**
 * Get all recommendations for a specific application
 */
export const getRecommendationsByApplicationId = async (
  applicationId: number,
  userId: number
) => {
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
    .from('recommendations')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

/**
 * Get single recommendation by ID
 */
export const getRecommendationById = async (recommendationId: number, userId: number) => {
  const { data, error } = await supabase
    .from('recommendations')
    .select(`
      *,
      applications!inner(user_id)
    `)
    .eq('id', recommendationId)
    .eq('applications.user_id', userId)
    .single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
      throw new AppError('Recommendation not found', 404);
    }
    throw error;
  }

  // Remove the nested applications object
  const { applications, ...recommendation } = data as any;
  return recommendation;
};

/**
 * Create new recommendation
 */
export const createRecommendation = async (
  userId: number,
  recommendationData: {
    applicationId: number;
    recommenderId: number;
    status?: string;
    submittedAt?: string;
    dueDate?: string;
  }
) => {
  // First verify the application belongs to the user
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('id')
    .eq('id', recommendationData.applicationId)
    .eq('user_id', userId)
    .single();

  if (appError || !application) {
    throw new AppError('Application not found', 404);
  }

  // Verify the recommender (collaborator) belongs to the user
  const { data: collaborator, error: collabError } = await supabase
    .from('collaborators')
    .select('id')
    .eq('id', recommendationData.recommenderId)
    .eq('user_id', userId)
    .single();

  if (collabError || !collaborator) {
    throw new AppError('Recommender (collaborator) not found', 404);
  }

  // Convert camelCase to snake_case
  const dbData: Record<string, unknown> = {
    application_id: recommendationData.applicationId,
    recommender_id: recommendationData.recommenderId,
  };

  if (recommendationData.status !== undefined) dbData.status = recommendationData.status;
  if (recommendationData.submittedAt !== undefined)
    dbData.submitted_at = recommendationData.submittedAt;
  if (recommendationData.dueDate !== undefined) dbData.due_date = recommendationData.dueDate;

  const { data, error } = await supabase
    .from('recommendations')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Update recommendation
 */
export const updateRecommendation = async (
  recommendationId: number,
  userId: number,
  updates: {
    status?: string;
    submittedAt?: string;
    dueDate?: string;
  }
) => {
  // First verify the recommendation belongs to the user's application
  await getRecommendationById(recommendationId, userId);

  // Convert camelCase to snake_case
  const dbUpdates: Record<string, unknown> = {};

  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.submittedAt !== undefined) dbUpdates.submitted_at = updates.submittedAt;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;

  const { data, error } = await supabase
    .from('recommendations')
    .update(dbUpdates)
    .eq('id', recommendationId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Delete recommendation
 */
export const deleteRecommendation = async (recommendationId: number, userId: number) => {
  // First verify the recommendation belongs to the user's application
  await getRecommendationById(recommendationId, userId);

  const { error } = await supabase.from('recommendations').delete().eq('id', recommendationId);

  if (error) throw error;
};

