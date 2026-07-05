import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 480px) {
          /* Adjust container padding for small screens */
          .login-container {
            padding: 0 16px !important;
          }
          
          .login-card {
            padding: 20px !important;
            border-radius: 16px !important;
          }
          
          /* Make logo smaller on mobile */
          .logo-wrapper {
            width: 60px !important;
            height: 60px !important;
            margin-bottom: 12px !important;
          }
          
          /* Adjust heading sizes */
          .login-title {
            font-size: 20px !important;
            line-height: 1.3 !important;
          }
          
          .login-subtitle {
            font-size: 12px !important;
            margin-top: 4px !important;
          }
          
          /* Make input fields touch-friendly */
          .input-field {
            font-size: 16px !important;
            padding: 12px 14px !important;
            min-height: 48px !important;
            margin-bottom: 16px !important;
          }
          
          .input-label {
            font-size: 10px !important;
            margin-bottom: 4px !important;
          }
          
          /* Make button touch-friendly */
          .login-button {
            font-size: 14px !important;
            padding: 12px !important;
            min-height: 48px !important;
          }
          
          /* Adjust error message */
          .error-message {
            font-size: 12px !important;
            padding: 8px 12px !important;
            margin-bottom: 16px !important;
          }
          
          /* Adjust link text */
          .login-link {
            font-size: 13px !important;
            margin-top: 16px !important;
          }
          
          /* Prevent iOS zoom on input focus */
          input[type="text"],
          input[type="password"] {
            font-size: 16px !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          /* Tablet adjustments */
          .login-container {
            padding: 0 24px !important;
          }
          
          .login-card {
            padding: 28px !important;
          }
          
          .input-field {
            font-size: 15px !important;
            padding: 11px 14px !important;
          }
        }
        
        /* Animation for floating */
        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-floatIn {
          animation: floatIn 0.5s ease-out;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center login-container bg-gradient-to-br from-void-950 via-void-900 to-void-950">
        <div className="w-full max-w-sm">
          {/* Logo mark */}
          <div className="flex flex-col items-center mb-6 md:mb-8 animate-floatIn">
            <div className="relative logo-wrapper w-16 md:w-20 h-16 md:h-20 mb-3 md:mb-4">
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
            <h1 className="font-display font-bold login-title text-xl md:text-2xl tracking-tight text-ember-50">
              Sanju Chat
            </h1>
            <p className="login-subtitle text-xs md:text-sm text-ember-50/50 mt-1">
              Sign in to keep the conversation going
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="login-card bg-surface border border-surface-border rounded-2xl p-5 md:p-7 shadow-neon-inset"
          >
            {error && (
              <div className="error-message mb-3 md:mb-4 text-xs md:text-sm text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <label className="input-label block text-[10px] md:text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1">
              Username
            </label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. arjun_dev"
              className="input-field w-full bg-void border border-surface-border rounded-lg px-3.5 py-2.5 text-sm md:text-base text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
            />

            <label className="input-label block text-[10px] md:text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1">
              Password
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field w-full bg-void border border-surface-border rounded-lg px-3.5 py-2.5 text-sm md:text-base text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
            />

            <button
              type="submit"
              disabled={loading}
              className="login-button w-full bg-ember-500 hover:bg-ember-400 disabled:opacity-60 disabled:cursor-not-allowed text-void-950 font-display font-semibold text-sm md:text-base py-2.5 md:py-3 rounded-lg shadow-neon transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="login-link text-center text-xs md:text-sm text-ember-50/40 mt-4 md:mt-5">
              New here?{' '}
              <Link to="/register" className="text-ember-400 hover:text-ember-300 font-medium transition-colors">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}