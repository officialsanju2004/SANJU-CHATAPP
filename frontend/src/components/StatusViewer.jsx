import { useEffect, useRef, useState } from 'react';
import { statusApi, mediaUrl } from '../api/axios.js';
import Avatar from './Avatar.jsx';

const SLIDE_MS = 5000;

export default function StatusViewer({ entry, isMine, onClose, onDeleted, onReply }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState(null);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [paused, setPaused] = useState(false);
  const [sent, setSent] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const videoRef = useRef(null);

  const statuses = entry.statuses;
  const current = statuses[index];
  const isVideo = current.type === 'video';

  useEffect(() => {
    if (!isMine) {
      statusApi.markViewed(current._id).catch(() => {});
    }
    setProgress(0);
    setSent(false);
    startRef.current = Date.now();

    // Video statuses advance when the clip ends (see onEnded below), not on
    // a fixed timer - images and text statuses still use the 5s timer.
    if (isVideo) return undefined;

    const tick = () => {
      if (paused) {
        timerRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min(elapsed / SLIDE_MS, 1));
      if (elapsed >= SLIDE_MS) {
        goNext();
      } else {
        timerRef.current = requestAnimationFrame(tick);
      }
    };
    timerRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current._id, paused]);

  const goNext = () => {
    if (index < statuses.length - 1) setIndex((i) => i + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const loadViewers = async () => {
    setShowViewers(true);
    try {
      const { data } = await statusApi.viewers(current._id);
      setViewers(data);
    } catch (err) {
      setViewers([]);
    }
  };

  const handleDelete = async () => {
    await statusApi.remove(current._id);
    onDeleted?.(current._id);
    onClose();
  };

  const handleSendReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onReply?.(trimmed, current, entry.user);
    setReplyText('');
    setSent(true);
    setTimeout(() => setSent(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
        {/* Progress bars */}
        <div className="flex gap-1.5 px-3 pt-3">
          {statuses.map((s, i) => (
            <div key={s._id} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Avatar username={entry.user.username} avatar={entry.user.avatar} size="sm" />
          <span className="text-white text-sm font-medium">{isMine ? 'You' : entry.user.username}</span>
          <span className="text-white/50 text-xs">
            {new Date(current.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white p-1">
            <svg viewBox="0 0 24 24" width="22" height="22" className="fill-current">
              <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Tap zones (video has its own controls, so skip zones over it) */}
          {!isVideo && (
            <>
              <button onClick={goPrev} className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label="Previous" />
              <button onClick={goNext} className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label="Next" />
            </>
          )}

          {current.type === 'image' && (
            <img src={mediaUrl(current.mediaUrl)} alt="status" className="max-h-full max-w-full object-contain" />
          )}

          {current.type === 'video' && (
            <video
              ref={videoRef}
              src={mediaUrl(current.mediaUrl)}
              autoPlay
              playsInline
              controls
              className="max-h-full max-w-full"
              onEnded={goNext}
              onTimeUpdate={(e) => {
                const v = e.target;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
            />
          )}

          {current.type === 'text' && (
            <div
              className="w-full h-full flex items-center justify-center px-8"
              style={{ backgroundColor: current.bgColor }}
            >
              <p className="text-white text-2xl font-medium text-center leading-snug">{current.caption}</p>
            </div>
          )}

          {current.type !== 'text' && current.caption && (
            <p className="absolute bottom-6 left-4 right-4 text-white text-sm bg-black/40 rounded-lg px-3 py-2">
              {current.caption}
            </p>
          )}
        </div>

        {/* Own status: viewers + delete. Friend's status: reply box */}
        {isMine ? (
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={loadViewers}
              className="flex items-center gap-1.5 text-white/80 text-sm hover:text-white"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" className="fill-current">
                <path d="M12 5c-7.6 0-11 6.5-11 7s3.4 7 11 7 11-6.5 11-7-3.4-7-11-7Zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9Z" />
              </svg>
              {current.views?.length || 0} views
            </button>
            <button onClick={handleDelete} className="text-red-400 text-sm hover:text-red-300">
              Delete
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 flex items-center gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
              placeholder={`Reply to ${entry.user.username}'s status…`}
              className="flex-1 bg-white/10 border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-ember-500"
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim()}
              className="w-10 h-10 shrink-0 rounded-full bg-ember-500 disabled:opacity-30 flex items-center justify-center"
              aria-label="Send reply"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" className="fill-void-950">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            </button>
            {sent && <span className="text-xs text-ember-400 absolute -top-6 right-4">Sent ✓</span>}
          </div>
        )}
      </div>

      {/* Viewers list sheet */}
      {showViewers && (
        <div
          className="absolute inset-0 bg-black/70 flex items-end z-20"
          onClick={() => setShowViewers(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-auto bg-surface rounded-t-2xl p-4 max-h-[60%] overflow-y-auto scrollbar-ember"
          >
            <p className="font-display font-semibold text-ember-50 mb-3">Viewed by</p>
            {viewers === null && <p className="text-sm text-ember-50/40">Loading…</p>}
            {viewers?.length === 0 && <p className="text-sm text-ember-50/40">No views yet</p>}
            {viewers?.map((v) => (
              <div key={v.user._id} className="flex items-center gap-3 py-2">
                <Avatar username={v.user.username} avatar={v.user.avatar} size="sm" />
                <span className="text-sm text-ember-50 flex-1">{v.user.username}</span>
                <span className="text-xs text-ember-50/40">
                  {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
