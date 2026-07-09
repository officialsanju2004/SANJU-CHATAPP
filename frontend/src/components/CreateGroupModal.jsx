import { useState } from 'react';
import { groupsApi } from '../api/axios.js';
import Avatar from './Avatar.jsx';

export default function CreateGroupModal({ friends, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) return setError('Give your group a name');
    if (selected.length === 0) return setError('Pick at least one friend');

    setBusy(true);
    try {
      const { data } = await groupsApi.create(name.trim(), selected);
      onCreated?.(data.group);
      if (data.skipped?.length > 0) {
        setError(`Couldn't add: ${data.skipped.join(', ')} (they don't allow group adds)`);
        setTimeout(onClose, 1800);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create group');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn flex flex-col max-h-[85vh]">
        <p className="font-display font-semibold text-ember-50 mb-4">New group</p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-ember-500 mb-3"
        />

        <p className="text-xs text-ember-50/50 mb-2">Add friends</p>
        <div className="flex-1 overflow-y-auto scrollbar-ember -mx-1 px-1 mb-3">
          {friends.length === 0 && (
            <p className="text-sm text-ember-50/40 py-4 text-center">Add some friends first</p>
          )}
          {friends.map((f) => (
            <button
              key={f._id}
              onClick={() => toggle(f._id)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg mb-1 transition-colors ${
                selected.includes(f._id) ? 'bg-ember-500/10' : 'hover:bg-void/60'
              }`}
            >
              <Avatar username={f.username} avatar={f.avatar} size="sm" />
              <span className="text-sm text-ember-50 flex-1 text-left">{f.username}</span>
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  selected.includes(f._id) ? 'bg-ember-500 border-ember-500' : 'border-surface-border'
                }`}
              >
                {selected.includes(f._id) && (
                  <svg viewBox="0 0 24 24" width="12" height="12" className="fill-void-950">
                    <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                  </svg>
                )}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}
