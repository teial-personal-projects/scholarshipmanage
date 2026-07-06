import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { APPLICATION_STATUSES, TARGET_TYPES } from '@scholarshipmanage/shared';
import type { TApplicationStatus, TTargetType } from '@scholarshipmanage/shared';
import { getTodayDateInputValue } from '../utils/date';

export interface ApplicationFormValues {
  scholarshipName: string;
  organization: string;
  openDate: string;
  dueDate: string;
  submissionDate: string;
  status: TApplicationStatus;
  targetType: TTargetType | '';
  renewable: boolean;
  renewableTerms: string;
  minAward: string;
  recommendationCount: string;
  maxAward: string;
  platform: string;
  theme: string;
  orgWebsite: string;
  applicationLink: string;
  requirements: string;
}

export const EMPTY_FORM_VALUES: ApplicationFormValues = {
  scholarshipName: '',
  organization: '',
  openDate: '',
  dueDate: '',
  submissionDate: '',
  status: 'Not Started',
  targetType: '',
  renewable: false,
  renewableTerms: '',
  minAward: '',
  recommendationCount: '0',
  maxAward: '',
  platform: '',
  theme: '',
  orgWebsite: '',
  applicationLink: '',
  requirements: '',
};

interface SectionProps {
  title: string;
  isOpen: boolean;
  toggle: () => void;
  children: React.ReactNode;
  compact?: boolean;
  summary?: string;
  collapsedActions?: React.ReactNode;
}

function Section({ title, isOpen, toggle, children, compact = false, summary, collapsedActions }: SectionProps) {
  return (
    <div className={`card ${compact ? 'mb-1.5' : 'mb-2'}`}>
      <div className="flex items-center border-b border-gray-200 rounded-t-xl">
        <button
          type="button"
          className={`min-w-0 flex-1 text-left flex items-center justify-between hover:bg-gray-50 rounded-tl-xl ${compact ? 'px-4 py-2' : 'px-5 py-2.5'}`}
          onClick={toggle}
        >
          <span className="section-heading truncate">{title}</span>
          <span className="flex items-center gap-2 text-xs text-gray-500 pl-3">
            {!isOpen && summary && <span>{summary}</span>}
            <span className="text-sm text-gray-400">{isOpen ? '▼' : '▶'}</span>
          </span>
        </button>
        {!isOpen && collapsedActions && (
          <div className={`flex shrink-0 items-center gap-2 ${compact ? 'pr-4' : 'pr-5'}`}>
            {collapsedActions}
          </div>
        )}
      </div>
      {isOpen && <div className={compact ? 'px-4 py-2.5' : 'px-5 py-3'}>{children}</div>}
    </div>
  );
}

interface ApplicationFormSectionsProps {
  values: ApplicationFormValues;
  onChange: (updates: Partial<ApplicationFormValues>) => void;
  compact?: boolean;
}

const FIELD_IDS: Record<keyof ApplicationFormValues, string> = {
  scholarshipName: 'application-scholarship-name',
  organization: 'application-organization',
  openDate: 'application-open-date',
  dueDate: 'application-due-date',
  submissionDate: 'application-submission-date',
  status: 'application-status',
  targetType: 'application-target-type',
  renewable: 'application-renewable',
  renewableTerms: 'application-renewable-terms',
  minAward: 'application-min-award',
  recommendationCount: 'application-recommendation-count',
  maxAward: 'application-max-award',
  platform: 'application-platform',
  theme: 'application-theme',
  orgWebsite: 'application-org-website',
  applicationLink: 'application-link',
  requirements: 'application-requirements',
};

function formatAwardSummary(values: ApplicationFormValues): string | undefined {
  const minAward = Number(values.minAward);
  const maxAward = Number(values.maxAward);
  const hasMinAward = values.minAward.trim() !== '' && !Number.isNaN(minAward);
  const hasMaxAward = values.maxAward.trim() !== '' && !Number.isNaN(maxAward);

  if (hasMinAward && hasMaxAward && minAward !== maxAward) {
    return `$${minAward.toLocaleString()} - $${maxAward.toLocaleString()}`;
  }

  if (hasMaxAward) return `Max $${maxAward.toLocaleString()}`;
  if (hasMinAward) return `$${minAward.toLocaleString()}`;
  return undefined;
}

function getExternalUrl(url: string): string | undefined {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return undefined;

  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
}

interface UrlFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  openLabel: string;
}

interface ResourceLinkProps {
  url: string;
  label: string;
  ariaLabel: string;
}

function ResourceLink({ url, label, ariaLabel }: ResourceLinkProps) {
  const externalUrl = getExternalUrl(url);
  if (!externalUrl) return null;

  return (
    <a
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
      aria-label={ariaLabel}
    >
      <span>{label}</span>
      <ExternalLink size={13} />
    </a>
  );
}

function UrlField({ id, label, value, onChange, placeholder, openLabel }: UrlFieldProps) {
  const externalUrl = getExternalUrl(value);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="field-label">{label}</label>
        {externalUrl && (
          <ResourceLink url={value} label="Open" ariaLabel={openLabel} />
        )}
      </div>
      <input id={id} type="url" className="field-input" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

export function ApplicationFormSections({ values, onChange, compact = false }: ApplicationFormSectionsProps) {
  const [basicOpen, setBasicOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [awardOpen, setAwardOpen] = useState(!compact);
  const [requirementsOpen, setRequirementsOpen] = useState(!compact);
  const [linksOpen, setLinksOpen] = useState(!compact);

  const field = <K extends keyof ApplicationFormValues>(key: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => onChange({ [key]: e.target.value as ApplicationFormValues[K] });

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as TApplicationStatus;
    onChange({
      status: nextStatus,
      ...(nextStatus === 'Submitted' && !values.submissionDate && {
        submissionDate: getTodayDateInputValue(),
      }),
    });
  };

  const hasResourceLinks = values.orgWebsite.trim() !== '' || values.applicationLink.trim() !== '';
  const collapsedResourceLinks = hasResourceLinks ? (
    <>
      <ResourceLink url={values.orgWebsite} label="Org" ariaLabel="Open organization website" />
      <ResourceLink url={values.applicationLink} label="Portal" ariaLabel="Open application portal" />
    </>
  ) : undefined;

  return (
    <>
      <Section title="Basic Information" isOpen={basicOpen} toggle={() => setBasicOpen((v) => !v)} compact={compact}>
        <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
          <div>
            <label htmlFor={FIELD_IDS.scholarshipName} className="field-label">Scholarship Name *</label>
            <input id={FIELD_IDS.scholarshipName} className="field-input" value={values.scholarshipName} onChange={field('scholarshipName')} placeholder="Enter scholarship name" required />
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-2.5' : 'gap-3'}`}>
            <div>
              <label htmlFor={FIELD_IDS.organization} className="field-label">Organization</label>
              <input id={FIELD_IDS.organization} className="field-input" value={values.organization} onChange={field('organization')} placeholder="e.g., Gates Foundation" />
            </div>
            <div>
              <label htmlFor={FIELD_IDS.platform} className="field-label">Platform</label>
              <input id={FIELD_IDS.platform} className="field-input" value={values.platform} onChange={field('platform')} placeholder="e.g., Common App, ScholarshipOwl" />
            </div>
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-3 ${compact ? 'gap-2.5' : 'gap-3'}`}>
            <div>
              <label htmlFor={FIELD_IDS.openDate} className="field-label">Open Date</label>
              <input id={FIELD_IDS.openDate} type="date" className="field-input" value={values.openDate} onChange={field('openDate')} />
            </div>
            <div>
              <label htmlFor={FIELD_IDS.dueDate} className="field-label">Due Date *</label>
              <input id={FIELD_IDS.dueDate} type="date" className="field-input" value={values.dueDate} onChange={field('dueDate')} required />
            </div>
            <div>
              <label htmlFor={FIELD_IDS.submissionDate} className="field-label">Submission Date</label>
              <input id={FIELD_IDS.submissionDate} type="date" className="field-input" value={values.submissionDate} onChange={field('submissionDate')} />
            </div>
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-2.5' : 'gap-3'}`}>
            <div>
              <label htmlFor={FIELD_IDS.targetType} className="field-label">Scholarship Type</label>
              <select id={FIELD_IDS.targetType} className="field-select" value={values.targetType} onChange={field('targetType')}>
                <option value="">Select type</option>
                {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={FIELD_IDS.theme} className="field-label">Theme/Focus Area</label>
              <input id={FIELD_IDS.theme} className="field-input" value={values.theme} onChange={field('theme')} placeholder="e.g., STEM, Community Service" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Status & Tracking" isOpen={statusOpen} toggle={() => setStatusOpen((v) => !v)} compact={compact}>
        <div className={`grid grid-cols-1 ${compact ? 'gap-2.5' : 'gap-3'}`}>
          <div>
            <label htmlFor={FIELD_IDS.status} className="field-label">Status</label>
            <select id={FIELD_IDS.status} className="field-select" value={values.status} onChange={handleStatusChange} required>
              {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section
        title="Award"
        isOpen={awardOpen}
        toggle={() => setAwardOpen((v) => !v)}
        compact={compact}
        summary={formatAwardSummary(values)}
      >
        <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-2.5' : 'gap-3'}`}>
            <div>
              <label htmlFor={FIELD_IDS.minAward} className="field-label">Min Award ($)</label>
              <input id={FIELD_IDS.minAward} type="number" inputMode="numeric" min={0} className="field-input" value={values.minAward} onChange={field('minAward')} placeholder="0" />
            </div>
            <div>
              <label htmlFor={FIELD_IDS.maxAward} className="field-label">Max Award ($)</label>
              <input id={FIELD_IDS.maxAward} type="number" inputMode="numeric" min={0} className="field-input" value={values.maxAward} onChange={field('maxAward')} placeholder="0" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={FIELD_IDS.renewable}
              className="w-4 h-4 accent-brand-500"
              checked={values.renewable}
              onChange={(e) => onChange({ renewable: e.target.checked })}
            />
            <label htmlFor={FIELD_IDS.renewable} className="text-sm font-semibold text-gray-800 cursor-pointer">Renewable</label>
          </div>
          {values.renewable && (
            <div>
              <label htmlFor={FIELD_IDS.renewableTerms} className="field-label">Renewal Terms</label>
              <input id={FIELD_IDS.renewableTerms} className="field-input" value={values.renewableTerms} onChange={field('renewableTerms')} placeholder="Describe renewal requirements..." />
            </div>
          )}
        </div>
      </Section>

      <Section title="Requirements & Eligibility" isOpen={requirementsOpen} toggle={() => setRequirementsOpen((v) => !v)} compact={compact}>
        <div>
          <label htmlFor={FIELD_IDS.requirements} className="field-label">Requirements</label>
          <textarea id={FIELD_IDS.requirements} className="field-textarea" value={values.requirements} onChange={field('requirements')} placeholder="List any specific requirements (GPA, major, citizenship, etc.)" rows={2} />
        </div>
      </Section>

      <Section
        title="Links & Resources"
        isOpen={linksOpen}
        toggle={() => setLinksOpen((v) => !v)}
        compact={compact}
        collapsedActions={collapsedResourceLinks}
      >
        <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
          <UrlField
            id={FIELD_IDS.orgWebsite}
            label="Organization Website"
            value={values.orgWebsite}
            onChange={field('orgWebsite')}
            placeholder="https://example.com"
            openLabel="Open organization website"
          />
          <UrlField
            id={FIELD_IDS.applicationLink}
            label="Application Portal Link"
            value={values.applicationLink}
            onChange={field('applicationLink')}
            placeholder="https://apply.example.com"
            openLabel="Open application portal"
          />
        </div>
      </Section>
    </>
  );
}
