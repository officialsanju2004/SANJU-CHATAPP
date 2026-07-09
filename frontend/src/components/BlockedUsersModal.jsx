import { useEffect, useState } from 'react';
import { blockApi } from '../api/axios.js';
import Avatar from './Avatar.jsx';

export default function BlockedUsersModal({ onClose }) {
  const [blocked, setBlocked] = useState(null);

  useEffect(() => {
    blockApi.list().then(({ data }) => setBlocked(data));
  }, []);

  const handleUnblock = async (userId) => {
    await blockApi.unblock(userId);
    setBlocked((prev) => prev.filter((u) => u._id !== userId));
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-semibold text-ember-50">Blocked users</p>
          <button onClick={onClose} className="text-ember-50/50 hover:text-ember-50">
            <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
              <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-ember">
          {blocked === null && <p className="text-sm text-ember-50/40">Loading…</p>}
          {blocked?.length === 0 && <p className="text-sm text-ember-50/40">No one is blocked</p>}
          {blocked?.map((u) => (
            <div key={u._id} className="flex items-center gap-3 py-2.5">
              <Avatar username={u.username} avatar={u.avatar} size="sm" />
              <span className="text-sm text-ember-50 flex-1 truncate">{u.username}</span>
              <button
                onClick={() => handleUnblock(u._id)}
                className="text-xs font-medium text-ember-400 hover:text-ember-300 px-2 py-1"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
