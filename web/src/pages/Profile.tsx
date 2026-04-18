import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../services/api';
import type { UserProfile } from '@scholarshipmanage/shared';
import { useToastHelpers } from '../utils/toast';

function Profile() {
  const { showSuccess, showError } = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [applicationRemindersEnabled, setApplicationRemindersEnabled] = useState(true);
  const [collaborationRemindersEnabled, setCollaborationRemindersEnabled] = useState(true);
  const [personalOpen, setPersonalOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const profileData = await apiGet<UserProfile>('/users/me');
        setEmailAddress(profileData.emailAddress || '');
        setFirstName(profileData.firstName || '');
        setLastName(profileData.lastName || '');
        setPhoneNumber(profileData.phoneNumber || '');
        setApplicationRemindersEnabled(profileData.applicationRemindersEnabled ?? true);
        setCollaborationRemindersEnabled(profileData.collaborationRemindersEnabled ?? true);
      } catch (error) {
        showError('Error', error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [showError]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiPatch('/users/me', {
        firstName: firstName || null,
        lastName: lastName || null,
        phoneNumber: phoneNumber || null,
        applicationRemindersEnabled,
        collaborationRemindersEnabled,
      });
      showSuccess('Profile updated', 'Your profile has been saved successfully.', 3000);
    } catch (error) {
      showError('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      <p className="text-gray-600 text-sm">Loading profile...</p>
    </div>
  );

  const Section = ({
    title, subtitle, isOpen, toggle, children,
  }: { title: string; subtitle?: string; isOpen: boolean; toggle: () => void; children: React.ReactNode }) => (
    <div className="card mb-4">
      <button
        type="button"
        className="w-full text-left flex items-center justify-between px-6 py-4 hover:bg-gray-50 rounded-t-xl border-b border-gray-200"
        onClick={toggle}
      >
        <div>
          <p className="font-semibold text-gray-900">{title}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="card-body">{children}</div>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Profile & Preferences</h1>

      <Section title="Personal Information" isOpen={personalOpen} toggle={() => setPersonalOpen(!personalOpen)}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="field-label">First Name</label>
              <input className="field-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label className="field-label">Last Name</label>
              <input className="field-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            </div>
          </div>
          <div>
            <label className="field-label">Email</label>
            <input className="field-input bg-gray-50" value={emailAddress} readOnly />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="field-label">Phone Number</label>
            <input type="tel" className="field-input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number" />
          </div>
        </div>
      </Section>

      <Section
        title="Notification Preferences"
        subtitle="Control when you receive reminder emails"
        isOpen={notificationsOpen}
        toggle={() => setNotificationsOpen(!notificationsOpen)}
      >
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-800">Application Reminders</p>
              <p className="text-sm text-gray-500">Receive email reminders for upcoming scholarship application deadlines</p>
            </div>
            <input
              type="checkbox"
              checked={applicationRemindersEnabled}
              onChange={(e) => setApplicationRemindersEnabled(e.target.checked)}
              className="w-5 h-5 accent-brand-500 cursor-pointer"
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-800">Collaboration Reminders</p>
              <p className="text-sm text-gray-500">Receive email reminders for collaboration tasks and deadlines</p>
            </div>
            <input
              type="checkbox"
              checked={collaborationRemindersEnabled}
              onChange={(e) => setCollaborationRemindersEnabled(e.target.checked)}
              className="w-5 h-5 accent-brand-500 cursor-pointer"
            />
          </div>
        </div>
      </Section>

      <div>
        <button className="btn-primary w-full md:w-auto px-6 py-2" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default Profile;
