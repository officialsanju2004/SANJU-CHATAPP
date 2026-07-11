import { useState } from 'react';
import { friendsApi } from '../api/axios.js';

export default function RenameContactModal({ friend, onClose, onSaved }) {
  const [nickname, setNickname] = useState(friend.nickname || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setBusy(true);
    setError('');
    try {
      await friendsApi.setNickname(friend._id, nickname);
      onSaved?.(nickname.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save nickname');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-xs shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-1">Rename contact</p>
        <p className="text-xs text-ember-50/50 mb-4">
          Only you see this - it doesn't change {friend.username}'s actual username.
        </p>

        <input
          autoFocus
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={friend.username}
          maxLength={30}
          className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-ember-500 mb-2"
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
            onClick={handleSave}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
