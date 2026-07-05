import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account.');
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
          .register-container {
            padding: 0 16px !important;
          }
          
          .register-card {
            padding: 20px !important;
            border-radius: 16px !important;
          }
          
          /* Make logo smaller on mobile */
          .logo-wrapper {
            width: 56px !important;
            height: 56px !important;
            margin-bottom: 12px !important;
          }
          
          .logo-text {
            font-size: 16px !important;
          }
          
          /* Adjust heading sizes */
          .register-title {
            font-size: 20px !important;
            line-height: 1.3 !important;
          }
          
          .register-subtitle {
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
          .register-button {
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
          .register-link {
            font-size: 13px !important;
            margin-top: 16px !important;
          }
          
          /* Prevent iOS zoom on input focus */
          input[type="text"],
          input[type="password"] {
            font-size: 16px !important;
          }
          
          /* Reduce spacing between fields */
          .field-spacing {
            margin-bottom: 12px !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          /* Tablet adjustments */
          .register-container {
            padding: 0 24px !important;
          }
          
          .register-card {
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

      <div className="min-h-screen flex items-center justify-center register-container bg-gradient-to-br from-void-950 via-void-900 to-void-950">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6 md:mb-8 animate-floatIn">
            <div className="logo-wrapper w-14 md:w-16 h-14 md:h-16 rounded-2xl border-2 border-ember-500 shadow-neon flex items-center justify-center mb-3 md:mb-4 bg-void">
              <span className="logo-text font-display font-bold text-ember-500 text-base md:text-xl">EC</span>
            </div>
            <h1 className="register-title font-display font-bold text-xl md:text-2xl tracking-tight text-ember-50">
              Create your account
            </h1>
            <p className="register-subtitle text-xs md:text-sm text-ember-50/50 mt-1">Join Ember Chat in a few seconds</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="register-card bg-surface border border-surface-border rounded-2xl p-5 md:p-7 shadow-neon-inset"
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
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="input-field w-full bg-void border border-surface-border rounded-lg px-3.5 py-2.5 text-sm md:text-base text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
            />

            <label className="input-label block text-[10px] md:text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1">
              Password
            </label>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input-field w-full bg-void border border-surface-border rounded-lg px-3.5 py-2.5 text-sm md:text-base text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
            />

            <label className="input-label block text-[10px] md:text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1">
              Confirm password
            </label>
            <input
              required
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="input-field w-full bg-void border border-surface-border rounded-lg px-3.5 py-2.5 text-sm md:text-base text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
            />

            <button
              type="submit"
              disabled={loading}
              className="register-button w-full bg-ember-500 hover:bg-ember-400 disabled:opacity-60 disabled:cursor-not-allowed text-void-950 font-display font-semibold text-sm md:text-base py-2.5 md:py-3 rounded-lg shadow-neon transition-colors"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <p className="register-link text-center text-xs md:text-sm text-ember-50/40 mt-4 md:mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-ember-400 hover:text-ember-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}