export const APPLICATION_STATUSES = ['Not Started', 'In Progress', 'Submitted', 'Awarded', 'Not Awarded'] as const;
export const TARGET_TYPES = ['Merit', 'Need', 'Both'] as const;
export const RECOMMENDATION_STATUSES = ['Pending', 'Submitted'] as const;
export const SUBMISSION_METHODS = ['DirectEmail', 'StudentUpload', 'DirectMail'] as const;

export type TApplicationStatus = typeof APPLICATION_STATUSES[number];
export type TTargetType = typeof TARGET_TYPES[number];
export type TRecommendationStatus = typeof RECOMMENDATION_STATUSES[number];
export type TSubmissionMethod = typeof SUBMISSION_METHODS[number];

// Education Level options and type
export const educationLevelsOptions = [
  'High School',
  'Undergraduate',
  'Graduate',
  'High School Junior',
  'High School Senior',
  'College Freshman',
  'College Sophomore',
  'College Junior',
  'College Senior',
  'Graduate Student',
] as const;
export type EducationLevel = typeof educationLevelsOptions[number];

// Target Type options and type
export const targetTypeOptions = ['Merit', 'Need', 'Both'] as const;
export type TargetType = typeof targetTypeOptions[number];

// Subject Areas options and type
export const subjectAreasOptions = [
  'Agriculture',
  'Arts',
  'Architecture',
  'Athletics',
  'Aviation',
  'Biology',
  'Business',
  'Chemistry',
  'Communication',
  'Community Service',
  'Criminal Justice',
  'Culinary Arts',
  'Computer Science',
  'Dance',
  'Dentistry',
  'Disablity',
  'Design',
  'Drama',
  'Economics',
  'Education',
  'Engineering',
  'Environmental Science',
  'Healthcare',
  'Humanities',
  'Journalism',
  'Law',
  'Mathematics',
  'Medicine',
  'Music',
  'Military',
  'Nursing',
  'Physics',
  'Psychology',
  'Public Policy',
  'Religion',
  'Science',
  'Social Sciences',
  'STEM',
  'Writing',
] as const;
export type SubjectArea = typeof subjectAreasOptions[number];

// Gender options and type
export const genderOptions = [
  'Male',
  'Female',
  'Non-Binary',
] as const;
export type Gender = typeof genderOptions[number];

// Ethnicity options and type
export const ethnicityOptions = [
  'Asian/Pacific Islander',
  'Black/African American',
  'Hispanic/Latino',
  'White/Caucasian',
  'Native American/Alaska Native',
  'Native Hawaiian/Pacific Islander',
  'Middle Eastern/North African',
  'South Asian',
  'East Asian',
  'Southeast Asian',
  'Other',
] as const;
export type Ethnicity = typeof ethnicityOptions[number]; 

export const recomendationOptions = [
  'Pending',
  'Submitted'
] as const 


export const submissionMethodOptions = [
  'DirectEmail',
  'StudentUpload',
  'DirectMail'
] as const

export const applicationStatusOptions = [
  'Not Started',
  'In Progress',
  'Submitted',
  'Awarded',
  'Not Awarded'
] as const

export const currentActionOptions = [
  'Waiting for Recommendations',
  'Waiting for Essay Review',
  'Ready to Submit',
  'N/A'
] as const


export const academicLevelOptions = [
  'Undergraduate',
  'Graduate',
  'High School',
  'College Freshman',
  'College Sophomore',
  'College Junior',
  'College Senior',
  'Graduate Student'
] as const

export type ApplicationStatus = typeof applicationStatusOptions[number]
export type RecommendationStatus = typeof recomendationOptions[number]
export type SubmissionMethod = typeof submissionMethodOptions[number]
export type CurrentAction = typeof currentActionOptions[number]
