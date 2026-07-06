import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { formatLastSeen } from '../utils/time.js';

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
}) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`w-full sm:w-80 shrink-0 bg-surface sm:border-r border-surface-border flex-col h-full ${
        hiddenOnMobile ? 'hidden sm:flex' : 'flex'
      }`}
    >
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-surface-border flex items-center gap-3">
        <button onClick={onAvatarClick} className="shrink-0" aria-label="Edit profile picture">
          <Avatar username={user?.username} avatar={user?.avatar} size="md" />
        </button>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-ember-50 truncate">Sanju Chat</p>
          <p className="text-xs text-ember-50/40 truncate">@{user?.username}</p>
        </div>
        <button
          onClick={logout}
          className="ml-auto text-xs text-ember-50/40 hover:text-ember-400 transition-colors px-2 py-1.5"
        >
          Sign out
        </button>
      </div>

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
            return (
              <button
                key={u._id}
                onClick={() => onSelectUser(u)}
                className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-xl mb-1 transition-colors text-left ${
                  isActive ? 'bg-ember-500/10 shadow-neon-inset' : 'hover:bg-void/60 active:bg-void/80'
                }`}
              >
                <Avatar username={u.username} avatar={u.avatar} online={isOnline} />
                <div className="min-w-0">
                  <p className="text-[15px] sm:text-sm font-medium text-ember-50 truncate">{u.username}</p>
                  <p className="text-xs text-ember-50/35 truncate">
                    {isOnline ? 'Online' : formatLastSeen(u.lastSeen)}
                  </p>
                </div>
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
