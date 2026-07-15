export default function RecoveryEmailBanner({ hasRecoveryEmail, onAdd, dismissed, onDismiss }) {
  if (hasRecoveryEmail || dismissed) return null;

  return (
    <div className="mx-3 sm:mx-4 mt-2 mb-1 flex items-center gap-3 text-xs bg-void border border-surface-border rounded-lg px-3 py-2">
      <span className="text-ember-50/60 flex-1">
        Add a recovery email so you can reset your password with an OTP if you ever forget it.
      </span>
      <button
        onClick={onAdd}
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 shadow-neon transition-colors"
      >
        Add email
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 text-ember-50/40 hover:text-ember-50/70 text-base leading-none px-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
