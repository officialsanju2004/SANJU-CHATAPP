import Logo from './Logo.jsx';

// Shown instead of a blank screen for the moments between "app opened" and
// "friends/groups/lock-status all loaded" - covers the whole viewport so
// nothing (sidebar, stories row, settings) peeks through half-ready.
export default function AppLoader() {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center gap-5 bg-void">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-ember-500/15 border-t-ember-500 animate-spin" />
        <Logo size={64} />
      </div>
      <div className="text-center">
        <p className="text-base font-display font-semibold text-ember-50 tracking-wide">
          Welcome to Sanju Chat
        </p>
        <p className="text-xs text-ember-50/40 mt-1">Getting your chats ready…</p>
      </div>
    </div>
  );
}
