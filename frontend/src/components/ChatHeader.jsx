export default function ChatHeader({ activeUser, isOnline }) {
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
    </div>
  );
}
