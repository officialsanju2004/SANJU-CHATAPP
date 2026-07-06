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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 animate-floatIn">
          <div className="w-16 h-16 rounded-2xl border-2 border-ember-500 shadow-neon flex items-center justify-center mb-4 bg-void">
            <span className="font-display font-bold text-ember-500 text-xl">EC</span>
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-ember-50">
            Create your account
          </h1>
          <p className="text-sm text-ember-50/50 mt-1">Join Sanju Chat in a few seconds</p>
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
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            className="w-full mb-4 bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
          />

          <label className="block text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1.5">
            Password
          </label>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full mb-4 bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
          />

          <label className="block text-xs font-medium uppercase tracking-wide text-ember-50/50 mb-1.5">
            Confirm password
          </label>
          <input
            required
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            className="w-full mb-6 bg-void border border-surface-border rounded-lg px-3.5 py-3 sm:py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ember-500 hover:bg-ember-400 disabled:opacity-60 disabled:cursor-not-allowed text-void-950 font-display font-semibold text-base sm:text-sm py-3 sm:py-2.5 rounded-lg shadow-neon transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-ember-50/40 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-ember-400 hover:text-ember-300 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
