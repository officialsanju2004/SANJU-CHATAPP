import { useState } from 'react';

export default function AddFriendsPanel({
  searchQuery,
  onSearchChange,
  searchResults,
  onSendRequest,
  incoming,
  onAccept,
  onDecline,
  actionError,
}) {
  const [sendingId, setSendingId] = useState(null);

  return (
    <div className="px-4 py-3 space-y-6">
      {actionError && (
        <div className="text-sm text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-2">
          {actionError}
        </div>
      )}

      {/* Incoming requests */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ember-50/40 mb-2">
          Friend requests {incoming.length > 0 && `(${incoming.length})`}
        </p>
        {incoming.length === 0 ? (
          <p className="text-sm text-ember-50/30 px-1">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {incoming.map((req) => (
              <div
                key={req._id}
                className="flex items-center gap-3 bg-void border border-surface-border rounded-xl px-3 py-2.5"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-display font-semibold text-sm bg-surface-light text-ember-400 border border-surface-border shrink-0">
                  {req.requester.username[0]?.toUpperCase()}
                </div>
                <p className="text-sm text-ember-50 flex-1 truncate">{req.requester.username}</p>
                <button
                  onClick={() => onAccept(req._id)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 shadow-neon transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => onDecline(req._id)}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-surface-border text-ember-50/50 hover:text-ember-50 transition-colors"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search to add new friends */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ember-50/40 mb-2">
          Find people
        </p>
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by username…"
          className="w-full bg-void border border-surface-border rounded-lg px-3.5 py-2.5 text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow mb-3"
        />

        {searchQuery.trim() && searchResults.length === 0 && (
          <p className="text-sm text-ember-50/30 px-1">No users found.</p>
        )}

        <div className="space-y-2">
          {searchResults.map((u) => (
            <div
              key={u._id}
              className="flex items-center gap-3 bg-void border border-surface-border rounded-xl px-3 py-2.5"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-display font-semibold text-sm bg-surface-light text-ember-400 border border-surface-border shrink-0">
                {u.username[0]?.toUpperCase()}
              </div>
              <p className="text-sm text-ember-50 flex-1 truncate">{u.username}</p>

              {u.status === 'friends' && (
                <span className="text-xs text-ember-400/70 font-medium">Friends</span>
              )}
              {u.status === 'pending_sent' && (
                <span className="text-xs text-ember-50/40 font-medium">Pending</span>
              )}
              {u.status === 'pending_received' && (
                <span className="text-xs text-ember-50/40 font-medium">Check requests</span>
              )}
              {u.status === 'none' && (
                <button
                  disabled={sendingId === u._id}
                  onClick={async () => {
                    setSendingId(u._id);
                    await onSendRequest(u.username);
                    setSendingId(null);
                  }}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-ember-500 hover:bg-ember-400 disabled:opacity-50 text-void-950 shadow-neon transition-colors"
                >
                  {sendingId === u._id ? 'Sending…' : 'Add'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
