import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword, session, loading } = useAuth();
  const { showSuccess, showError } = useToastHelpers();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      showError('Passwords do not match', '', 4000);
      return;
    }
    setIsSubmitting(true);
    try {
      await updatePassword(password);
      showSuccess('Password updated', 'You can now sign in with your new password.', 4000);
      navigate('/login');
    } catch (error) {
      showError('Failed to update password', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasRecoverySession = Boolean(session);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F3] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Reset password</h1>
          <p className="text-gray-600 text-sm">
            {hasRecoverySession
              ? 'Choose a new password for your account.'
              : 'Your reset link may have expired. Request a new password reset email to continue.'}
          </p>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Preparing your reset session...</p>
        ) : hasRecoverySession ? (
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="field-label">New password</label>
                  <input
                    type="password"
                    className="field-input"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a new password"
                    required
                  />
                </div>
                <div>
                  <label className="field-label">Confirm password</label>
                  <input
                    type="password"
                    className="field-input"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your new password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full py-2 justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body space-y-4">
              <p className="text-gray-700 text-sm">
                The recovery session was not detected. Please request a new reset link and open it again from your email.
              </p>
              <Link to="/forgot-password" className="btn-primary block text-center">
                Request new link
              </Link>
            </div>
          </div>
        )}

        <p className="text-center text-sm">
          <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
