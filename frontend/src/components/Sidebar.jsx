import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { formatLastSeen } from '../utils/time.js';
import StatusRow from './StatusRow.jsx';
import ChatLockSettings from './ChatLockSettings.jsx';
import DeleteAccountModal from './DeleteAccountModal.jsx';
import BlockedUsersModal from './BlockedUsersModal.jsx';
import CreateGroupModal from './CreateGroupModal.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';
import VerifyUsersModal from './VerifyUsersModal.jsx';
import GlobalSearchModal from './GlobalSearchModal.jsx';
import StarredMessagesModal from './StarredMessagesModal.jsx';
import ScheduledMessagesList from './ScheduledMessagesList.jsx';
import ThemeSwitcher from './ThemeSwitcher.jsx';
import PrivacyVisibilityModal from './PrivacyVisibilityModal.jsx';
import QRCodeModal from './QRCodeModal.jsx';
import QRScannerModal from './QRScannerModal.jsx';
import ChangeUsernameModal from './ChangeUsernameModal.jsx';
import RecoveryEmailModal from './RecoveryEmailModal.jsx';
import { useBackClose, closeViaBack } from '../hooks/useBackClose.js';

export default function Sidebar({
  tab,
  onTabChange,
  conversations, // pre-built, sorted list: { key, type, title, avatar, isOnline, preview, unread, lastSeen, isGroup, raw }
  activeKey,
  onSelectConversation,
  incomingCount,
  hiddenOnMobile,
  onAvatarClick,
  children,
  lockEnabled,
  onLockChanged,
  statusFeed = [],
  currentUser,
  onOpenMyStatus,
  onAddStatus,
  onOpenFriendStatus,
  friendsForGroupCreation = [],
  onGroupCreated,
  privacyBlockGroupAdd,
  onTogglePrivacy,
  onOpenChat,
  onSendRequest,
  onJumpToMessage,
  onTogglePin,
}) {
  const { user, logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  useBackClose(confirmingLogout, () => setConfirmingLogout(false));
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  useBackClose(showSettingsMenu, () => setShowSettingsMenu(false));
  const [showLockSettings, setShowLockSettings] = useState(false);
  useBackClose(showLockSettings, () => setShowLockSettings(false));
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  useBackClose(showDeleteAccount, () => setShowDeleteAccount(false));
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  useBackClose(showBlockedUsers, () => setShowBlockedUsers(false));
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  useBackClose(showCreateGroup, () => setShowCreateGroup(false));
  const [showVerifyUsers, setShowVerifyUsers] = useState(false);
  useBackClose(showVerifyUsers, () => setShowVerifyUsers(false));
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  useBackClose(showGlobalSearch, () => setShowGlobalSearch(false));
  const [showStarred, setShowStarred] = useState(false);
  useBackClose(showStarred, () => setShowStarred(false));
  const [showScheduled, setShowScheduled] = useState(false);
  useBackClose(showScheduled, () => setShowScheduled(false));
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  useBackClose(showThemeSwitcher, () => setShowThemeSwitcher(false));
  const [showPrivacyVisibility, setShowPrivacyVisibility] = useState(false);
  useBackClose(showPrivacyVisibility, () => setShowPrivacyVisibility(false));
  const [showMyQR, setShowMyQR] = useState(false);
  useBackClose(showMyQR, () => setShowMyQR(false));
  const [showQRScanner, setShowQRScanner] = useState(false);
  useBackClose(showQRScanner, () => setShowQRScanner(false));

  const [showChangeUsername, setShowChangeUsername] = useState(false);
  useBackClose(showChangeUsername, () => setShowChangeUsername(false));

  const [showRecoveryEmail, setShowRecoveryEmail] = useState(false);
  useBackClose(showRecoveryEmail, () => setShowRecoveryEmail(false));

  const isSanju = user?.username?.toLowerCase() === 'sanju';

  return (
    <aside
      className={`w-full sm:w-80 shrink-0 bg-surface sm:border-r border-surface-border flex-col h-full ${
        hiddenOnMobile ? 'hidden sm:flex' : 'flex'
      }`}
    >
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-surface-border flex items-center gap-3 relative">
        <button onClick={onAvatarClick} className="shrink-0" aria-label="Edit profile picture">
          <Avatar username={user?.username} avatar={user?.avatar} size="md" preview={false} />
        </button>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-ember-50 truncate">Sanju Chat</p>
          <p className="text-xs text-ember-50/40 truncate flex items-center gap-1">
            @{user?.username}
            {user?.verified && <VerifiedBadge size={12} />}
          </p>
        </div>

        <button
          onClick={() => setShowGlobalSearch(true)}
          className="ml-auto text-ember-50/40 hover:text-ember-400 transition-colors p-1.5"
          aria-label="Search"
          title="Search"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
          </svg>
        </button>

        <button
          onClick={() => setShowCreateGroup(true)}
          className="text-ember-50/40 hover:text-ember-400 transition-colors p-1.5"
          aria-label="New group"
          title="New group"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
            <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
          </svg>
        </button>

        <button
          onClick={() => setShowSettingsMenu((v) => !v)}
          className="text-ember-50/40 hover:text-ember-400 transition-colors p-1.5"
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
            <path d="M19.4 13a7.5 7.5 0 0 0 .06-1 7.5 7.5 0 0 0-.06-1l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.4.96a7.4 7.4 0 0 0-1.7-.98l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.62.24-1.19.58-1.7.98l-2.4-.96a.5.5 0 0 0-.6.22L1.7 8.78a.5.5 0 0 0 .12.64L3.85 11a7.5 7.5 0 0 0-.06 1c0 .34.02.67.06 1l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.4.32.6.22l2.4-.96c.51.4 1.08.74 1.7.98l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.62-.24 1.19-.58 1.7-.98l2.4.96c.24.1.46 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64L19.4 13Zm-7.4 2.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
          </svg>
        </button>

        {showSettingsMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeViaBack} />
            <div className="absolute right-4 top-14 z-40 bg-void border border-surface-border rounded-xl shadow-neon-lg overflow-hidden w-56">
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
                  setShowStarred(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                ⭐ Starred messages
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowScheduled(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                ⏰ Scheduled messages
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowThemeSwitcher(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                🎨 Theme
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowPrivacyVisibility(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                Online status & last seen
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowMyQR(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                My QR code
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowQRScanner(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                Scan QR code
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowChangeUsername(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                Change username
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowRecoveryEmail(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border flex items-center justify-between"
              >
                <span>{user?.email ? 'Recovery email' : 'Add recovery email'}</span>
                {!user?.email && <span className="w-2 h-2 rounded-full bg-ember-500" />}
              </button>
              <button
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowBlockedUsers(true);
                }}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
              >
                Blocked users
              </button>
              {isSanju && (
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    setShowVerifyUsers(true);
                  }}
                  className="w-full text-left text-sm text-ember-400 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border flex items-center gap-1.5"
                >
                  Manage verified badges <VerifiedBadge size={13} />
                </button>
              )}
              <button
                onClick={() => onTogglePrivacy(!privacyBlockGroupAdd)}
                className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border flex items-center justify-between"
              >
                <span>Prevent group adds</span>
                <span
                  className={`w-9 h-5 rounded-full relative transition-colors ${
                    privacyBlockGroupAdd ? 'bg-ember-500' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      privacyBlockGroupAdd ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </span>
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
            <p className="text-sm text-ember-50/50 mb-5">Are you sure you want to sign out of Sanju Chat?</p>
            <div className="flex gap-2.5">
              <button
                onClick={closeViaBack}
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
        <ChatLockSettings enabled={lockEnabled} onClose={closeViaBack} onChanged={onLockChanged} />
      )}
      {showDeleteAccount && <DeleteAccountModal onClose={closeViaBack} />}
      {showChangeUsername && <ChangeUsernameModal onClose={closeViaBack} />}
      {showRecoveryEmail && <RecoveryEmailModal onClose={closeViaBack} />}
      {showBlockedUsers && <BlockedUsersModal onClose={closeViaBack} />}
      {showGlobalSearch && (
        <GlobalSearchModal
          onClose={closeViaBack}
          onOpenChat={onOpenChat}
          onSendRequest={onSendRequest}
        />
      )}
      {showStarred && (
        <StarredMessagesModal
          onClose={closeViaBack}
          currentUserId={user?.id}
          onJump={onJumpToMessage}
        />
      )}
      {showScheduled && <ScheduledMessagesList onClose={closeViaBack} />}
      {showThemeSwitcher && <ThemeSwitcher onClose={closeViaBack} />}
      {showPrivacyVisibility && (
        <PrivacyVisibilityModal
          friends={friendsForGroupCreation}
          onClose={closeViaBack}
        />
      )}
      {showMyQR && <QRCodeModal username={user?.username} onClose={closeViaBack} />}
      {showQRScanner && (
        <QRScannerModal
          onClose={closeViaBack}
          onFound={(username) => {
            setShowQRScanner(false);
            onSendRequest?.(username)?.catch?.(() => {});
          }}
        />
      )}
      {showVerifyUsers && <VerifyUsersModal onClose={closeViaBack} />}
      {showCreateGroup && (
        <CreateGroupModal
          friends={friendsForGroupCreation}
          onClose={closeViaBack}
          onCreated={onGroupCreated}
        />
      )}

      <StatusRow
        feed={statusFeed}
        currentUser={currentUser}
        onOpenMine={onOpenMyStatus}
        onAddStatus={onAddStatus}
        onOpenFriend={onOpenFriendStatus}
      />

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
          {conversations.length === 0 && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-ember-50/40">No conversations yet.</p>
              <p className="text-xs text-ember-50/30 mt-1">
                Go to "Add Friends" to find people, or create a group.
              </p>
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.key}
              onClick={() => onSelectConversation(c)}
              className={`group w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-xl mb-1 transition-colors text-left ${
                activeKey === c.key ? 'bg-ember-500/10 shadow-neon-inset' : 'hover:bg-void/60 active:bg-void/80'
              }`}
            >
              <Avatar username={c.title} avatar={c.avatar} online={!c.isGroup && c.isOnline} preview={false} />
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] sm:text-sm truncate flex items-center gap-1 ${c.unread > 0 ? 'font-semibold' : 'font-medium'} text-ember-50`}>
                  {c.pinned && (
                    <svg viewBox="0 0 24 24" width="11" height="11" className="fill-ember-400 shrink-0">
                      <path d="M16 3v6l2 2v2h-6v6l-1 1-1-1v-6H4v-2l2-2V3h1V2h6v1z" />
                    </svg>
                  )}
                  <span className="truncate">{c.title}</span>
                  {c.verified && <VerifiedBadge size={13} />}
                  {c.isGroup && <span className="text-ember-50/30 text-xs font-normal">group</span>}
                </p>
                <p className={`text-xs truncate ${c.unread > 0 ? 'text-ember-50/80 font-medium' : 'text-ember-50/35'}`}>
                  {c.preview}
                </p>
              </div>
              {c.unread > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-ember-500 text-void-950 text-[11px] font-bold flex items-center justify-center shadow-neon">
                  {c.unread}
                </span>
              )}
              {!c.isAI && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin?.(c.key);
                  }}
                  className={`shrink-0 p-1 rounded-full transition-opacity ${
                    c.pinned ? 'opacity-100 text-ember-400' : 'opacity-0 group-hover:opacity-100 text-ember-50/30 hover:text-ember-50/70'
                  }`}
                  aria-label={c.pinned ? 'Unpin chat' : 'Pin chat'}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current">
                    <path d="M16 3v6l2 2v2h-6v6l-1 1-1-1v-6H4v-2l2-2V3h1V2h6v1z" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-ember">{children}</div>
      )}
    </aside>
  );
}
