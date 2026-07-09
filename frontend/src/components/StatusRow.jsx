import Avatar from './Avatar.jsx';
import StatusRing from './StatusRing.jsx';

export default function StatusRow({ feed, currentUser, onOpenMine, onAddStatus, onOpenFriend }) {
  const mine = feed.find((f) => f.isMine);
  const friends = feed.filter((f) => !f.isMine);

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-border overflow-x-auto scrollbar-ember">
      {/* My status / add status */}
      <div
        role="button"
        tabIndex={0}
        onClick={mine ? onOpenMine : onAddStatus}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') (mine ? onOpenMine : onAddStatus)();
        }}
        className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
      >
        <div className="relative">
          <StatusRing hasStatus={!!mine} hasUnseen={mine?.hasUnseen}>
            <Avatar username={currentUser?.username} avatar={currentUser?.avatar} size="lg" />
          </StatusRing>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddStatus();
            }}
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-ember-500 border-2 border-void-950 flex items-center justify-center"
            aria-label="Add status"
          >
            <svg viewBox="0 0 24 24" width="11" height="11" className="fill-void-950">
              <path d="M11 5h2v14h-2z" />
              <path d="M5 11h14v2H5z" />
            </svg>
          </button>
        </div>
        <span className="text-[11px] text-ember-50/60 max-w-[64px] truncate">My status</span>
      </div>

      {friends.map((f) => (
        <button
          key={f.user.id}
          onClick={() => onOpenFriend(f)}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <StatusRing hasStatus hasUnseen={f.hasUnseen}>
            <Avatar username={f.user.username} avatar={f.user.avatar} size="lg" />
          </StatusRing>
          <span className="text-[11px] text-ember-50/60 max-w-[64px] truncate">{f.user.username}</span>
        </button>
      ))}
    </div>
  );
}
