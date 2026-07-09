import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { formatLastSeen } from '../utils/time.js';
import StatusRow from './StatusRow.jsx';
import ChatLockSettings from './ChatLockSettings.jsx';
import DeleteAccountModal from './DeleteAccountModal.jsx';

function previewText(lastMessage) {
  if (!lastMessage) return 'Say hello 👋';
  if (lastMessage.type === 'image') return lastMessage.viewOnce ? '📸 Photo (view once)' : '📷 Photo';
  if (lastMessage.type === 'voice') return '🎤 Voice message';
  return lastMessage.content;
}

export default function Sidebar({
  tab,
  onTabChange,
  friends,
  activeUser,
  onSelectUser,
  onlineUserIds,
  incomingCount,
  hiddenOnMobile,
  onAvatarClick,
  children,
  summaries = {},
  lockEnabled,
  onLockChanged,
  statusFeed = [],
  currentUser,
  onOpenMyStatus,
  onAddStatus,
  onOpenFriendStatus,
}) {
  const { user, logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showLockSettings, setShowLockSettings] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  return (
    <aside
      className={`w-full sm:w-80 shrink-0 bg-surface sm:border-r border-surface-border flex-col h-full ${
        hiddenOnMobile ? 'hidden sm:flex' : 'flex'
      }`}
    >
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-surface-border flex items-center gap-3 relative">
        <button onClick={onAvatarClick} className="shrink-0" aria-label="Edit profile picture">
          <Avatar username={user?.username} avatar={user?.avatar} size="md" />
        </button>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-ember-50 truncate">Sanju Chat</p>
          <p className="text-xs text-ember-50/40 truncate">@{user?.username}</p>
        </div>

        <button
          onClick={() => setShowSettingsMenu((v) => !v)}
          className="ml-auto text-ember-50/40 hover:text-ember-400 transition-colors p-1.5"
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
            <path d="M19.4 13a7.5 7.5 0 0 0 .06-1 7.5 7.5 0 0 0-.06-1l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.4.96a7.4 7.4 0 0 0-1.7-.98l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.62.24-1.19.58-1.7.98l-2.4-.96a.5.5 0 0 0-.6.22L1.7 8.78a.5.5 0 0 0 .12.64L3.85 11a7.5 7.5 0 0 0-.06 1c0 .34.02.67.06 1l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.4.32.6.22l2.4-.96c.51.4 1.08.74 1.7.98l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.62-.24 1.19-.58 1.7-.98l2.4.96c.24.1.46 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64L19.4 13Zm-7.4 2.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
          </svg>
        </button>

        {showSettingsMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowSettingsMenu(false)} />
            <div className="absolute right-4 top-14 z-40 bg-void border border-surface-border rounded-xl shadow-neon-lg overflow-hidden w-48">
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowLockSettings(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5"
              >
                {lockEnabled ? 'Chat lock settings' : 'Enable chat lock'}
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setConfirmingLogout(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                Sign out
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowDeleteAccount(true);
                }}
                className="w-full text-left text-sm text-red-400 hover:bg-red-950/30 px-4 py-2.5 border-t border-surface-border"
              >
                Delete account
              </button>
            </div>
          </>
        )}
      </div>

      {confirmingLogout && (
        <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-xs shadow-neon-lg animate-floatIn">
            <p className="font-display font-semibold text-ember-50 mb-1">Sign out?</p>
            <p className="text-sm text-ember-50/50 mb-5">
              Are you sure you want to sign out of Sanju Chat?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmingLogout(false)}
                className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:text-ember-50 hover:bg-void/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="flex-1 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 shadow-neon transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {showLockSettings && (
        <ChatLockSettings
          enabled={lockEnabled}
          onClose={() => setShowLockSettings(false)}
          onChanged={onLockChanged}
        />
      )}
      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />}

      {/* Status row */}
      <StatusRow
        feed={statusFeed}
        currentUser={currentUser}
        onOpenMine={onOpenMyStatus}
        onAddStatus={onAddStatus}
        onOpenFriend={onOpenFriendStatus}
      />

      {/* Tab switcher */}
      <div className="flex px-3 sm:px-4 pt-3 gap-2">
        <button
          onClick={() => onTabChange('chats')}
          className={`flex-1 text-sm sm:text-xs font-medium py-2.5 sm:py-2 rounded-lg transition-colors ${
            tab === 'chats'
              ? 'bg-ember-500 text-void-950 shadow-neon'
              : 'text-ember-50/50 hover:text-ember-50 bg-void border border-surface-border'
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => onTabChange('add')}
          className={`relative flex-1 text-sm sm:text-xs font-medium py-2.5 sm:py-2 rounded-lg transition-colors ${
            tab === 'add'
              ? 'bg-ember-500 text-void-950 shadow-neon'
              : 'text-ember-50/50 hover:text-ember-50 bg-void border border-surface-border'
          }`}
        >
          Add Friends
          {incomingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ember-400 text-void-950 text-[10px] font-bold flex items-center justify-center shadow-neon">
              {incomingCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'chats' ? (
        <div className="flex-1 overflow-y-auto scrollbar-ember px-2 py-3">
          {friends.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-ember-50/40">No friends yet.</p>
              <p className="text-xs text-ember-50/30 mt-1">
                Go to "Add Friends" to find people by username.
              </p>
            </div>
          )}
          {friends.map((u) => {
            const isOnline = onlineUserIds?.includes(u._id);
            const isActive = activeUser?._id === u._id;
            const summary = summaries[u._id];
            const unread = summary?.unreadCount || 0;

            return (
              <button
                key={u._id}
                onClick={() => onSelectUser(u)}
                className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-xl mb-1 transition-colors text-left ${
                  isActive ? 'bg-ember-500/10 shadow-neon-inset' : 'hover:bg-void/60 active:bg-void/80'
                }`}
              >
                <Avatar username={u.username} avatar={u.avatar} online={isOnline} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-[15px] sm:text-sm truncate ${
                        unread > 0 ? 'font-semibold text-ember-50' : 'font-medium text-ember-50'
                      }`}
                    >
                      {u.username}
                    </p>
                  </div>
                  <p
                    className={`text-xs truncate ${
                      unread > 0 ? 'text-ember-50/80 font-medium' : 'text-ember-50/35'
                    }`}
                  >
                    {summary?.lastMessage ? previewText(summary.lastMessage) : isOnline ? 'Online' : formatLastSeen(u.lastSeen)}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-ember-500 text-void-950 text-[11px] font-bold flex items-center justify-center shadow-neon">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-ember">{children}</div>
      )}
    </aside>
  );
}
