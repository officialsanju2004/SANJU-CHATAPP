export default function NotificationBanner({ permission, onEnable }) {
  if (permission === 'granted' || permission === 'unsupported') return null;

  if (permission === 'denied') {
    return (
      <div className="mx-3 sm:mx-4 mt-2 mb-1 flex items-center gap-2 text-xs text-ember-50/50 bg-void border border-surface-border rounded-lg px-3 py-2">
        Notifications are blocked for this site. Enable them from your browser's site settings to
        get alerts for new messages.
      </div>
    );
  }

  return (
    <div className="mx-3 sm:mx-4 mt-2 mb-1 flex items-center gap-3 text-xs bg-void border border-surface-border rounded-lg px-3 py-2">
      <span className="text-ember-50/60 flex-1">
        Turn on notifications to see who messaged you, even when this tab isn't focused.
      </span>
      <button
        onClick={onEnable}
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 shadow-neon transition-colors"
      >
        Enable
      </button>
    </div>
  );
}
