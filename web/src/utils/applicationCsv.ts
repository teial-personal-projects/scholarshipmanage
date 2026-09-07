import type { ApplicationResponse } from '@scholarshipmanage/shared';

import { getTodayDateInputValue, toDateOnlyString } from './date';

const CSV_HEADERS = [
  'Scholarship Name',
  'Organization',
  'Status',
  'Target Type',
  'Due Date',
  'Open Date',
  'Submission Date',
  'Minimum Award',
  'Maximum Award',
  'Renewable',
  'Renewable Terms',
  'Recommendations Required',
  'Requirements',
  'Theme',
  'Platform',
  'Organization Website',
  'Application Link',
] as const;

function protectSpreadsheetFormula(value: string): string {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';

  const safeValue = protectSpreadsheetFormula(String(value));
  return /[",\r\n]/.test(safeValue)
    ? `"${safeValue.replace(/"/g, '""')}"`
    : safeValue;
}

function applicationToCsvRow(application: ApplicationResponse): (string | number | null | undefined)[] {
  return [
    application.scholarshipName,
    application.organization,
    application.status,
    application.targetType,
    toDateOnlyString(application.dueDate),
    toDateOnlyString(application.openDate),
    toDateOnlyString(application.submissionDate),
    application.minAward,
    application.maxAward,
    application.renewable == null ? null : application.renewable ? 'Yes' : 'No',
    application.renewableTerms,
    application.recommendationCount,
    application.requirements,
    application.theme,
    application.platform,
    application.orgWebsite,
    application.applicationLink,
  ];
}

export function createApplicationsCsv(applications: readonly ApplicationResponse[]): string {
  const rows = [CSV_HEADERS, ...applications.map(applicationToCsvRow)];
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadApplicationsCsv(applications: readonly ApplicationResponse[]): void {
  const csv = createApplicationsCsv(applications);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `scholarships-${getTodayDateInputValue()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
