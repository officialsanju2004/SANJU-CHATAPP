import { createPortal } from 'react-dom';

export default function MessageOptionsMenu({
  mine,
  isText,
  isDeleted,
  isStarred,
  onReply,
  onCopy,
  onEdit,
  onUnsend,
  onStar,
  onRemind,
  onClose,
  menuPos, // { top, left } ya { top, right } — parent se aayega
}) {
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

  if (!menuPos) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999]" onClick={onClose} />
     <div
  style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
  className="z-[1000] w-44 bg-void border border-surface-border rounded-xl shadow-neon-lg overflow-hidden"
>
        {item('Reply', onReply)}
        {isText && !isDeleted && item('Copy', onCopy)}
        {!isDeleted && item(isStarred ? 'Unstar ⭐' : 'Star ⭐', onStar)}
        {!isDeleted && item('Remind me…', onRemind)}
        {mine && isText && !isDeleted && item('Edit', onEdit)}
        {mine && !isDeleted && item('Unsend', onUnsend, true)}
      </div>
    </>,
    document.body
  );
}