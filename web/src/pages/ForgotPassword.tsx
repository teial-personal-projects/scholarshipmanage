import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestPasswordReset } = useAuth();
  const { showSuccess, showError } = useToastHelpers();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      showSuccess('Reset email sent', 'Check your inbox for a password reset link.');
    } catch (error) {
      showError('Failed to send reset email', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F3] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-gray-600 text-sm">
            Enter your email and we'll send you a password reset link.
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2 justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending link...' : 'Send reset link'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm">
          <Link to="/login" className="text-brand-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
