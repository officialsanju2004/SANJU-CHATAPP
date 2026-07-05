export default function ChatHeader({ activeUser, isOnline, onDeleteChat }) {
  if (!activeUser) {
    return (
      <>
        <style jsx>{`
          @media (max-width: 480px) {
            .empty-header {
              padding: 0 16px !important;
              height: 56px !important;
            }
            .empty-text {
              font-size: 13px !important;
            }
          }
        `}</style>
        <div className="empty-header h-14 md:h-16 border-b border-surface-border flex items-center px-4 md:px-6 shrink-0">
          <p className="empty-text text-xs md:text-sm text-ember-50/40">Select someone to start chatting</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 480px) {
          .header-container {
            padding: 0 12px !important;
            height: 56px !important;
            gap: 10px !important;
          }
          
          .user-avatar {
            width: 32px !important;
            height: 32px !important;
            font-size: 11px !important;
          }
          
          .username {
            font-size: 14px !important;
          }
          
          .status-text {
            font-size: 10px !important;
          }
          
          .delete-button {
            font-size: 11px !important;
            padding: 6px 10px !important;
            gap: 4px !important;
          }
          
          .delete-icon {
            width: 13px !important;
            height: 13px !important;
          }
          
          /* Adjust user info section */
          .user-info {
            flex: 1 !important;
            min-width: 0 !important;
          }
          
          .username-text {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          .header-container {
            padding: 0 16px !important;
            height: 60px !important;
          }
          
          .delete-button {
            font-size: 12px !important;
            padding: 6px 12px !important;
          }
        }
        
        /* Hover effects */
        .delete-button-hover:hover {
          background: rgba(0, 0, 0, 0.4);
        }
        
        @media (hover: none) {
          /* Disable hover on touch devices */
          .delete-button-hover:hover {
            background: transparent !important;
          }
          
          .delete-button-hover:active {
            background: rgba(0, 0, 0, 0.4) !important;
          }
        }
      `}</style>

      <div className="header-container h-14 md:h-16 border-b border-surface-border flex items-center gap-2 md:gap-3 px-3 md:px-6 shrink-0 bg-white dark:bg-gray-900">
        <div className="user-avatar w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center font-display font-semibold text-xs md:text-sm bg-void text-ember-400 border border-surface-border shrink-0">
          {activeUser.username[0]?.toUpperCase()}
        </div>
        
        <div className="user-info flex-1 min-w-0">
          <p className="username text-sm md:text-base font-semibold text-ember-50 username-text">
            {activeUser.username}
          </p>
          <p className="status-text text-[10px] md:text-xs text-ember-50/40">
            {isOnline ? '🟢 Online' : '⚫ Offline'}
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm(`Delete your conversation with ${activeUser.username}? This can't be undone.`)) {
              onDeleteChat?.();
            }
          }}
          className="delete-button ml-auto flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs font-medium text-ember-50/40 hover:text-ember-400 transition-colors px-2 md:px-2.5 py-1.5 rounded-lg delete-button-hover"
          title="Delete chat"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" className="delete-icon md:w-[15px] md:h-[15px] fill-current">
            <path d="M9 3a1 1 0 0 0-1 1v1H4.5a1 1 0 0 0 0 2H5v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm1 2V5h4v0h-4ZM8 7h8v13H8V7Zm2 2v9h1V9h-1Zm3 0v9h1V9h-1Z" />
          </svg>
          <span className="hidden sm:inline">Delete chat</span>
          <span className="inline sm:hidden">Delete</span>
        </button>
      </div>
    </>
  );
}