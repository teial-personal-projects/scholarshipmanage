import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';

const SUBMITTED_STATUS = 'Submitted';

const getTodayDate = (): string => new Date().toISOString().slice(0, 10);

const shouldDefaultSubmissionDate = (
  status: string | undefined,
  submittedDate: string | null | undefined,
): boolean => status === SUBMITTED_STATUS && submittedDate == null;

/**
 * Get all applications for a user
 */
export const getUserApplications = async (userId: number) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*, essays(status), collaborations(status, collaboration_type)')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (error) throw error;

  return data;
};

/**
 * Get single application by ID
 */
export const getApplicationById = async (applicationId: number, userId: number) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
      throw new AppError('Application not found', 404);
    }
    throw error;
  }

  return data;
};

/**
 * Create new application
 */
export const createApplication = async (
  userId: number,
  applicationData: {
    scholarshipName: string;
    targetType?: string | null;
    organization?: string | null;
    orgWebsite?: string | null;
    platform?: string | null;
    applicationLink?: string | null;
    theme?: string | null;
    minAward?: number | null;
    maxAward?: number | null;
    requirements?: string | null;
    renewable?: boolean;
    renewableTerms?: string | null;
    documentInfoLink?: string | null;
    status?: string;
    submissionDate?: string | null;
    openDate?: string | null;
    dueDate: string;
  }
) => {
  // Convert camelCase to snake_case
  const dbData: Record<string, unknown> = {
    user_id: userId,
    scholarship_name: applicationData.scholarshipName,
    due_date: applicationData.dueDate,
  };

  if (applicationData.targetType !== undefined) dbData.target_type = applicationData.targetType;
  if (applicationData.organization !== undefined) dbData.organization = applicationData.organization;
  if (applicationData.orgWebsite !== undefined) dbData.org_website = applicationData.orgWebsite;
  if (applicationData.platform !== undefined) dbData.platform = applicationData.platform;
  if (applicationData.applicationLink !== undefined) dbData.application_link = applicationData.applicationLink;
  if (applicationData.theme !== undefined) dbData.theme = applicationData.theme;
  if (applicationData.minAward !== undefined) dbData.min_award = applicationData.minAward;
  if (applicationData.maxAward !== undefined) dbData.max_award = applicationData.maxAward;
  if (applicationData.requirements !== undefined) dbData.requirements = applicationData.requirements;
  if (applicationData.renewable !== undefined) dbData.renewable = applicationData.renewable;
  if (applicationData.renewableTerms !== undefined) dbData.renewable_terms = applicationData.renewableTerms;
  if (applicationData.documentInfoLink !== undefined) dbData.document_info_link = applicationData.documentInfoLink;
  if (applicationData.status !== undefined) dbData.status = applicationData.status;
  if (applicationData.submissionDate !== undefined) dbData.submission_date = applicationData.submissionDate;
  if (applicationData.openDate !== undefined) dbData.open_date = applicationData.openDate;

  if (shouldDefaultSubmissionDate(applicationData.status, applicationData.submissionDate)) {
    dbData.submission_date = getTodayDate();
  }

  const { data, error } = await supabase
    .from('applications')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Update application
 */
export const updateApplication = async (
  applicationId: number,
  userId: number,
  updates: {
    scholarshipName?: string;
    targetType?: string | null;
    organization?: string | null;
    orgWebsite?: string | null;
    platform?: string | null;
    applicationLink?: string | null;
    theme?: string | null;
    minAward?: number | null;
    maxAward?: number | null;
    requirements?: string | null;
    renewable?: boolean;
    renewableTerms?: string | null;
    documentInfoLink?: string | null;
    status?: string;
    submissionDate?: string | null;
    openDate?: string | null;
    dueDate?: string;
  }
) => {
  // First verify the application belongs to the user
  const existingApplication = await getApplicationById(applicationId, userId);

  // Convert camelCase to snake_case
  const dbUpdates: Record<string, unknown> = {};

  if (updates.scholarshipName !== undefined) dbUpdates.scholarship_name = updates.scholarshipName;
  if (updates.targetType !== undefined) dbUpdates.target_type = updates.targetType;
  if (updates.organization !== undefined) dbUpdates.organization = updates.organization;
  if (updates.orgWebsite !== undefined) dbUpdates.org_website = updates.orgWebsite;
  if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
  if (updates.applicationLink !== undefined) dbUpdates.application_link = updates.applicationLink;
  if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
  if (updates.minAward !== undefined) dbUpdates.min_award = updates.minAward;
  if (updates.maxAward !== undefined) dbUpdates.max_award = updates.maxAward;
  if (updates.requirements !== undefined) dbUpdates.requirements = updates.requirements;
  if (updates.renewable !== undefined) dbUpdates.renewable = updates.renewable;
  if (updates.renewableTerms !== undefined) dbUpdates.renewable_terms = updates.renewableTerms;
  if (updates.documentInfoLink !== undefined) dbUpdates.document_info_link = updates.documentInfoLink;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.submissionDate !== undefined) dbUpdates.submission_date = updates.submissionDate;
  if (updates.openDate !== undefined) dbUpdates.open_date = updates.openDate;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;

  if (
    shouldDefaultSubmissionDate(
      updates.status,
      updates.submissionDate === undefined
        ? existingApplication.submission_date
        : updates.submissionDate,
    )
  ) {
    dbUpdates.submission_date = getTodayDate();
  }

  const { data, error } = await supabase
    .from('applications')
    .update(dbUpdates)
    .eq('id', applicationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Delete application
 */
export const deleteApplication = async (applicationId: number, userId: number) => {
  // First verify the application belongs to the user
  await getApplicationById(applicationId, userId);

  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)
    .eq('user_id', userId);

  if (error) throw error;
};
