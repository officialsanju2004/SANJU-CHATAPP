import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function RecoveryEmailModal({ onClose }) {
  const { user, setRecoveryEmail } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await setRecoveryEmail(email.trim());
      setSuccess('Recovery email saved. You can now use "Forgot password" to reset it any time.');
      // Let the person see the confirmation for a moment, then close on its own.
      setTimeout(() => onClose(), 1100);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save recovery email');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-1">
          {user?.email ? 'Update recovery email' : 'Add a recovery email'}
        </p>
        <p className="text-sm text-ember-50/50 mb-4">
          If you ever forget your password, we'll send a one-time code here so you can reset it.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs text-ember-50/50 mb-1">Email</label>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-ember-500 mb-2"
          />

          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          {success && <p className="text-xs text-emerald-400 mb-2">{success}</p>}

          <div className="flex gap-2.5 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Saving…' : 'Save email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
