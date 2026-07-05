export default function ChatHeader({ activeUser, isOnline, onDeleteChat }) {
  if (!activeUser) {
    return (
      <div className="h-16 border-b border-surface-border flex items-center px-6 shrink-0">
        <p className="text-sm text-ember-50/40">Select someone to start chatting</p>
      </div>
    );
  }

  return (
    <div className="h-16 border-b border-surface-border flex items-center gap-3 px-6 shrink-0">
      <div className="w-9 h-9 rounded-full flex items-center justify-center font-display font-semibold text-sm bg-void text-ember-400 border border-surface-border">
        {activeUser.username[0]?.toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-semibold text-ember-50">{activeUser.username}</p>
        <p className="text-xs text-ember-50/40">{isOnline ? 'Online' : 'Offline'}</p>
      </div>

      <button
        onClick={() => {
          if (window.confirm(`Delete your conversation with ${activeUser.username}? This can't be undone.`)) {
            onDeleteChat?.();
          }
        }}
        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-ember-50/40 hover:text-ember-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-void/60"
        title="Delete chat"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" className="fill-current">
          <path d="M9 3a1 1 0 0 0-1 1v1H4.5a1 1 0 0 0 0 2H5v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm1 2V5h4v0h-4ZM8 7h8v13H8V7Zm2 2v9h1V9h-1Zm3 0v9h1V9h-1Z" />
        </svg>
        Delete chat
      </button>
    </div>
  );
}
