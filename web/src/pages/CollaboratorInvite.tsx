import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { useToastHelpers } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import { formatDateNoTimezone } from '../utils/date';

interface InviteDetails {
  collaboration: {
    id: number;
    collaborationType: string;
    applicationId: number;
    nextActionDueDate?: string;
    notes?: string;
  };
  student: { firstName: string; lastName: string; email: string };
  application: { scholarshipName: string; organization?: string };
  inviteToken: string;
  expiresAt: string;
}

function getCollaborationTypeLabel(type: string) {
  switch (type) {
    case 'recommendation': return 'Recommendation Letter';
    case 'essayReview': return 'Essay Review';
    case 'guidance': return 'Guidance/Counseling';
    default: return type;
  }
}

function CollaboratorInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToastHelpers();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    async function fetchInviteDetails() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<InviteDetails>(`/invites/${token}`);
        setInviteDetails(data);
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          setError('This invitation has expired. Please contact the student for a new invitation.');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load invitation';
        setError(msg);
        showError('Error', msg);
      } finally {
        setLoading(false);
      }
    }
    fetchInviteDetails();
  }, [token, showError]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      setAccepting(true);
      await apiPost(`/invites/${token}/accept`, {});
      showSuccess('Success', 'Invitation accepted successfully');
      navigate('/collaborator/dashboard');
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally { setAccepting(false); }
  };

  const handleDecline = async () => {
    if (!token) return;
    try {
      setDeclining(true);
      await apiPost(`/invites/${token}/decline`, {});
      showSuccess('Declined', 'You have declined this invitation');
      navigate('/');
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to decline invitation');
    } finally { setDeclining(false); }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading invitation...</p>
    </div>
  );

  if (error || !inviteDetails) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card p-8 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900">Invalid or Expired Invitation</h2>
        <p className="text-gray-600 text-sm max-w-sm mx-auto">
          {error || 'This invitation is no longer valid. Please contact the student who sent you this invitation.'}
        </p>
        <button className="btn-primary px-6 py-2" onClick={() => navigate('/')}>Go to Home</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card">
        <div className="card-body space-y-5">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Collaboration Invitation</h2>
            <p className="text-gray-600 text-sm mt-1">You've been invited to help a student with their scholarship application</p>
          </div>

          <hr className="border-gray-200" />

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">From</p>
            <p className="font-semibold text-lg">{inviteDetails.student.firstName} {inviteDetails.student.lastName}</p>
            <p className="text-sm text-gray-500">{inviteDetails.student.email}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Help Needed</p>
            <span className="badge badge-blue text-sm py-1 px-3">{getCollaborationTypeLabel(inviteDetails.collaboration.collaborationType)}</span>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Scholarship Application</p>
            <p className="font-semibold">{inviteDetails.application.scholarshipName}</p>
            {inviteDetails.application.organization && <p className="text-sm text-gray-500">{inviteDetails.application.organization}</p>}
          </div>

          {inviteDetails.collaboration.nextActionDueDate && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Due Date</p>
              <p className="font-semibold">{formatDateNoTimezone(inviteDetails.collaboration.nextActionDueDate)}</p>
            </div>
          )}

          {inviteDetails.collaboration.notes && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Additional Notes</p>
              <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{inviteDetails.collaboration.notes}</p>
            </div>
          )}

          <hr className="border-gray-200" />

          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Account Required:</strong> You'll need to create an account or log in to accept this invitation.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="btn-outline py-2 px-6" onClick={handleDecline} disabled={declining || accepting}>
              {declining ? 'Declining...' : 'Decline'}
            </button>
            <button
              className="btn-primary py-2 px-6"
              onClick={user ? handleAccept : () => navigate('/login', { state: { from: `/invite/${token}` } })}
              disabled={accepting || declining}
            >
              {accepting ? 'Accepting...' : user ? 'Accept Invitation' : 'Log In to Accept'}
            </button>
          </div>

          {inviteDetails.expiresAt && (
            <p className="text-xs text-gray-500 text-center">
              This invitation expires on {new Date(inviteDetails.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollaboratorInvite;
