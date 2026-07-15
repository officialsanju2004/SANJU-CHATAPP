import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChangeUsernameModal({ onClose }) {
  const { user, changeUsername } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = newUsername.trim().length >= 3 && password.length > 0 && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const updated = await changeUsername(newUsername.trim(), password);
      setSuccess(`Username changed to @${updated.username}`);
      setNewUsername('');
      setPassword('');
      setTimeout(() => onClose(), 1100);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change username');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-1">Change username</p>
        <p className="text-sm text-ember-50/50 mb-4">
          Currently <span className="text-ember-300 font-medium">@{user?.username}</span>. Once changed, anyone can
          register with your old username.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs text-ember-50/50 mb-1">New username</label>
          <input
            autoFocus
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="3-24 characters"
            className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-ember-500 mb-3"
          />

          <label className="block text-xs text-ember-50/50 mb-1">Confirm with your password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              {busy ? 'Saving…' : 'Save username'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
