import { useEffect, useState } from 'react';
import { verifyApi } from '../api/axios.js';
import Avatar from './Avatar.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';

export default function VerifyUsersModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      verifyApi
        .search(query.trim())
        .then(({ data }) => setResults(data))
        .catch((err) => setError(err.response?.data?.message || 'Search failed'));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const toggle = async (user) => {
    setBusyId(user._id);
    setError('');
    try {
      if (user.verified) {
        await verifyApi.revoke(user._id);
      } else {
        await verifyApi.grant(user._id);
      }
      setResults((prev) => prev.map((u) => (u._id === user._id ? { ...u, verified: !u.verified } : u)));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update badge');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display font-semibold text-ember-50 flex items-center gap-1.5">
            Verified badges <VerifiedBadge size={16} />
          </p>
          <button onClick={onClose} className="text-ember-50/50 hover:text-ember-50">
            <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
              <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-ember-50/40 mb-4">Search any username to grant or revoke the orange tick.</p>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username…"
          className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-ember-500 mb-3"
        />

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="flex-1 overflow-y-auto scrollbar-ember">
          {results.map((u) => (
            <div key={u._id} className="flex items-center gap-3 py-2.5">
              <Avatar username={u.username} avatar={u.avatar} size="sm" />
              <span className="text-sm text-ember-50 flex-1 truncate flex items-center gap-1">
                {u.username}
                {u.verified && <VerifiedBadge size={13} />}
              </span>
              <button
                onClick={() => toggle(u)}
                disabled={busyId === u._id}
                className={`text-xs font-medium px-3 py-1.5 rounded-full disabled:opacity-50 ${
                  u.verified
                    ? 'border border-red-900/50 text-red-400 hover:bg-red-950/30'
                    : 'bg-ember-500 text-void-950 hover:bg-ember-400'
                }`}
              >
                {u.verified ? 'Revoke' : 'Verify'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
