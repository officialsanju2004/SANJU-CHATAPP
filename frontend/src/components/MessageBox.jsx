import { useEffect, useRef, useState } from 'react';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageList({ messages, currentUserId }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-ember px-6 py-5 space-y-3">
      {messages.length === 0 && (
        <p className="text-center text-sm text-ember-50/30 mt-10">
          No messages yet — say hello 👋
        </p>
      )}
      {messages.map((m) => {
        const mine = m.sender === currentUserId || m.sender?._id === currentUserId;
        return (
          <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-floatIn`}>
            <div
              className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                mine
                  ? 'bg-ember-500 text-void-950 rounded-br-sm shadow-neon'
                  : 'bg-surface-light border border-surface-border text-ember-50 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className={`text-[10px] mt-1 ${mine ? 'text-void-950/60' : 'text-ember-50/35'}`}>
                {formatTime(m.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export function MessageComposer({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 px-5 py-4 border-t border-surface-border shrink-0"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? 'Select a conversation first' : 'Type a message…'}
        className="flex-1 bg-void border border-surface-border rounded-full px-4 py-2.5 text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-10 h-10 shrink-0 rounded-full bg-ember-500 hover:bg-ember-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-neon transition-colors"
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" className="fill-void-950" width="18" height="18">
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
        </svg>
      </button>
    </form>
  );
}
