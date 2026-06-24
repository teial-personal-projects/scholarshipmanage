import { useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthCardShell } from '../components/AuthCardShell';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();
  const passwordToggleLabel = isPasswordVisible ? 'Hide password' : 'Show password';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(email, password, firstName, lastName);
      showSuccess('Account created', 'Your account has been created successfully. Please sign in.');
      navigate('/login');
    } catch (error) {
      showError('Registration failed', error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardShell
      badgeLabel="Secure account setup"
      title="Create account"
      description="Create an account to track applications, deadlines, essays, and collaborator updates."
      footer={(
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-900 hover:underline">
            Sign in
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="register-first-name" className="field-label">First Name</label>
            <input
              id="register-first-name"
              type="text"
              className="field-input py-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              autoComplete="given-name"
              required
            />
          </div>
          <div>
            <label htmlFor="register-last-name" className="field-label">Last Name</label>
            <input
              id="register-last-name"
              type="text"
              className="field-input py-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              autoComplete="family-name"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className="field-label">Email</label>
          <input
            id="register-email"
            type="email"
            className="field-input py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="register-password" className="field-label">Password</label>
          <div className="relative">
            <input
              id="register-password"
              type={isPasswordVisible ? 'text' : 'password'}
              className="field-input py-2 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
              onClick={() => setIsPasswordVisible((current) => !current)}
              aria-label={passwordToggleLabel}
              aria-pressed={isPasswordVisible}
              title={passwordToggleLabel}
            >
              {isPasswordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters</p>
        </div>

        <button
          type="submit"
          className="btn-primary w-full gap-2 py-2.5"
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
          {!isLoading && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </form>
    </AuthCardShell>
  );
}

export default Register;
