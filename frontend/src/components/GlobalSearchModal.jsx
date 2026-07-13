import { useEffect, useState } from 'react';
import { friendsApi } from '../api/axios.js';
import Avatar from './Avatar.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';

export default function GlobalSearchModal({ onClose, onOpenChat, onSendRequest }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      friendsApi.search(query.trim()).then(({ data }) => setResults(data));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const handleRequest = async (user) => {
    setBusyId(user._id);
    try {
      await onSendRequest(user.username);
      setResults((prev) => prev.map((u) => (u._id === user._id ? { ...u, status: 'pending_sent' } : u)));
    } catch (err) {
      // handled upstream (actionError banner); nothing extra to do here
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-start justify-center p-4 pt-16">
      <div className="bg-surface border border-surface-border rounded-2xl p-4 w-full max-w-sm shadow-neon-lg animate-floatIn max-h-[75vh] flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-ember-50/40 shrink-0">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username…"
            className="flex-1 bg-transparent text-ember-50 outline-none placeholder:text-ember-50/30"
          />
          <button onClick={onClose} className="text-ember-50/50 hover:text-ember-50 shrink-0">
            <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
              <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-ember -mx-1 px-1">
          {query.trim() && results.length === 0 && (
            <p className="text-sm text-ember-50/40 py-4 text-center">No users found</p>
          )}
          {results.map((u) => (
            <div key={u._id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-void/60">
              <Avatar username={u.username} avatar={u.avatar} size="sm" />
              <span className="text-sm text-ember-50 flex-1 truncate flex items-center gap-1">
                {u.username}
                {u.verified && <VerifiedBadge size={12} />}
              </span>
              {u.status === 'friends' && (
                <button
                  onClick={() => {
                    onOpenChat(u);
                    onClose();
                  }}
                  className="text-xs font-medium text-ember-400 hover:text-ember-300 px-2 py-1"
                >
                  Open chat
                </button>
              )}
              {u.status === 'none' && (
                <button
                  onClick={() => handleRequest(u)}
                  disabled={busyId === u._id}
                  className="text-xs font-medium bg-ember-500 hover:bg-ember-400 text-void-950 px-2.5 py-1 rounded-full disabled:opacity-50"
                >
                  Add
                </button>
              )}
              {u.status === 'pending_sent' && <span className="text-xs text-ember-50/40">Requested</span>}
              {u.status === 'pending_received' && <span className="text-xs text-ember-50/40">Check requests</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
