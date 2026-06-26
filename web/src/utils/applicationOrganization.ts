import type { ApplicationResponse } from '@scholarshipmanage/shared';

const ORGANIZATION_MARKERS = [
  /\s+diversity\s+in\s+/i,
  /\s+women\s+in\s+/i,
  /\s+scholarship\b/i,
  /\s+program\b/i,
  /\s+stem\b/i,
  /:/,
];

function deriveOrganizationFromName(scholarshipName: string): string | null {
  const trimmedName = scholarshipName.trim();
  if (!trimmedName) return null;

  for (const marker of ORGANIZATION_MARKERS) {
    const match = marker.exec(trimmedName);
    if (!match || match.index === 0) continue;

    const candidate = trimmedName.slice(0, match.index).trim();
    if (candidate.length > 1 && candidate.toLowerCase() !== trimmedName.toLowerCase()) {
      return candidate;
    }
  }

  return null;
}

export function getApplicationOrganizationLabel(application: ApplicationResponse): string | null {
  const organization = application.organization?.trim();
  if (organization) return organization;

  return deriveOrganizationFromName(application.scholarshipName);
}
