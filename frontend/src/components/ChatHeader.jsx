import { useState } from 'react';
import Avatar from './Avatar.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';
import { formatLastSeen } from '../utils/time.js';
import { useBackClose, closeViaBack } from '../hooks/useBackClose.js';
import MarqueeText from './MarqueeText.jsx';

export default function ChatHeader({
  activeUser,
  activeGroup,
  isOnline,
  onDeleteChat,
  onBack,
  isTyping,
  onAudioCall,
  onVideoCall,
  isBlocked,
  onToggleBlock,
  onOpenGroupInfo,
  onRenameContact,
  onToggleSearch,
  onOpenWallpaper,
  onOpenAutoDelete,
  onRemoveFriend,
}) {
  const [showMenu, setShowMenu] = useState(false);
  useBackClose(showMenu, () => setShowMenu(false));

  if (!activeUser && !activeGroup) {
    return (
      <div className="h-14 sm:h-16 border-b border-surface-border hidden sm:flex items-center px-6 shrink-0">
        <p className="text-sm text-ember-50/40">Select someone to start chatting</p>
      </div>
    );
  }

  const isGroup = !!activeGroup;
  const title = isGroup ? activeGroup.name : activeUser.nickname || activeUser.username;
  const subtitle = isGroup
    ? `${activeGroup.members?.length || 0} members`
    : isTyping
    ? 'Typing…'
    : isOnline
    ? 'Online'
    : formatLastSeen(activeUser.lastSeen);

  return (
    <div className="h-14 sm:h-16 border-b border-surface-border flex items-center gap-2 sm:gap-3 px-2 sm:px-6 shrink-0">
      <button
        onClick={onBack}
        className="sm:hidden w-9 h-9 shrink-0 flex items-center justify-center text-ember-50/60 hover:text-ember-50 rounded-full"
        aria-label="Back to chats"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
          <path d="M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z" />
        </svg>
      </button>

      <button onClick={isGroup ? onOpenGroupInfo : undefined} className="flex items-center gap-3 min-w-0">
        <Avatar username={title} avatar={isGroup ? activeGroup.avatar : activeUser.avatar} />
        <div className="min-w-0 text-left">
          <p className="text-[15px] sm:text-sm font-semibold text-ember-50 truncate flex items-center gap-1">
            {title}
            {!isGroup && activeUser.verified && <VerifiedBadge size={14} />}
          </p>
          <MarqueeText text={subtitle} className="text-xs text-ember-50/40" />
        </div>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        {!isGroup && (
          <>
            <button
              onClick={onAudioCall}
              disabled={isBlocked}
              className="w-9 h-9 flex items-center justify-center text-ember-50/60 hover:text-ember-400 hover:bg-void/60 rounded-full transition-colors disabled:opacity-30"
              title="Audio call"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
                <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
              </svg>
            </button>
            <button
              onClick={onVideoCall}
              disabled={isBlocked}
              className="w-9 h-9 flex items-center justify-center text-ember-50/60 hover:text-ember-400 hover:bg-void/60 rounded-full transition-colors disabled:opacity-30"
              title="Video call"
            >
              <svg viewBox="0 0 24 24" width="19" height="19" className="fill-current">
                <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z" />
              </svg>
            </button>
          </>
        )}

        <button
          onClick={onToggleSearch}
          className="w-9 h-9 flex items-center justify-center text-ember-50/60 hover:text-ember-400 hover:bg-void/60 rounded-full transition-colors"
          title="Search in this chat"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" className="fill-current">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
          </svg>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-9 h-9 flex items-center justify-center text-ember-50/60 hover:text-ember-400 hover:bg-void/60 rounded-full transition-colors"
            title="More options"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
              <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={closeViaBack} />
              <div className="absolute right-0 top-11 z-40 bg-void border border-surface-border rounded-xl shadow-neon-lg overflow-hidden w-52">
                {isGroup ? (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenGroupInfo?.();
                    }}
                    className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5"
                  >
                    Group info & members
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onRenameContact?.();
                      }}
                      className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5"
                    >
                      Rename contact
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onToggleBlock?.();
                      }}
                      className={`w-full text-left text-sm px-4 py-2.5 border-t border-surface-border ${
                        isBlocked ? 'text-ember-400' : 'text-red-400'
                      } hover:bg-surface-light`}
                    >
                      {isBlocked ? `Unblock ${activeUser.username}` : `Block ${activeUser.username}`}
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (
                          window.confirm(
                            `Remove ${activeUser.username} as a friend? You'll need to send a new friend request to chat again.`
                          )
                        ) {
                          onRemoveFriend?.();
                        }
                      }}
                      className="w-full text-left text-sm text-red-400 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
                    >
                      Remove friend
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenWallpaper?.();
                  }}
                  className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
                >
                  Chat wallpaper
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenAutoDelete?.();
                  }}
                  className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
                >
                  Auto-delete messages
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (window.confirm(`Delete this conversation? This can't be undone.`)) {
                      onDeleteChat?.();
                    }
                  }}
                  className="w-full text-left text-sm text-red-400 hover:bg-red-950/30 px-4 py-2.5 border-t border-surface-border"
                >
                  {isGroup ? 'Leave & delete group chat' : 'Delete chat'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
