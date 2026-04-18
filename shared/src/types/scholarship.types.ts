import type {
  SubjectArea,
} from './application.constants.js';

export interface Scholarship {
  scholarshipId?: number;
  title: string;
  description?: string;
  organization?: string;
  orgWebsite?: string;
  targetType?: string;
  subjectAreas?: SubjectArea[];
  minAward?: number;
  maxAward?: number;
  minGpa?: number;
  deadline?: string;
  eligibility?: string[];
  gender?: string;
  ethnicity?: string[];
  academicLevel?: string[];
  essayRequired?: boolean;
  recommendationRequired?: boolean;
  renewable?: boolean;
  geographicRestrictions?: string[];
  applyUrl?: string;
  sourceUrl?: string;
  source?: string;
  country?: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}