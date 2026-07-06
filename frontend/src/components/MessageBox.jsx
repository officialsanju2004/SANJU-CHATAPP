import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { mediaUrl, chatApi } from '../api/axios.js';
import { formatMessageTime, formatDuration } from '../utils/time.js';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';

function Ticks() {
  return (
    <svg viewBox="0 0 16 11" width="14" height="10" className="inline-block fill-current">
      <path d="M11.1 0.3 4.5 6.9 2.4 4.8 1 6.2l3.5 3.5L12.5 1.7z" />
    </svg>
  );
}

function ImageBubble({ src }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="attachment"
        onClick={() => setOpen(true)}
        className="max-w-[220px] sm:max-w-[260px] max-h-72 rounded-xl object-cover cursor-pointer"
        loading="lazy"
      />
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <img src={src} alt="attachment full" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  );
}

function VoiceBubble({ src, duration, mine }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  return (
    <div className="flex items-center gap-2.5 w-52 sm:w-56">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const a = e.target;
          if (a.duration) setProgress(a.currentTime / a.duration);
        }}
      />
      <button
        onClick={toggle}
        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
          mine ? 'bg-void-950/15' : 'bg-ember-500/20'
        }`}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 h-1.5 rounded-full bg-current/15 overflow-hidden">
        <div
          className="h-full rounded-full bg-current/60"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums opacity-70">{formatDuration(duration)}</span>
    </div>
  );
}

function MessageBubble({ message, mine }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-floatIn`}>
      <div
        className={`max-w-[82%] sm:max-w-[70%] px-3.5 py-2.5 sm:px-4 rounded-2xl text-[15px] sm:text-sm leading-relaxed shadow-sm ${
          mine
            ? 'bg-ember-500 text-void-950 rounded-br-sm shadow-neon'
            : 'bg-surface-light border border-surface-border text-ember-50 rounded-bl-sm'
        }`}
      >
        {message.type === 'image' && message.mediaUrl && <ImageBubble src={mediaUrl(message.mediaUrl)} />}
        {message.type === 'voice' && message.mediaUrl && (
          <VoiceBubble src={mediaUrl(message.mediaUrl)} duration={message.duration} mine={mine} />
        )}
        {message.type === 'text' && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <div
          className={`flex items-center gap-1 justify-end text-[10px] mt-1 ${
            mine ? 'text-void-950/60' : 'text-ember-50/35'
          }`}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {mine && <Ticks />}
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, currentUserId, onLoadMore, hasMore, loadingMore, typing }) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevFirstIdRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const firstId = messages[0]?._id;
    const isPagination =
      firstId && prevFirstIdRef.current && firstId !== prevFirstIdRef.current && messages.length > 1;

    if (isPagination) {
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: prevFirstIdRef.current ? 'smooth' : 'auto' });
    }
    prevFirstIdRef.current = firstId || null;
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop < 120 && hasMore && !loadingMore) {
      prevScrollHeightRef.current = el.scrollHeight;
      onLoadMore?.();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto scrollbar-ember px-3 sm:px-6 py-4 sm:py-5 space-y-2.5 sm:space-y-3"
    >
      {loadingMore && (
        <p className="text-center text-xs text-ember-50/30 py-2">Loading earlier messages…</p>
      )}
      {messages.length === 0 && !loadingMore && (
        <p className="text-center text-sm text-ember-50/30 mt-10">
          No messages yet — say hello 👋
        </p>
      )}
      {messages.map((m) => (
        <MessageBubble
          key={m._id}
          message={m}
          mine={m.sender === currentUserId || m.sender?._id === currentUserId}
        />
      ))}
      {typing && (
        <div className="flex justify-start">
          <div className="bg-surface-light border border-surface-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ember-400 animate-pulseGlow" />
            <span className="w-1.5 h-1.5 rounded-full bg-ember-400 animate-pulseGlow [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-ember-400 animate-pulseGlow [animation-delay:0.3s]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

export function MessageComposer({ onSendText, onSendMedia, onTyping, disabled }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { recording, seconds, start, stop, cancel } = useVoiceRecorder();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
    onTyping?.(false);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    onTyping?.(true);
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { data } = await chatApi.uploadMedia(file);
      onSendMedia({ type: 'image', mediaUrl: data.url });
    } catch (err) {
      setError(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleMicDown = async () => {
    setError('');
    try {
      await start();
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const handleMicUp = async () => {
    const result = await stop();
    if (!result) return;
    setUploading(true);
    try {
      const file = new File([result.blob], `voice-${Date.now()}.webm`, { type: result.blob.type });
      const { data } = await chatApi.uploadMedia(file);
      onSendMedia({ type: 'voice', mediaUrl: data.url, duration: result.duration });
    } catch (err) {
      setError(err.response?.data?.message || 'Voice note upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-t border-surface-border shrink-0">
      {error && (
        <div className="mx-4 mt-2 text-xs text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-1.5">
          {error}
        </div>
      )}
      {recording ? (
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulseGlow" />
          <span className="text-sm text-ember-50 flex-1">Recording… {formatDuration(seconds)}</span>
          <button
            onClick={cancel}
            className="text-xs font-medium px-3 py-2 rounded-full border border-surface-border text-ember-50/60 hover:text-ember-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMicUp}
            className="w-10 h-10 rounded-full bg-ember-500 hover:bg-ember-400 flex items-center justify-center shadow-neon"
            aria-label="Send voice note"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" className="fill-void-950">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFilePick}
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-ember-50/50 hover:text-ember-400 hover:bg-void/60 disabled:opacity-40 transition-colors"
            aria-label="Send image"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
              <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-14-4 2.5-3 2 2.5L15 10l4 6H7Z" />
            </svg>
          </button>

          <input
            value={text}
            onChange={handleTextChange}
            onBlur={() => onTyping?.(false)}
            disabled={disabled || uploading}
            placeholder={disabled ? 'Select a conversation first' : 'Type a message…'}
            className="flex-1 min-w-0 bg-void border border-surface-border rounded-full px-4 py-2.5 text-base sm:text-sm text-ember-50 placeholder:text-ember-50/25 outline-none focus:border-ember-500 focus:shadow-neon transition-shadow disabled:opacity-50"
          />

          {text.trim() ? (
            <button
              type="submit"
              disabled={disabled || uploading}
              className="w-10 h-10 shrink-0 rounded-full bg-ember-500 hover:bg-ember-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-neon transition-colors"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" className="fill-void-950">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || uploading}
              onMouseDown={handleMicDown}
              onMouseUp={handleMicUp}
              onTouchStart={(e) => {
                e.preventDefault();
                handleMicDown();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleMicUp();
              }}
              className="w-10 h-10 shrink-0 rounded-full bg-ember-500 hover:bg-ember-400 disabled:opacity-40 flex items-center justify-center shadow-neon transition-colors"
              aria-label="Hold to record a voice note"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" className="fill-void-950">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
              </svg>
            </button>
          )}
        </form>
      )}
    </div>
  );
}
