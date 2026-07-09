const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function EmojiReactionPicker({ onPick, mine }) {
  return (
    <div
      className={`absolute -top-11 z-20 flex gap-1 bg-surface border border-surface-border rounded-full px-2 py-1.5 shadow-neon-lg ${
        mine ? 'right-0' : 'left-0'
      }`}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onPick(emoji)}
          className="text-lg leading-none w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
