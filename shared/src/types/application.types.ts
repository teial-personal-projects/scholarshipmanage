import type { Recommendation } from './recommendation.types.js';
import type { Essay } from './essay.types.js';
import type { TApplicationStatus, TTargetType } from './application.constants.js';

export interface Application {
  applicationId?: number;
  userId: number;
  scholarshipName: string;
  targetType: TTargetType;
  organization: string;
  orgWebsite: string;
  platform: string;
  applicationLink: string;
  theme: string;
  minAward: number;
  maxAward: number;
  requirements: string;
  renewable: boolean;
  renewableTerms?: string;
  currentAction: string;
  status: TApplicationStatus;
  submissionDate?: Date;
  openDate?: Date;
  dueDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
  recommendations?: Recommendation[];
  essays?: Essay[];
}
