import { useState } from 'react';

import { APPLICATION_STATUSES, TARGET_TYPES } from '@scholarshipmanage/shared';
import type { TApplicationStatus, TTargetType } from '@scholarshipmanage/shared';

export interface ApplicationFormValues {
  scholarshipName: string;
  organization: string;
  openDate: string;
  dueDate: string;
  submissionDate: string;
  status: TApplicationStatus;
  currentAction: string;
  targetType: TTargetType | '';
  renewable: boolean;
  renewableTerms: string;
  minAward: string;
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
  currentAction: '',
  targetType: '',
  renewable: false,
  renewableTerms: '',
  minAward: '',
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
}

function Section({ title, isOpen, toggle, children, compact = false, summary }: SectionProps) {
  return (
    <div className={`card ${compact ? 'mb-1.5' : 'mb-2'}`}>
      <button
        type="button"
        className={`w-full text-left flex items-center justify-between border-b border-gray-200 hover:bg-gray-50 rounded-t-xl ${compact ? 'px-4 py-2' : 'px-5 py-2.5'}`}
        onClick={toggle}
      >
        <span className="section-heading">{title}</span>
        <span className="flex items-center gap-2 text-xs text-gray-500">
          {!isOpen && summary && <span>{summary}</span>}
          <span className="text-sm text-gray-400">{isOpen ? '▼' : '▶'}</span>
        </span>
      </button>
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
  currentAction: 'application-current-action',
  targetType: 'application-target-type',
  renewable: 'application-renewable',
  renewableTerms: 'application-renewable-terms',
  minAward: 'application-min-award',
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

export function ApplicationFormSections({ values, onChange, compact = false }: ApplicationFormSectionsProps) {
  const [basicOpen, setBasicOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [awardOpen, setAwardOpen] = useState(!compact);
  const [requirementsOpen, setRequirementsOpen] = useState(!compact);
  const [linksOpen, setLinksOpen] = useState(!compact);

  const field = <K extends keyof ApplicationFormValues>(key: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => onChange({ [key]: e.target.value as ApplicationFormValues[K] });

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
        <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-2.5' : 'gap-3'}`}>
          <div>
            <label htmlFor={FIELD_IDS.status} className="field-label">Status</label>
            <select id={FIELD_IDS.status} className="field-select" value={values.status} onChange={field('status')} required>
              {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={FIELD_IDS.currentAction} className="field-label">Current Action</label>
            <input id={FIELD_IDS.currentAction} className="field-input" value={values.currentAction} onChange={field('currentAction')} placeholder="e.g., Writing essay" />
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

      <Section title="Links & Resources" isOpen={linksOpen} toggle={() => setLinksOpen((v) => !v)} compact={compact}>
        <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
          <div>
            <label htmlFor={FIELD_IDS.orgWebsite} className="field-label">Organization Website</label>
            <input id={FIELD_IDS.orgWebsite} type="url" className="field-input" value={values.orgWebsite} onChange={field('orgWebsite')} placeholder="https://example.com" />
          </div>
          <div>
            <label htmlFor={FIELD_IDS.applicationLink} className="field-label">Application Portal Link</label>
            <input id={FIELD_IDS.applicationLink} type="url" className="field-input" value={values.applicationLink} onChange={field('applicationLink')} placeholder="https://apply.example.com" />
          </div>
        </div>
      </Section>
    </>
  );
}
