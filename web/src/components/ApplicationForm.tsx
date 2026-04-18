import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPatch } from '../services/api';
import type { ApplicationResponse } from '@scholarship-hub/shared';
import { APPLICATION_STATUSES, TARGET_TYPES } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

function ApplicationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToastHelpers();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scholarshipName, setScholarshipName] = useState('');
  const [organization, setOrganization] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [platform, setPlatform] = useState('');
  const [applicationLink, setApplicationLink] = useState('');
  const [theme, setTheme] = useState('');
  const [minAward, setMinAward] = useState<number | undefined>();
  const [maxAward, setMaxAward] = useState<number | undefined>();
  const [requirements, setRequirements] = useState('');
  const [renewable, setRenewable] = useState(false);
  const [renewableTerms, setRenewableTerms] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [status, setStatus] = useState<string>('Not Started');
  const [targetType, setTargetType] = useState<string>('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [openDate, setOpenDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [basicOpen, setBasicOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [awardOpen, setAwardOpen] = useState(true);
  const [requirementsOpen, setRequirementsOpen] = useState(true);
  const [linksOpen, setLinksOpen] = useState(true);

  useEffect(() => {
    async function fetchApplication() {
      if (!isEditMode) return;
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ApplicationResponse>(`/applications/${id}`);
        setScholarshipName(data.scholarshipName);
        setOrganization(data.organization || '');
        setOrgWebsite(data.orgWebsite || '');
        setPlatform(data.platform || '');
        setApplicationLink(data.applicationLink || '');
        setTheme(data.theme || '');
        setMinAward(data.minAward || undefined);
        setMaxAward(data.maxAward || undefined);
        setRequirements(data.requirements || '');
        setRenewable(data.renewable || false);
        setRenewableTerms(data.renewableTerms || '');
        setCurrentAction(data.currentAction || '');
        setStatus(data.status);
        setTargetType(data.targetType || '');
        setSubmissionDate(data.submissionDate ? data.submissionDate.split('T')[0] : '');
        setOpenDate(data.openDate ? data.openDate.split('T')[0] : '');
        setDueDate(data.dueDate ? data.dueDate.split('T')[0] : '');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load application';
        setError(msg);
        showError('Error', msg);
      } finally {
        setLoading(false);
      }
    }
    fetchApplication();
  }, [id, isEditMode, showError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scholarshipName.trim()) { showError('Validation Error', 'Scholarship name is required', 3000); return; }
    if (!dueDate) { showError('Validation Error', 'Due date is required', 3000); return; }
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        scholarshipName: scholarshipName.trim(),
        organization: organization.trim() || null,
        orgWebsite: orgWebsite.trim() || null,
        platform: platform.trim() || null,
        applicationLink: applicationLink.trim() || null,
        theme: theme.trim() || null,
        minAward: minAward || null,
        maxAward: maxAward || null,
        requirements: requirements.trim() || null,
        renewable: renewable || null,
        renewableTerms: renewable ? renewableTerms.trim() || null : null,
        currentAction: currentAction.trim() || null,
        status,
        targetType: targetType || null,
        submissionDate: submissionDate || null,
        openDate: openDate || null,
        dueDate,
      };
      if (isEditMode) {
        await apiPatch(`/applications/${id}`, payload);
        showSuccess('Success', 'Application updated successfully', 3000);
        navigate(`/applications/${id}`);
      } else {
        const created = await apiPost<ApplicationResponse>('/applications', payload);
        showSuccess('Success', 'Application created successfully', 3000);
        navigate(`/applications/${created.id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save application';
      setError(msg);
      showError('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center gap-4">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading application...</p>
    </div>
  );

  if (error && isEditMode) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card card-body">
        <p className="text-red-500">{error}</p>
        <button className="btn-outline mt-4" onClick={() => navigate('/applications')}>Back to Applications</button>
      </div>
    </div>
  );

  const Section = ({
    title, isOpen, toggle, children,
  }: { title: string; isOpen: boolean; toggle: () => void; children: React.ReactNode }) => (
    <div className="card mb-4">
      <button
        type="button"
        className="w-full text-left flex items-center justify-between px-6 py-4 border-b border-gray-200 hover:bg-gray-50 rounded-t-xl"
        onClick={toggle}
      >
        <span className="section-heading">{title}</span>
        <span className="text-gray-400 text-sm">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="card-body">{children}</div>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
      {/* Sticky header */}
      <div className="sticky top-16 z-10 bg-white border-b border-gray-200 shadow-sm rounded-t-xl px-6 py-4 flex items-center justify-between flex-wrap gap-4 mb-4">
        <h1 className="text-lg font-bold text-gray-900">
          {isEditMode ? 'Edit Application' : 'New Application'}
        </h1>
        <div className="flex gap-3">
          <button
            type="submit"
            form="application-form"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Save')}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate(isEditMode ? `/applications/${id}` : '/applications')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>

      <form id="application-form" onSubmit={handleSubmit}>
        <Section title="Basic Information" isOpen={basicOpen} toggle={() => setBasicOpen(!basicOpen)}>
          <div className="space-y-4">
            <div>
              <label className="field-label">Scholarship Name *</label>
              <input className="field-input" value={scholarshipName} onChange={(e) => setScholarshipName(e.target.value)} placeholder="Enter scholarship name" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Organization</label>
                <input className="field-input" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g., Gates Foundation" />
              </div>
              <div>
                <label className="field-label">Platform</label>
                <input className="field-input" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="e.g., Common App, ScholarshipOwl" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Scholarship Type</label>
                <select className="field-select" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                  <option value="">Select type</option>
                  {TARGET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Theme/Focus Area</label>
                <input className="field-input" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g., STEM, Community Service" />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Status & Tracking" isOpen={statusOpen} toggle={() => setStatusOpen(!statusOpen)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Status *</label>
              <select className="field-select" value={status} onChange={(e) => setStatus(e.target.value)} required>
                {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Current Action Needed</label>
              <input className="field-input" value={currentAction} onChange={(e) => setCurrentAction(e.target.value)} placeholder="e.g., Writing essay" />
            </div>
          </div>
        </Section>

        <Section title="Award & Important Dates" isOpen={awardOpen} toggle={() => setAwardOpen(!awardOpen)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Min Award ($)</label>
                <input type="number" inputMode="numeric" min={0} className="field-input" value={minAward ?? ''} onChange={(e) => { const v = e.currentTarget.value; setMinAward(v === '' ? undefined : Number(v)); }} placeholder="0" />
              </div>
              <div>
                <label className="field-label">Max Award ($)</label>
                <input type="number" inputMode="numeric" min={0} className="field-input" value={maxAward ?? ''} onChange={(e) => { const v = e.currentTarget.value; setMaxAward(v === '' ? undefined : Number(v)); }} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="field-label">Open Date</label>
                <input type="date" className="field-input" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Due Date *</label>
                <input type="date" className="field-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
              <div>
                <label className="field-label">Submission Date (Optional)</label>
                <input type="date" className="field-input" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Requirements & Eligibility" isOpen={requirementsOpen} toggle={() => setRequirementsOpen(!requirementsOpen)}>
          <div className="space-y-4">
            <div>
              <label className="field-label">Requirements</label>
              <textarea className="field-textarea" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="List any specific requirements (GPA, major, citizenship, etc.)" rows={2} />
            </div>
            <div className="p-4 rounded-lg bg-[#F2F4EC] border border-[#97C459] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={renewable} onChange={(e) => setRenewable(e.target.checked)} className="w-4 h-4 accent-brand-500" />
                <span className="font-semibold text-sm text-gray-800">Renewable Scholarship</span>
              </label>
              {renewable && (
                <div>
                  <label className="field-label">Renewal Terms</label>
                  <input className="field-input bg-white" value={renewableTerms} onChange={(e) => setRenewableTerms(e.target.value)} placeholder="Describe renewal requirements (GPA maintenance, continued enrollment, etc.)" />
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section title="Links & Resources" isOpen={linksOpen} toggle={() => setLinksOpen(!linksOpen)}>
          <div className="space-y-4">
            <div>
              <label className="field-label">Organization Website</label>
              <input type="url" className="field-input" value={orgWebsite} onChange={(e) => setOrgWebsite(e.target.value)} placeholder="https://example.com" />
            </div>
            <div>
              <label className="field-label">Application Portal Link</label>
              <input type="url" className="field-input" value={applicationLink} onChange={(e) => setApplicationLink(e.target.value)} placeholder="https://apply.example.com" />
              <p className="text-xs text-gray-500 mt-1">Direct link to the application portal or form</p>
            </div>
          </div>
        </Section>
      </form>
    </div>
  );
}

export default ApplicationForm;
