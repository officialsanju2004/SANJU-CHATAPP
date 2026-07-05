import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({
  tab,
  onTabChange,
  friends,
  activeUser,
  onSelectUser,
  onlineUserIds,
  incomingCount,
  children,
}) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 480px) {
          .sidebar-container {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .sidebar-header {
            padding: 12px 16px !important;
            gap: 10px !important;
          }
          
          .sidebar-logo {
            width: 32px !important;
            height: 32px !important;
            border-radius: 10px !important;
          }
          
          .sidebar-logo-text {
            font-size: 12px !important;
          }
          
          .sidebar-title {
            font-size: 13px !important;
          }
          
          .sidebar-username {
            font-size: 11px !important;
          }
          
          .signout-button {
            font-size: 11px !important;
            padding: 4px 8px !important;
          }
          
          /* Tab switcher */
          .tab-container {
            padding: 8px 12px !important;
            gap: 6px !important;
          }
          
          .tab-button {
            font-size: 11px !important;
            padding: 6px 8px !important;
            min-height: 32px !important;
          }
          
          .tab-badge {
            min-width: 16px !important;
            height: 16px !important;
            font-size: 9px !important;
            top: -6px !important;
            right: -6px !important;
          }
          
          /* Friend list */
          .friend-list {
            padding: 6px 8px !important;
          }
          
          .friend-item {
            padding: 6px 10px !important;
            gap: 8px !important;
            border-radius: 10px !important;
            margin-bottom: 2px !important;
          }
          
          .friend-avatar {
            width: 32px !important;
            height: 32px !important;
            font-size: 11px !important;
          }
          
          .friend-online-indicator {
            width: 8px !important;
            height: 8px !important;
            bottom: -1px !important;
            right: -1px !important;
          }
          
          .friend-name {
            font-size: 13px !important;
          }
          
          .friend-status {
            font-size: 10px !important;
          }
          
          .empty-state-title {
            font-size: 13px !important;
          }
          
          .empty-state-subtitle {
            font-size: 11px !important;
          }
          
          /* Children container */
          .children-container {
            padding: 0 !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          .sidebar-container {
            width: 280px !important;
            max-width: 280px !important;
          }
          
          .sidebar-header {
            padding: 14px 20px !important;
          }
          
          .friend-item {
            padding: 8px 12px !important;
          }
        }
        
        /* Scrollbar styling */
        .scrollbar-sanju::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-sanju::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-sanju::-webkit-scrollbar-thumb {
          background: rgba(255, 149, 0, 0.3);
          border-radius: 10px;
        }
        .scrollbar-sanju::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 149, 0, 0.5);
        }
        
        /* Hover states - disable on touch devices */
        @media (hover: none) {
          .friend-item-hover:hover {
            background: transparent !important;
          }
          
          .friend-item-hover:active {
            background: rgba(255, 149, 0, 0.1) !important;
          }
        }
      `}</style>

      <aside className="sidebar-container w-full sm:w-80 shrink-0 bg-surface border-r border-surface-border flex flex-col h-full bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="sidebar-header px-4 md:px-5 py-3 md:py-4 border-b border-surface-border flex items-center gap-2 md:gap-3">
          <div className="sidebar-logo w-8 md:w-9 h-8 md:h-9 rounded-xl border-2 border-ember-500 shadow-neon flex items-center justify-center bg-void shrink-0">
            <span className="sidebar-logo-text font-display font-bold text-ember-500 text-xs md:text-sm">SC</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="sidebar-title font-display font-semibold text-xs md:text-sm text-ember-50 truncate">Sanju Chat</p>
            <p className="sidebar-username text-[10px] md:text-xs text-ember-50/40 truncate">@{user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="signout-button ml-auto text-[10px] md:text-xs text-ember-50/40 hover:text-ember-400 transition-colors px-2 py-1 md:px-0 md:py-0 rounded-lg hover:bg-void/40 md:hover:bg-transparent"
          >
            Sign out
          </button>
        </div>

        {/* Tab switcher */}
        <div className="tab-container flex px-3 md:px-4 pt-2 md:pt-3 gap-1.5 md:gap-2">
          <button
            onClick={() => onTabChange('chats')}
            className={`tab-button flex-1 text-[10px] md:text-xs font-medium py-1.5 md:py-2 rounded-lg transition-colors min-h-[32px] md:min-h-[36px] ${
              tab === 'chats'
                ? 'bg-ember-500 text-void-950 shadow-neon'
                : 'text-ember-50/50 hover:text-ember-50 bg-void border border-surface-border'
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => onTabChange('add')}
            className={`tab-button relative flex-1 text-[10px] md:text-xs font-medium py-1.5 md:py-2 rounded-lg transition-colors min-h-[32px] md:min-h-[36px] ${
              tab === 'add'
                ? 'bg-ember-500 text-void-950 shadow-neon'
                : 'text-ember-50/50 hover:text-ember-50 bg-void border border-surface-border'
            }`}
          >
            Add Friends
            {incomingCount > 0 && (
              <span className="tab-badge absolute -top-1.5 -right-1.5 min-w-[16px] md:min-w-[18px] h-[16px] md:h-[18px] px-1 rounded-full bg-ember-400 text-void-950 text-[8px] md:text-[10px] font-bold flex items-center justify-center shadow-neon">
                {incomingCount}
              </span>
            )}
          </button>
        </div>

        {tab === 'chats' ? (
          <div className="friend-list flex-1 overflow-y-auto scrollbar-sanju px-2 py-2 md:py-3">
            {friends.length === 0 && (
              <div className="px-3 py-4 md:py-6 text-center">
                <p className="empty-state-title text-sm md:text-base text-ember-50/40">No friends yet.</p>
                <p className="empty-state-subtitle text-[10px] md:text-xs text-ember-50/30 mt-1">
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
                  className={`friend-item w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-2.5 rounded-xl mb-1 transition-colors text-left ${
                    isActive ? 'bg-ember-500/10 shadow-neon-inset' : 'hover:bg-void/60 friend-item-hover'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`friend-avatar w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center font-display font-semibold text-xs md:text-sm ${
                        isActive ? 'bg-ember-500 text-void-950' : 'bg-void text-ember-400 border border-surface-border'
                      }`}
                    >
                      {u.username[0]?.toUpperCase()}
                    </div>
                    {isOnline && (
                      <span className="friend-online-indicator absolute -bottom-0.5 -right-0.5 w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-ember-400 border-2 border-surface shadow-neon" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="friend-name text-sm md:text-base font-medium text-ember-50 truncate">{u.username}</p>
                    <p className="friend-status text-[10px] md:text-xs text-ember-50/35 truncate">
                      {isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="children-container flex-1 overflow-y-auto scrollbar-ember">
            {children}
          </div>
        )}
      </aside>
    </>
  );
}