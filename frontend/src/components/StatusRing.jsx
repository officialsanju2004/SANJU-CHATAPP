export default function StatusRing({ hasStatus, hasUnseen, children }) {
  if (!hasStatus) return children;

  return (
    <div
      className={`rounded-full p-[2.5px] ${
        hasUnseen ? 'bg-gradient-to-tr from-ember-600 via-ember-400 to-ember-500 shadow-neon' : 'bg-ember-50/20'
      }`}
    >
      <div className="rounded-full bg-void-950 p-[1.5px]">{children}</div>
    </div>
  );
}
