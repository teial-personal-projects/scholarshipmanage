import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F3] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">ScholarshipManage</h1>
          <p className="text-gray-600 text-sm">Sign in to your account</p>
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="field-label">Password</label>
                <input
                  type="password"
                  className="field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2 justify-center"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
