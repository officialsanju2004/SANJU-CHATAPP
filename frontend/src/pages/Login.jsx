import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reaching /login while already signed in (e.g. by pressing back after a
  // successful login) should never show the form again - just bounce
  // straight back into the app.
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      // replace: true so /login doesn't stay in history - otherwise the
      // first back-press after logging in would land right back on the
      // sign-in form instead of exiting the app.
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8 animate-floatIn">
          <div className="relative w-20 h-20 mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect x="3" y="3" width="94" height="94" rx="22" fill="#050403" stroke="#ff9500" strokeWidth="3" filter="url(#glow)" />
              <path
                d="M50 20a30 30 0 0 1 0 60 30 30 0 0 1-9-1.4L23 84l4.3-16A30 30 0 0 1 50 20Z"
                fill="none"
                stroke="#ff9500"
                strokeWidth="4.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#glow)"
              />
              <circle cx="38" cy="50" r="5" fill="#ff9500" filter="url(#glow)" />
              <circle cx="50" cy="50" r="5" fill="#ff9500" filter="url(#glow)" />
              <circle cx="62" cy="50" r="5" fill="#ff9500" filter="url(#glow)" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-ember-50">
            Sanju Chat
          </h1>
          <p className="text-sm text-ember-50/50 mt-1">Sign in to keep the conversation going</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-surface-border rounded-2xl p-5 sm:p-7 shadow-neon-inset"
        >
          {error && (
            <div className="mb-4 text-sm text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <label className="block text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1.5">
            Username
          </label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. arjun_dev"
            className="w-full mb-4 bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
          />

          <label className="block text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1.5">
            Password
          </label>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full mb-6 bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ember-500 hover:bg-ember-400 disabled:opacity-60 disabled:cursor-not-allowed text-void-950 font-display font-semibold text-base sm:text-sm py-3 sm:py-2.5 rounded-lg shadow-neon transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-ember-50/40 mt-5">
            New here?{' '}
            <Link to="/register" className="text-ember-400 hover:text-ember-300 font-medium">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
