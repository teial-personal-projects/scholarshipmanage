import { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthCardShell } from '../components/AuthCardShell';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();
  const passwordToggleLabel = isPasswordVisible ? 'Hide password' : 'Show password';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      showSuccess('Login successful', 'Welcome back!', 3000);
      navigate('/dashboard');
    } catch (error) {
      showError('Login failed', error instanceof Error ? error.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardShell
      badgeLabel="Secure sign in"
      title="Sign in"
      description="Sign in to manage applications, deadlines, essays, and collaborator updates."
      footer={(
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-900 hover:underline">
            Create one
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="field-label">Email</label>
          <input
            id="login-email"
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
          <div className="mb-1 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="field-label mb-0">Password</label>
            <Link to="/forgot-password" className="shrink-0 text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={isPasswordVisible ? 'text' : 'password'}
              className="field-input py-2 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
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
        </div>

        <button
          type="submit"
          className="btn-primary w-full gap-2 py-2.5"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
          {!isLoading && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </form>
    </AuthCardShell>
  );
}

export default Login;
