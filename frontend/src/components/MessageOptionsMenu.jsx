export default function MessageOptionsMenu({ mine, isText, isDeleted, onReply, onCopy, onEdit, onUnsend, onClose }) {
  const item = (label, onClick, danger) => (
    <button
      onClick={() => {
        onClick();
        onClose();
      }}
      className={`w-full text-left text-sm px-4 py-2.5 hover:bg-surface-light ${
        danger ? 'text-red-400' : 'text-ember-50/80'
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className={`absolute top-6 z-40 w-40 bg-void border border-surface-border rounded-xl shadow-neon-lg overflow-hidden ${
          mine ? 'right-0' : 'left-0'
        }`}
      >
        {item('Reply', onReply)}
        {isText && !isDeleted && item('Copy', onCopy)}
        {mine && isText && !isDeleted && item('Edit', onEdit)}
        {mine && !isDeleted && item('Unsend', onUnsend, true)}
      </div>
    </>
  );
}
