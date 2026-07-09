import { useState } from 'react';
import { accountApi } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DeleteAccountModal({ onClose }) {
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canDelete = password.length > 0 && confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;
    setError('');
    setBusy(true);
    try {
      await accountApi.deleteAccount(password);
      logout();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete account');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-red-900/50 rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-red-400 mb-1">Delete account</p>
        <p className="text-sm text-ember-50/50 mb-4">
          This permanently deletes your account, your messages, your friends list, and your avatar.
          This can't be undone.
        </p>

        <label className="block text-xs text-ember-50/50 mb-1">Your password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-red-500 mb-3"
        />

        <label className="block text-xs text-ember-50/50 mb-1">
          Type <span className="font-semibold text-ember-50/80">DELETE</span> to confirm
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-red-500 mb-2"
        />

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="flex gap-2.5 mt-3">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || busy}
            className="flex-1 text-sm font-medium py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
