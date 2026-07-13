import { useState } from 'react';
import { friendsApi, groupsApi } from '../api/axios.js';

const OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '24 hours', seconds: 24 * 3600 },
  { label: '7 days', seconds: 7 * 24 * 3600 },
  { label: '30 days', seconds: 30 * 24 * 3600 },
];

export default function AutoDeleteModal({ target, currentSeconds, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);

  const apply = async (seconds) => {
    setBusy(true);
    try {
      if (target.type === 'dm') {
        await friendsApi.setAutoDelete(target.user._id, seconds);
      } else {
        await groupsApi.setAutoDelete(target.group._id, seconds);
      }
      onChanged(seconds);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-xs shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-1">Auto-delete messages</p>
        <p className="text-xs text-ember-50/50 mb-4">
          New messages will disappear for everyone after this long. Applies to this conversation only.
        </p>

        <div className="space-y-2 mb-2">
          {OPTIONS.map((o) => (
            <button
              key={o.seconds}
              onClick={() => apply(o.seconds)}
              disabled={busy}
              className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border disabled:opacity-50 ${
                currentSeconds === o.seconds
                  ? 'border-ember-500 bg-ember-500/10 text-ember-50'
                  : 'border-surface-border text-ember-50/80 hover:bg-void/60'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
        >
          Close
        </button>
      </div>
    </div>
  );
}
