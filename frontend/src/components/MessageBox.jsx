import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { mediaUrl, chatApi } from '../api/axios.js';
import { formatMessageTime, formatDuration, formatDateSeparator, isDifferentDay } from '../utils/time.js';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js';
import { linkify } from '../utils/linkify.js';
import EmojiReactionPicker from './EmojiReactionPicker.jsx';
import MessageOptionsMenu from './MessageOptionsMenu.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';
import PollBubble from './PollBubble.jsx';
import LocationBubble from './LocationBubble.jsx';
import ReminderModal from './ReminderModal.jsx';
import PollComposerModal from './PollComposerModal.jsx';
import LocationShareModal from './LocationShareModal.jsx';
import ScheduleMessageModal from './ScheduleMessageModal.jsx';

// Two overlapping checkmarks, WhatsApp-style. Gray = sent, blue = seen.
function Ticks({ seen }) {
  return (
    <svg
      viewBox="0 0 20 11"
      width="17"
      height="10"
      className={`inline-block ${seen ? 'text-sky-400' : 'opacity-70'}`}
    >
      <path
        d="M1 5.6 4 8.6 10 2.1"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 5.6 9 8.6 15 2.1"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplyArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
      <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11Z" />
    </svg>
  );
}

function replyPreviewText(replyTo) {
  if (!replyTo) return '';
  if (replyTo.type === 'image') return '📷 Photo';
  if (replyTo.type === 'voice') return '🎤 Voice message';
  return replyTo.content;
}

// Wraps a message row so it can be dragged right (mouse or touch, via the
// unified Pointer Events API) to trigger a reply - the WhatsApp gesture.
// A vertical drag is treated as a scroll attempt and cancels the swipe so it
// never fights with the message list's own scrolling.
function SwipeToReply({ message, onReply, children }) {
  const startRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [dx, setDx] = useState(0);
  const MAX_DRAG = 72;
  const THRESHOLD = 46;
const handlePointerDown = (e) => {
if (e.pointerType === 'mouse' && e.button !== 0) return;
startRef.current = { x: e.clientX, y: e.clientY };
draggingRef.current = true;
e.currentTarget.setPointerCapture?.(e.pointerId);
};
//   const handlePointerDown = (e) => {
//     if (
//   e.target.closest("button") ||
//   e.target.closest("[data-menu]")
// )
//   return;
//     if (e.pointerType === 'mouse' && e.button !== 0) return;
//     startRef.current = { x: e.clientX, y: e.clientY };
//     draggingRef.current = true;
//     e.currentTarget.setPointerCapture?.(e.pointerId);
//   };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    const deltaX = e.clientX - startRef.current.x;
    const deltaY = e.clientY - startRef.current.y;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
      draggingRef.current = false;
      setDx(0);
      return;
    }

    setDx(Math.max(0, Math.min(deltaX, MAX_DRAG)));
  };

  const endDrag = () => {
    if (draggingRef.current && dx > THRESHOLD) {
      onReply(message);
      navigator.vibrate?.(12);
    }
    draggingRef.current = false;
    setDx(0);
  };

  return (
    <div
      className="relative w-full select-none"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="absolute inset-y-0 left-0 flex items-center text-ember-400 pointer-events-none"
        style={{ opacity: Math.min(dx / THRESHOLD, 1) }}
      >
        <ReplyArrowIcon />
      </div>
      <div
        style={{
          transform: `translateX(${dx}px)`,
          transition: draggingRef.current ? 'none' : 'transform 0.2s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Renders message text with any URLs turned into real clickable links,
// without ever using dangerouslySetInnerHTML.
function LinkifiedText({ text, mine }) {
  const segments = useMemo(() => linkify(text), [text]);
  return (
    <p className="whitespace-pre-wrap break-words">
      {segments.map((seg, i) =>
        seg.isLink ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`underline underline-offset-2 ${
              mine ? 'text-void-950 font-medium' : 'text-ember-400'
            }`}
          >
            {seg.text}
          </a>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
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

// View-once photo: receiver sees a blurred tap-to-reveal card. Once opened,
// it's gone forever (the server has already scrubbed the URL from future
// fetches) - screenshots genuinely can't be reliably blocked on the web, so
// this is a clear disclosure + a best-effort nudge, not a hard guarantee.
function ViewOnceBubble({ message, mine, onOpen }) {
  if (message.viewOnceConsumed) {
    return (
      <div className={`flex items-center gap-2 py-1 ${mine ? 'text-void-950/70' : 'text-ember-50/50'}`}>
        <svg viewBox="0 0 24 24" width="16" height="16" className="fill-current shrink-0">
          <path d="M12 4.5c-5 0-9.3 3.1-11 7.5 1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
        </svg>
        <span className="text-sm italic">{mine ? 'Opened' : 'Photo · already viewed'}</span>
      </div>
    );
  }

  if (!mine && message.mediaUrl) {
    return (
      <button
        onClick={() => onOpen(message)}
        className="relative w-44 h-56 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-2 bg-void-950/40 border border-white/10"
      >
        <img
          src={mediaUrl(message.mediaUrl)}
          alt="view-once"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
        />
        <div className="relative z-10 w-11 h-11 rounded-full bg-black/50 flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="20" height="20" className="fill-white">
            <path d="M12 4.5c-5 0-9.3 3.1-11 7.5 1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
          </svg>
        </div>
        <span className="relative z-10 text-xs font-medium text-white">Tap to view once</span>
      </button>
    );
  }

  // Sender's own copy, not yet opened by the receiver
  return (
    <div className="flex items-center gap-2 py-1">
      <svg viewBox="0 0 24 24" width="16" height="16" className="fill-current shrink-0">
        <path d="M12 4.5c-5 0-9.3 3.1-11 7.5 1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
      </svg>
      <span className="text-sm italic">Photo · view once</span>
    </div>
  );
}

// Fullscreen view-once viewer: best-effort only. There is no web API that can
// reliably block or even detect a screenshot on every platform, so this is
// an honest disclosure plus a soft nudge (auto-closing if the tab loses
// visibility), not a real DRM-style guarantee.
function ViewOnceOverlay({ url, onClose }) {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') onClose();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4"
      style={{ userSelect: 'none', WebkitTouchCallout: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img src={url} alt="view-once" className="max-w-full max-h-[75vh] rounded-lg object-contain" />
      <p className="text-white/60 text-xs mt-4 text-center max-w-xs">
        Screenshots aren't meant to be taken of this photo. This can't be guaranteed on every device,
        but the sender trusted you with a one-time view.
      </p>
      <button
        onClick={onClose}
        className="mt-5 text-sm font-medium px-5 py-2 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        Close
      </button>
    </div>
  );
}

function VideoBubble({ src }) {
  return (
    <video
      src={src}
      controls
      playsInline
      className="max-w-[240px] sm:max-w-[280px] max-h-72 rounded-xl"
    />
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

function ReplyQuote({ replyTo, mine, currentUserId, friendUsername }) {
  if (!replyTo) return null;
  const fromMe = replyTo.sender === currentUserId || replyTo.sender?._id === currentUserId;
  const label = fromMe ? 'You' : friendUsername || 'them';

  return (
    <div
      className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] text-xs ${
        mine
          ? 'bg-void-950/10 border-void-950/50 text-void-950/80'
          : 'bg-void/50 border-ember-500/70 text-ember-50/80'
      }`}
    >
      <p className="font-semibold mb-0.5">{label}</p>
      <p className="truncate opacity-80">{replyPreviewText(replyTo)}</p>
    </div>
  );
}

function ReactionsBar({ reactions, mine }) {
  if (!reactions || reactions.length === 0) return null;
  const counts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={`absolute -bottom-3 z-30 flex gap-0.5 bg-surface border border-surface-border rounded-full px-1.5 py-0.5 shadow-md ${
        mine ? 'right-2' : 'left-2'
      }`}
    >
      {Object.entries(counts).map(([emoji, count]) => (
        <span key={emoji} className="text-xs leading-none flex items-center gap-0.5">
          {emoji}
          {count > 1 && <span className="text-[10px] text-ember-50/50">{count}</span>}
        </span>
      ))}
    </div>
  );
}

function statusReplyPreview(s) {
  if (!s) return '';
  if (s.type === 'image') return '📷 Photo status';
  if (s.type === 'video') return '🎥 Video status';
  return s.caption;
}

function StatusReplyQuote({ statusReplyTo, mine }) {
  if (!statusReplyTo) return null;
  return (
    <div
      className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] text-xs flex items-center gap-2 ${
        mine
          ? 'bg-void-950/10 border-void-950/50 text-void-950/80'
          : 'bg-void/50 border-ember-500/70 text-ember-50/80'
      }`}
    >
      {statusReplyTo.mediaUrl && statusReplyTo.type === 'image' && (
        <img src={mediaUrl(statusReplyTo.mediaUrl)} alt="status" className="w-8 h-8 rounded object-cover shrink-0" />
      )}
      <div className="min-w-0">
        <p className="font-semibold mb-0.5">Replied to status</p>
        <p className="truncate opacity-80">{statusReplyPreview(statusReplyTo)}</p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  onReply,
  showSeenLabel,
  currentUserId,
  friendUsername,
  onReact,
  onOpenViewOnce,
  onEdit,
  onUnsend,
  isGroup,
  memberCount,
  onVotePoll,
  onToggleStar,
  isHighlighted,
  bubbleRef,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [viewOnceOverlay, setViewOnceOverlay] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [showReminder, setShowReminder] = useState(false);
  const isStarred = message.starredBy?.some((id) => id === currentUserId || id?._id === currentUserId);

  const handleOpenViewOnce = async (msg) => {
    const result = await onOpenViewOnce(msg);
    if (result?.url) setViewOnceOverlay(result.url);
  };
const menuBtnRef = useRef(null);
const [menuPos, setMenuPos] = useState(null);

const MENU_WIDTH = 176;   // w-44
const MENU_HEIGHT = 220;  // rough max height of the menu (6 items)
const MARGIN = 8;

const openMenu = () => {
  if (menuBtnRef.current) {
    const rect = menuBtnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // horizontal: mine ho toh right-align, warna left-align — phir clamp
    let left = mine ? rect.right - MENU_WIDTH : rect.left;
    left = Math.max(MARGIN, Math.min(left, vw - MENU_WIDTH - MARGIN));

    // vertical: normally button ke neeche, par agar neeche jagah nahi
    // to upar khol do
    let top = rect.bottom + 6;
    if (top + MENU_HEIGHT > vh - MARGIN) {
      top = rect.top - MENU_HEIGHT - 6;
    }
    top = Math.max(MARGIN, top);

    setMenuPos({ top, left });
  }
  setShowMenu((v) => !v);
};
  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== message.content) onEdit(message._id, trimmed);
    setIsEditing(false);
  };

  if (message.deletedForEveryone) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-floatIn`}>
        <div className="max-w-[82%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl bg-void border border-surface-border text-ember-50/40 text-sm italic flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current shrink-0">
            <path d="M6.4 6.4 4.9 4.9 3.5 6.3 6.6 9.4a4.99 4.99 0 0 0 6 8L12.1 17H12a4.99 4.99 0 0 1-3.5-8.6L6.4 6.4Zm11.6 3.7c-.6-2-2.3-3.6-4.6-4L11.6 4.3A6.99 6.99 0 0 1 20 11c0 1.4-.4 2.7-1.2 3.8l-1.4-1.4c.4-.7.6-1.5.6-2.4 0-.4 0-.7-.1-1Z" />
          </svg>
          This message was deleted
        </div>
      </div>
    );
  }
const lastTap = useRef(0);

const handleDoublDeskTap = (e) => {
  // Sirf touch devices ke liye
  if (e.pointerType !== "touch") return;

  const now = Date.now();

  if (now - lastTap.current < 300) {
    setShowPicker((v) => !v);
  }

  lastTap.current = now;
};
  return (
    <SwipeToReply message={message} onReply={onReply}>
      {isGroup && !mine && (
        <p className="text-xs font-medium text-ember-400 ml-1 mb-0.5 flex items-center gap-1">
          {message.sender?.username}
          {message.sender?.verified && <VerifiedBadge size={11} />}
        </p>
      )}
      <div
        ref={bubbleRef}
        className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-floatIn rounded-xl transition-shadow ${
          isHighlighted ? 'shadow-neon-lg ring-2 ring-ember-400' : ''
        }`}
      >
        <div className="relative max-w-[82%] sm:max-w-[70%] group">
          {showPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
              <EmojiReactionPicker
                mine={mine}
                onPick={(emoji) => {
                  onReact(message._id, emoji);
                  setShowPicker(false);
                }}
              />
            </>
          )}

         <button
  ref={menuBtnRef}
  data-menu
  onClick={(e) => { e.stopPropagation(); openMenu(); }}
  onPointerDown={(e) => { e.stopPropagation(); }}
  className={`absolute -top-1 ${
    mine ? '-left-7' : '-right-7'
  } w-6 h-6 rounded-full flex items-center justify-center text-ember-50/0 group-hover:text-ember-50/50 hover:!text-ember-50 hover:bg-void/60 transition-colors`}
  aria-label="Message options"
>
  <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current">
    <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  </svg>
</button>
{showMenu && menuPos && (
  <MessageOptionsMenu
    menuPos={menuPos}
    mine={mine}
    isText={message.type === 'text'}
    isDeleted={message.deletedForEveryone}
    isStarred={isStarred}
    onReply={() => onReply(message)}
    onCopy={() => navigator.clipboard?.writeText(message.content)}
    onEdit={() => setIsEditing(true)}
    onUnsend={() => onUnsend(message._id)}
    onStar={() => onToggleStar(message._id)}
    onRemind={() => setShowReminder(true)}
    onClose={() => setShowMenu(false)}
  />
)}

          <div
   onPointerDown={handleDoublDeskTap}
   onDoubleClick={() => setShowPicker((v) => !v)}
            className={`px-3.5 py-2.5 sm:px-4 rounded-2xl text-[15px] sm:text-sm leading-relaxed shadow-sm ${
              mine
                ? 'bg-ember-500 text-void-950 rounded-br-sm shadow-neon'
                : 'bg-surface-light border border-surface-border text-ember-50 rounded-bl-sm'
            }`}
          >
            <ReplyQuote
              replyTo={message.replyTo}
              mine={mine}
              currentUserId={currentUserId}
              friendUsername={friendUsername}
            />
            <StatusReplyQuote statusReplyTo={message.statusReplyTo} mine={mine} />
            {message.type === 'image' && message.viewOnce && (
              <ViewOnceBubble message={message} mine={mine} onOpen={handleOpenViewOnce} />
            )}
            {message.type === 'image' && !message.viewOnce && message.mediaUrl && (
              <ImageBubble src={mediaUrl(message.mediaUrl)} />
            )}
            {message.type === 'video' && message.mediaUrl && (
              <VideoBubble src={mediaUrl(message.mediaUrl)} />
            )}
            {message.type === 'voice' && message.mediaUrl && (
              <VoiceBubble src={mediaUrl(message.mediaUrl)} duration={message.duration} mine={mine} />
            )}
            {message.type === 'poll' && (
              <PollBubble message={message} mine={mine} currentUserId={currentUserId} onVote={onVotePoll} />
            )}
            {message.type === 'location' && <LocationBubble location={message.location} />}
            {message.type === 'text' && !isEditing && <LinkifiedText text={message.content} mine={mine} />}
            {message.type === 'text' && isEditing && (
              <div className="min-w-[200px]">
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  className="w-full bg-black/10 rounded-lg px-2 py-1 outline-none"
                />
                <div className="flex gap-2 mt-1.5 justify-end text-xs">
                  <button onClick={() => setIsEditing(false)} className="opacity-70 hover:opacity-100">
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} className="font-semibold">
                    Save
                  </button>
                </div>
              </div>
            )}
            <div
              className={`flex items-center gap-1 justify-end text-[10px] mt-1 ${
                mine ? 'text-void-950/60' : 'text-ember-50/35'
              }`}
            >
              {message.editedAt && <span className="italic opacity-70">edited</span>}
              {isStarred && (
                <svg viewBox="0 0 24 24" width="10" height="10" className="fill-current opacity-80">
                  <path d="M12 2 9.2 8.6 2 9.2l5.5 4.7L5.8 21 12 17.3 18.2 21l-1.7-7.1L22 9.2l-7.2-.6Z" />
                </svg>
              )}
              <span>{formatMessageTime(message.createdAt)}</span>
              {mine && !isGroup && <Ticks seen={!!message.seen} />}
              {mine && isGroup && memberCount > 1 && (
                <span className="opacity-70">
                  {(message.seenBy?.length || 0) >= memberCount - 1 ? '✓✓ Seen' : `✓ ${message.seenBy?.length || 0}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <ReactionsBar reactions={message.reactions} mine={mine} />
      {mine && !isGroup && showSeenLabel && (
        <p className="text-right text-[10px] text-sky-400/80 mt-0.5 pr-1">Seen</p>
      )}
      {viewOnceOverlay && (
        <ViewOnceOverlay url={viewOnceOverlay} onClose={() => setViewOnceOverlay(null)} />
      )}
      {showReminder && <ReminderModal message={message} onClose={() => setShowReminder(false)} />}
    </SwipeToReply>
  );
}

function DateSeparator({ date }) {
  return (
    <div className="flex justify-center my-3">
      <span className="text-[11px] font-medium text-ember-50/50 bg-surface-light border border-surface-border rounded-full px-3 py-1">
        {formatDateSeparator(date)}
      </span>
    </div>
  );
}

export function MessageList({
  messages,
  currentUserId,
  onLoadMore,
  hasMore,
  loadingMore,
  typing,
  onReply,
  friendUsername,
  onReact,
  onOpenViewOnce,
  onEdit,
  onUnsend,
  isGroup,
  memberCount,
  onVotePoll,
  onToggleStar,
  wallpaper,
  highlightMessageId,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevFirstIdRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const bubbleRefs = useRef(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const firstId = messages[0]?._id;
    const isPagination =
      firstId && prevFirstIdRef.current && firstId !== prevFirstIdRef.current && messages.length > 1;

    if (isPagination) {
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
    } else if (!highlightMessageId) {
      bottomRef.current?.scrollIntoView({ behavior: prevFirstIdRef.current ? 'smooth' : 'auto' });
    }
    prevFirstIdRef.current = firstId || null;
  }, [messages, highlightMessageId]);

  // Jump-to-message: scroll a specific bubble into view when asked to
  // (e.g. clicking a search result or a starred message)
  useEffect(() => {
    if (!highlightMessageId) return;
    const node = bubbleRefs.current.get(highlightMessageId);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightMessageId]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop < 120 && hasMore && !loadingMore) {
      prevScrollHeightRef.current = el.scrollHeight;
      onLoadMore?.();
    }
  };

  // Only the most recent message *I* sent gets the little "Seen" label under
  // it (exactly how WhatsApp does it) - not every seen message, just the
  // latest one, and only while it's actually been seen.
  const lastSeenMineId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      const isMine = m.sender === currentUserId || m.sender?._id === currentUserId;
      if (isMine) return m.seen ? m._id : null;
    }
    return null;
  }, [messages, currentUserId]);

  const wallpaperStyle = !wallpaper
    ? undefined
    : wallpaper.type === 'image'
    ? { backgroundImage: `url(${wallpaper.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: wallpaper.value };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={wallpaperStyle}
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
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showDateSeparator = isDifferentDay(m.createdAt, prev?.createdAt);
        return (
          <div key={m._id}>
            {showDateSeparator && <DateSeparator date={m.createdAt} />}
            <MessageBubble
              message={m}
              mine={m.sender === currentUserId || m.sender?._id === currentUserId}
              onReply={onReply}
              showSeenLabel={m._id === lastSeenMineId}
              currentUserId={currentUserId}
              friendUsername={friendUsername}
              onReact={onReact}
              onOpenViewOnce={onOpenViewOnce}
              onEdit={onEdit}
              onUnsend={onUnsend}
              isGroup={isGroup}
              memberCount={memberCount}
              onVotePoll={onVotePoll}
              onToggleStar={onToggleStar}
              isHighlighted={m._id === highlightMessageId}
              bubbleRef={(node) => {
                if (node) bubbleRefs.current.set(m._id, node);
                else bubbleRefs.current.delete(m._id);
              }}
            />
          </div>
        );
      })}
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

function ReplyBar({ replyingTo, onCancel, currentUserId, friendUsername }) {
  if (!replyingTo) return null;
  const fromMe = replyingTo.sender === currentUserId || replyingTo.sender?._id === currentUserId;

  return (
    <div className="flex items-center gap-2 px-4 sm:px-5 pt-2.5">
      <div className="flex-1 min-w-0 flex items-center gap-2 bg-void border border-surface-border rounded-lg px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ember-400">
            Replying to {fromMe ? 'yourself' : friendUsername || 'them'}
          </p>
          <p className="text-xs text-ember-50/60 truncate">{replyPreviewText(replyingTo)}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-ember-50/50 hover:text-ember-50 hover:bg-white/5"
          aria-label="Cancel reply"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current">
            <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function MessageComposer({
  onSendText,
  onSendMedia,
  onSendPoll,
  onSendLocation,
  onTyping,
  disabled,
  replyingTo,
  onCancelReply,
  currentUserId,
  friendUsername,
  conversationKey,
  scheduleTarget,
}) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewOnceArmed, setViewOnceArmed] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [showLocationShare, setShowLocationShare] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const fileInputRef = useRef(null);
  const { recording, seconds, start, stop, cancel } = useVoiceRecorder();

  // ✅ Draft messages: restore whatever was half-typed for this conversation,
  // and keep saving as the user types so switching chats never loses it.
  useEffect(() => {
    if (!conversationKey) return;
    const draft = localStorage.getItem(`draft:${conversationKey}`);
    setText(draft || '');
  }, [conversationKey]);

  useEffect(() => {
    if (!conversationKey) return;
    if (text) localStorage.setItem(`draft:${conversationKey}`, text);
    else localStorage.removeItem(`draft:${conversationKey}`);
  }, [text, conversationKey]);

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
      // data.type is 'image' or 'video', decided server-side from the real
      // file mimetype - view-once only makes sense for photos.
      onSendMedia({ type: data.type, mediaUrl: data.url, viewOnce: data.type === 'image' && viewOnceArmed });
      setViewOnceArmed(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
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
      {showPollComposer && (
        <PollComposerModal onClose={() => setShowPollComposer(false)} onSend={onSendPoll} />
      )}
      {showLocationShare && (
        <LocationShareModal onClose={() => setShowLocationShare(false)} onShare={onSendLocation} />
      )}
      {showScheduler && text.trim() && (
        <ScheduleMessageModal
          text={text.trim()}
          target={scheduleTarget}
          onClose={() => setShowScheduler(false)}
          onScheduled={() => setText('')}
        />
      )}
      <ReplyBar
        replyingTo={replyingTo}
        onCancel={onCancelReply}
        currentUserId={currentUserId}
        friendUsername={friendUsername}
      />
      {viewOnceArmed && (
        <div className="mx-4 sm:mx-5 mt-2 flex items-center gap-2 text-xs text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-lg px-3 py-1.5">
          <svg viewBox="0 0 24 24" width="14" height="14" className="fill-current shrink-0">
            <path d="M12 4.5c-5 0-9.3 3.1-11 7.5 1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
          </svg>
          Next photo will be sent as view-once
          <button onClick={() => setViewOnceArmed(false)} className="ml-auto underline">
            Cancel
          </button>
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
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => setShowAttachMenu((v) => !v)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-ember-50/50 hover:text-ember-400 hover:bg-void/60 disabled:opacity-40 transition-colors"
              aria-label="More attachments"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
                <path d="M11 5h2v14h-2z" />
                <path d="M5 11h14v2H5z" />
              </svg>
            </button>
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowAttachMenu(false)} />
                <div className="absolute bottom-12 left-0 z-40 w-44 bg-void border border-surface-border rounded-xl shadow-neon-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowPollComposer(true);
                    }}
                    className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5"
                  >
                    📊 Poll
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowLocationShare(true);
                    }}
                    className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border"
                  >
                    📍 Location
                  </button>
                  <button
                    type="button"
                    disabled={!text.trim()}
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowScheduler(true);
                    }}
                    className="w-full text-left text-sm text-ember-50/80 hover:bg-surface-light px-4 py-2.5 border-t border-surface-border disabled:opacity-40"
                  >
                    ⏰ Schedule this message
                  </button>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFilePick}
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-ember-50/50 hover:text-ember-400 hover:bg-void/60 disabled:opacity-40 transition-colors"
            aria-label="Send image or video"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
              <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-14-4 2.5-3 2 2.5L15 10l4 6H7Z" />
            </svg>
          </button>

          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => setViewOnceArmed((v) => !v)}
            title="Send next photo as view-once"
            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border transition-colors disabled:opacity-40 ${
              viewOnceArmed
                ? 'bg-ember-500 border-ember-500 text-void-950'
                : 'border-surface-border text-ember-50/50 hover:text-ember-400 hover:bg-void/60'
            }`}
            aria-label="Toggle view-once for next photo"
            aria-pressed={viewOnceArmed}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" className="fill-current">
              <path d="M12 4.5c-5 0-9.3 3.1-11 7.5 1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
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

