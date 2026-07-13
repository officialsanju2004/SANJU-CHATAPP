import { useEffect, useState } from 'react';
import { chatApi } from '../api/axios.js';
import { formatMessageTime, formatDateSeparator } from '../utils/time.js';

export default function InChatSearchBar({ conversationKey, onClose, onJump }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      chatApi
        .search(conversationKey, query.trim())
        .then(({ data }) => setResults(data))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [query, conversationKey]);

  return (
    <div className="absolute inset-x-0 top-0 z-30 bg-surface border-b border-surface-border shadow-neon-lg">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <svg viewBox="0 0 24 24" width="17" height="17" className="fill-ember-50/40 shrink-0">
          <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in this chat…"
          className="flex-1 bg-transparent text-sm text-ember-50 outline-none placeholder:text-ember-50/30"
        />
        <button onClick={onClose} className="text-ember-50/50 hover:text-ember-50 shrink-0">
          <svg viewBox="0 0 24 24" width="16" height="16" className="fill-current">
            <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
          </svg>
        </button>
      </div>
      {query.trim() && (
        <div className="max-h-64 overflow-y-auto scrollbar-ember border-t border-surface-border">
          {loading && <p className="text-xs text-ember-50/40 px-3 py-3">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="text-xs text-ember-50/40 px-3 py-3">No matches</p>
          )}
          {results.map((m) => (
            <button
              key={m._id}
              onClick={() => onJump(m)}
              className="w-full text-left px-3 py-2 hover:bg-void/60 border-b border-surface-border/50"
            >
              <p className="text-sm text-ember-50 truncate">{m.content}</p>
              <p className="text-[11px] text-ember-50/40">
                {formatDateSeparator(m.createdAt)} · {formatMessageTime(m.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
