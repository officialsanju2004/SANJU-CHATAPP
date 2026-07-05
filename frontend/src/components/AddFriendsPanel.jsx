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
    <>
      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 480px) {
          /* Adjust padding for mobile */
          .panel-container {
            padding: 12px 16px !important;
            gap: 16px !important;
          }
          
          /* Make section headers smaller */
          .section-header {
            font-size: 10px !important;
            margin-bottom: 8px !important;
          }
          
          /* Adjust empty state text */
          .empty-text {
            font-size: 13px !important;
            padding: 0 4px !important;
          }
          
          /* Make user cards touch-friendly */
          .user-card {
            padding: 8px 12px !important;
            border-radius: 12px !important;
            gap: 10px !important;
          }
          
          /* Adjust avatar size */
          .user-avatar {
            width: 32px !important;
            height: 32px !important;
            font-size: 12px !important;
          }
          
          /* Make username text readable */
          .username-text {
            font-size: 14px !important;
          }
          
          /* Make buttons touch-friendly */
          .action-button {
            font-size: 11px !important;
            padding: 6px 12px !important;
            min-height: 32px !important;
            min-width: 52px !important;
          }
          
          .status-text {
            font-size: 11px !important;
          }
          
          /* Error message */
          .error-text {
            font-size: 12px !important;
            padding: 6px 12px !important;
            margin-bottom: 12px !important;
          }
          
          /* Search input */
          .search-input {
            font-size: 16px !important;
            padding: 10px 14px !important;
            min-height: 44px !important;
            margin-bottom: 12px !important;
          }
          
          /* Space between sections */
          .section-spacing {
            margin-top: 8px !important;
          }
          
          /* Request cards */
          .request-card {
            padding: 8px 12px !important;
            gap: 10px !important;
          }
          
          /* Prevent iOS zoom */
          input[type="text"] {
            font-size: 16px !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          /* Tablet adjustments */
          .panel-container {
            padding: 16px 20px !important;
          }
          
          .user-card {
            padding: 10px 14px !important;
          }
          
          .search-input {
            font-size: 15px !important;
            padding: 10px 14px !important;
          }
        }
      `}</style>

      <div className="panel-container px-3 md:px-4 py-3 space-y-4 md:space-y-6">
        {actionError && (
          <div className="error-text text-xs md:text-sm text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-2">
            {actionError}
          </div>
        )}

        {/* Incoming requests */}
        <div>
          <p className="section-header text-[10px] md:text-xs font-medium uppercase tracking-wide text-ember-50/40 mb-1.5 md:mb-2">
            Friend requests {incoming.length > 0 && `(${incoming.length})`}
          </p>
          {incoming.length === 0 ? (
            <p className="empty-text text-sm md:text-base text-ember-50/30 px-1">No pending requests.</p>
          ) : (
            <div className="space-y-1.5 md:space-y-2">
              {incoming.map((req) => (
                <div
                  key={req._id}
                  className="request-card flex items-center gap-2 md:gap-3 bg-void border border-surface-border rounded-xl px-2.5 md:px-3 py-2 md:py-2.5"
                >
                  <div className="user-avatar w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center font-display font-semibold text-xs md:text-sm bg-surface-light text-ember-400 border border-surface-border shrink-0">
                    {req.requester.username[0]?.toUpperCase()}
                  </div>
                  <p className="username-text text-sm md:text-base text-ember-50 flex-1 truncate">{req.requester.username}</p>
                  <button
                    onClick={() => onAccept(req._id)}
                    className="action-button text-xs md:text-sm font-semibold px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 shadow-neon transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDecline(req._id)}
                    className="action-button text-xs md:text-sm font-medium px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg border border-surface-border text-ember-50/50 hover:text-ember-50 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search to add new friends */}
        <div className="section-spacing">
          <p className="section-header text-[10px] md:text-xs font-medium uppercase tracking-wide text-ember-50/40 mb-1.5 md:mb-2">
            Find people
          </p>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by username…"
            className="search-input w-full bg-void border border-surface-border rounded-lg px-3.5 py-2.5 text-sm md:text-base text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow mb-2 md:mb-3"
          />

          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="empty-text text-sm md:text-base text-ember-50/30 px-1">No users found.</p>
          )}

          <div className="space-y-1.5 md:space-y-2">
            {searchResults.map((u) => (
              <div
                key={u._id}
                className="user-card flex items-center gap-2 md:gap-3 bg-void border border-surface-border rounded-xl px-2.5 md:px-3 py-2 md:py-2.5"
              >
                <div className="user-avatar w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center font-display font-semibold text-xs md:text-sm bg-surface-light text-ember-400 border border-surface-border shrink-0">
                  {u.username[0]?.toUpperCase()}
                </div>
                <p className="username-text text-sm md:text-base text-ember-50 flex-1 truncate">{u.username}</p>

                {u.status === 'friends' && (
                  <span className="status-text text-xs md:text-sm text-ember-400/70 font-medium">Friends</span>
                )}
                {u.status === 'pending_sent' && (
                  <span className="status-text text-xs md:text-sm text-ember-50/40 font-medium">Pending</span>
                )}
                {u.status === 'pending_received' && (
                  <span className="status-text text-xs md:text-sm text-ember-50/40 font-medium">Check requests</span>
                )}
                {u.status === 'none' && (
                  <button
                    disabled={sendingId === u._id}
                    onClick={async () => {
                      setSendingId(u._id);
                      await onSendRequest(u.username);
                      setSendingId(null);
                    }}
                    className="action-button text-xs md:text-sm font-semibold px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg bg-ember-500 hover:bg-ember-400 disabled:opacity-50 text-void-950 shadow-neon transition-colors"
                  >
                    {sendingId === u._id ? 'Sending…' : 'Add'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}