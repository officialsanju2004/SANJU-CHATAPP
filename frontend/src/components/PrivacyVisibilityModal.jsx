import { useEffect, useState } from 'react';
import { visibilityApi } from '../api/axios.js';
import Avatar from './Avatar.jsx';

export default function PrivacyVisibilityModal({ friends, onClose }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    visibilityApi.get().then(({ data }) => setSettings(data));
  }, []);

  const save = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setBusy(true);
    try {
      await visibilityApi.update(next);
    } finally {
      setBusy(false);
    }
  };

  const toggleException = (list, id) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  if (!settings) return null;

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn max-h-[80vh] overflow-y-auto scrollbar-ember">
        <p className="font-display font-semibold text-ember-50 mb-4">Privacy</p>

        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-ember-50">Hide online status</p>
          <button
            onClick={() => save({ hideOnlineStatus: !settings.hideOnlineStatus })}
            disabled={busy}
            className={`w-9 h-5 rounded-full relative transition-colors ${
              settings.hideOnlineStatus ? 'bg-ember-500' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                settings.hideOnlineStatus ? 'left-4' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        {settings.hideOnlineStatus && (
          <div className="mb-4">
            <p className="text-xs text-ember-50/40 mb-2">Still show online status to:</p>
            {friends.map((f) => (
              <label key={f._id} className="flex items-center gap-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={settings.onlineVisibleTo?.includes(f._id)}
                  onChange={() => save({ onlineVisibleTo: toggleException(settings.onlineVisibleTo || [], f._id) })}
                  className="accent-ember-500"
                />
                <Avatar username={f.username} avatar={f.avatar} size="sm" />
                <span className="text-sm text-ember-50">{f.username}</span>
              </label>
            ))}
          </div>
        )}

        <div className="border-t border-surface-border pt-4 mb-1">
          <p className="text-sm text-ember-50 mb-2">Last seen</p>
          <div className="space-y-1.5">
            {['everyone', 'selected', 'nobody'].map((opt) => (
              <button
                key={opt}
                onClick={() => save({ lastSeenVisibility: opt })}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border capitalize ${
                  settings.lastSeenVisibility === opt
                    ? 'border-ember-500 bg-ember-500/10 text-ember-50'
                    : 'border-surface-border text-ember-50/80 hover:bg-void/60'
                }`}
              >
                {opt === 'selected' ? 'Only selected people' : opt}
              </button>
            ))}
          </div>
        </div>

        {settings.lastSeenVisibility === 'selected' && (
          <div className="mt-3">
            <p className="text-xs text-ember-50/40 mb-2">Show last seen to:</p>
            {friends.map((f) => (
              <label key={f._id} className="flex items-center gap-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={settings.lastSeenVisibleTo?.includes(f._id)}
                  onChange={() =>
                    save({ lastSeenVisibleTo: toggleException(settings.lastSeenVisibleTo || [], f._id) })
                  }
                  className="accent-ember-500"
                />
                <Avatar username={f.username} avatar={f.avatar} size="sm" />
                <span className="text-sm text-ember-50">{f.username}</span>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950"
        >
          Done
        </button>
      </div>
    </div>
  );
}
