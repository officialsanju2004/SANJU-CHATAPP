import Avatar from './Avatar.jsx';
import { formatLastSeen } from '../utils/time.js';

export default function ChatHeader({ activeUser, isOnline, onDeleteChat, onBack, isTyping }) {
  if (!activeUser) {
    return (
      <div className="h-14 sm:h-16 border-b border-surface-border hidden sm:flex items-center px-6 shrink-0">
        <p className="text-sm text-ember-50/40">Select someone to start chatting</p>
      </div>
    );
  }

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

      <Avatar username={activeUser.username} avatar={activeUser.avatar} />
      <div className="min-w-0">
        <p className="text-[15px] sm:text-sm font-semibold text-ember-50 truncate">{activeUser.username}</p>
        <p className="text-xs text-ember-50/40 truncate">
          {isTyping ? 'Typing…' : isOnline ? 'Online' : formatLastSeen(activeUser.lastSeen)}
        </p>
      </div>

      <button
        onClick={() => {
          if (window.confirm(`Delete your conversation with ${activeUser.username}? This can't be undone.`)) {
            onDeleteChat?.();
          }
        }}
        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-ember-50/40 hover:text-ember-400 transition-colors px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-void/60"
        title="Delete chat"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" className="fill-current">
          <path d="M9 3a1 1 0 0 0-1 1v1H4.5a1 1 0 0 0 0 2H5v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm1 2V5h4v0h-4ZM8 7h8v13H8V7Zm2 2v9h1V9h-1Zm3 0v9h1V9h-1Z" />
        </svg>
        <span className="hidden sm:inline">Delete chat</span>
      </button>
    </div>
  );
}
