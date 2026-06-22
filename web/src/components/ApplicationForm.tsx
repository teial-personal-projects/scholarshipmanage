import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { apiGet, apiPost, apiPatch } from '../services/api';
import type { ApplicationResponse } from '@scholarshipmanage/shared';
import { useToastHelpers } from '../utils/toast';
import { ApplicationFormSections, EMPTY_FORM_VALUES } from './ApplicationFormSections';
import type { ApplicationFormValues } from './ApplicationFormSections';

function toPayload(values: ApplicationFormValues) {
  const toNum = (s: string) => { const n = Number(s); return s.trim() && !Number.isNaN(n) ? n : null; };
  return {
    scholarshipName: values.scholarshipName.trim(),
    organization: values.organization.trim() || null,
    orgWebsite: values.orgWebsite.trim() || null,
    platform: values.platform.trim() || null,
    applicationLink: values.applicationLink.trim() || null,
    theme: values.theme.trim() || null,
    minAward: toNum(values.minAward),
    maxAward: toNum(values.maxAward),
    requirements: values.requirements.trim() || null,
    renewable: values.renewable,
    renewableTerms: values.renewable ? values.renewableTerms.trim() || null : null,
    currentAction: values.currentAction.trim() || null,
    status: values.status,
    targetType: values.targetType || null,
    submissionDate: values.submissionDate || null,
    openDate: values.openDate || null,
    dueDate: values.dueDate,
  };
}

function ApplicationForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToastHelpers();
  const isEditMode = !!id;

  const [values, setValues] = useState<ApplicationFormValues>(EMPTY_FORM_VALUES);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (updates: Partial<ApplicationFormValues>) =>
    setValues((prev) => ({ ...prev, ...updates }));

  useEffect(() => {
    if (!isEditMode) return;
    async function fetchApplication() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ApplicationResponse>(`/applications/${id}`);
        setValues({
          scholarshipName: data.scholarshipName,
          organization: data.organization ?? '',
          orgWebsite: data.orgWebsite ?? '',
          platform: data.platform ?? '',
          applicationLink: data.applicationLink ?? '',
          theme: data.theme ?? '',
          minAward: data.minAward?.toString() ?? '',
          maxAward: data.maxAward?.toString() ?? '',
          requirements: data.requirements ?? '',
          renewable: data.renewable ?? false,
          renewableTerms: data.renewableTerms ?? '',
          currentAction: data.currentAction ?? '',
          status: data.status,
          targetType: data.targetType ?? '',
          submissionDate: data.submissionDate ? data.submissionDate.split('T')[0] : '',
          openDate: data.openDate ? data.openDate.split('T')[0] : '',
          dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
        });
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
    if (!values.scholarshipName.trim()) { showError('Validation Error', 'Scholarship name is required', 3000); return; }
    if (!values.dueDate) { showError('Validation Error', 'Due date is required', 3000); return; }
    try {
      setSubmitting(true);
      setError(null);
      if (isEditMode) {
        await apiPatch(`/applications/${id}`, toPayload(values));
        showSuccess('Success', 'Application updated successfully', 3000);
        navigate(`/applications/${id}`);
      } else {
        const created = await apiPost<ApplicationResponse>('/applications', toPayload(values));
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
        <button className="btn-outline mt-4" onClick={() => navigate('/dashboard')}>Back to Applications</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-3 md:py-5">
      <div className="sticky top-16 z-10 bg-white border-b border-gray-200 shadow-sm rounded-t-xl px-5 py-2.5 flex items-center justify-between flex-wrap gap-3 mb-3">
        <h1 className="text-lg font-bold text-gray-900">
          {isEditMode ? 'Edit Application' : 'New Application'}
        </h1>
        <div className="flex gap-3">
          <button type="submit" form="application-form" className="btn-primary" disabled={submitting}>
            {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update' : 'Save')}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate(isEditMode ? `/applications/${id}` : '/dashboard')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>

      <form id="application-form" onSubmit={handleSubmit}>
        <ApplicationFormSections values={values} onChange={handleChange} />

        {(['Essays', 'Recommendations'] as const).map((label) => (
          <div key={label} className="card mb-2">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-200">
              <span className="section-heading">{label}</span>
              <button type="button" className="btn-outline text-sm py-1 px-2.5 opacity-50 cursor-not-allowed" disabled>
                <Plus size={13} className="inline mr-1" />
                {label === 'Essays' ? 'Add Essay' : 'Add Recommender'}
              </button>
            </div>
            <div className="px-5 py-3 text-sm text-gray-500">
              Save the application first, then open it from the dashboard to add {label.toLowerCase()}.
            </div>
          </div>
        ))}
      </form>
    </div>
  );
}

export default ApplicationForm;
