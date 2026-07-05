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
    <>
      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 480px) {
          .message-container {
            padding: 12px 12px !important;
            gap: 10px !important;
          }
          
          .message-bubble {
            max-width: 85% !important;
            padding: 8px 12px !important;
            border-radius: 14px !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          
          .message-time {
            font-size: 9px !important;
            margin-top: 4px !important;
          }
          
          .empty-message {
            font-size: 13px !important;
            margin-top: 30px !important;
          }
          
          /* Adjust spacing between messages */
          .message-wrapper {
            margin-bottom: 2px !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          .message-container {
            padding: 16px 20px !important;
            gap: 12px !important;
          }
          
          .message-bubble {
            max-width: 75% !important;
            padding: 10px 14px !important;
          }
        }
        
        /* Scrollbar styling */
        .scrollbar-ember::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-ember::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-ember::-webkit-scrollbar-thumb {
          background: rgba(255, 149, 0, 0.3);
          border-radius: 10px;
        }
        .scrollbar-ember::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 149, 0, 0.5);
        }
        
        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-floatIn {
          animation: floatIn 0.2s ease-out;
        }
      `}</style>

      <div className="message-container flex-1 overflow-y-auto scrollbar-ember px-3 md:px-6 py-3 md:py-5 space-y-2 md:space-y-3 bg-white dark:bg-gray-900">
        {messages.length === 0 && (
          <p className="empty-message text-center text-xs md:text-sm text-ember-50/30 mt-8 md:mt-10">
            No messages yet — say hello 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender === currentUserId || m.sender?._id === currentUserId;
          return (
            <div key={m._id} className={`message-wrapper flex ${mine ? 'justify-end' : 'justify-start'} animate-floatIn`}>
              <div
                className={`message-bubble max-w-[80%] md:max-w-[70%] px-3 md:px-4 py-2 md:py-2.5 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm ${
                  mine
                    ? 'bg-ember-500 text-void-950 rounded-br-sm shadow-neon'
                    : 'bg-surface-light border border-surface-border text-ember-50 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-[14px] md:text-[15px]">
                  {m.content}
                </p>
                <p className={`message-time text-[9px] md:text-[10px] mt-1 ${mine ? 'text-void-950/60' : 'text-ember-50/35'}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </>
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
    <>
      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 480px) {
          .composer-container {
            padding: 8px 12px !important;
            gap: 8px !important;
          }
          
          .composer-input {
            font-size: 16px !important;
            padding: 10px 14px !important;
            min-height: 44px !important;
            border-radius: 22px !important;
          }
          
          .send-button {
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            min-height: 44px !important;
          }
          
          .send-icon {
            width: 16px !important;
            height: 16px !important;
          }
          
          /* Prevent iOS zoom */
          input[type="text"] {
            font-size: 16px !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          .composer-container {
            padding: 10px 16px !important;
            gap: 10px !important;
          }
          
          .composer-input {
            font-size: 15px !important;
            padding: 10px 16px !important;
          }
          
          .send-button {
            width: 42px !important;
            height: 42px !important;
          }
        }
      `}</style>

      <form
        onSubmit={handleSubmit}
        className="composer-container flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-4 border-t border-surface-border shrink-0 bg-white dark:bg-gray-900"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? 'Select a conversation first' : 'Type a message…'}
          className="composer-input flex-1 bg-void border border-surface-border rounded-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="send-button w-9 md:w-10 h-9 md:h-10 shrink-0 rounded-full bg-ember-500 hover:bg-ember-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-neon transition-colors"
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" className="send-icon fill-void-950 w-4 md:w-[18px] h-4 md:h-[18px]" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </button>
      </form>
    </>
  );
}