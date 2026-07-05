import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({ users, activeUser, onSelectUser, onlineUserIds }) {
  const { user, logout } = useAuth();

  return (
    <aside className="w-full sm:w-72 shrink-0 bg-surface border-r border-surface-border flex flex-col h-full">
      <div className="px-5 py-4 border-b border-surface-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl border-2 border-ember-500 shadow-neon flex items-center justify-center bg-void shrink-0">
          <span className="font-display font-bold text-ember-500 text-sm">EC</span>
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-ember-50 truncate">Sanju Chat</p>
          <p className="text-xs text-ember-50/40 truncate">@{user?.username}</p>
        </div>
        <button
          onClick={logout}
          className="ml-auto text-xs text-ember-50/40 hover:text-ember-400 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ember-50/40">
          People
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-ember px-2 pb-4">
        {users.length === 0 && (
          <p className="px-3 text-sm text-ember-50/30">No other users yet.</p>
        )}
        {users.map((u) => {
          const isOnline = onlineUserIds?.includes(u._id);
          const isActive = activeUser?._id === u._id;
          return (
            <button
              key={u._id}
              onClick={() => onSelectUser(u)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors text-left ${
                isActive ? 'bg-ember-500/10 shadow-neon-inset' : 'hover:bg-void/60'
              }`}
            >
              <div className="relative shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-semibold text-sm ${
                    isActive ? 'bg-ember-500 text-void-950' : 'bg-void text-ember-400 border border-surface-border'
                  }`}
                >
                  {u.username[0]?.toUpperCase()}
                </div>
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ember-400 border-2 border-surface shadow-neon" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ember-50 truncate">{u.username}</p>
                <p className="text-xs text-ember-50/35 truncate">
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
