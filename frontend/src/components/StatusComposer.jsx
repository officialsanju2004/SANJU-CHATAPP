import { useRef, useState } from 'react';
import { statusApi } from '../api/axios.js';

const COLORS = ['#f97316', '#dc2626', '#2563eb', '#16a34a', '#7c3aed', '#0f172a'];

export default function StatusComposer({ onClose, onPosted }) {
  const [mode, setMode] = useState('text'); // 'text' | 'image' | 'video'
  const [caption, setCaption] = useState('');
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handlePickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMode('image');
  };

  const handlePickVideo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMode('video');
  };

  const handlePost = async () => {
    setError('');
    if (mode === 'text' && !caption.trim()) return setError('Write something first');
    if ((mode === 'image' || mode === 'video') && !file) return setError('Pick a file first');

    setBusy(true);
    try {
      if (mode === 'image') {
        await statusApi.postImage(file, caption.trim());
      } else if (mode === 'video') {
        await statusApi.postVideo(file, caption.trim());
      } else {
        await statusApi.postText(caption.trim(), bgColor);
      }
      onPosted?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post status');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/90 flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-semibold text-ember-50">New status</p>
          <button onClick={onClose} className="text-ember-50/50 hover:text-ember-50">
            <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
              <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>

        {mode === 'image' && (
          <div className="rounded-xl overflow-hidden mb-3 bg-void aspect-[9/12] flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="preview" className="max-h-full max-w-full object-contain" />
            ) : (
              <p className="text-sm text-ember-50/40">No photo selected</p>
            )}
          </div>
        )}

        {mode === 'video' && (
          <div className="rounded-xl overflow-hidden mb-3 bg-void aspect-[9/12] flex items-center justify-center">
            {preview ? (
              <video src={preview} controls className="max-h-full max-w-full" />
            ) : (
              <p className="text-sm text-ember-50/40">No video selected</p>
            )}
          </div>
        )}

        {mode === 'text' && (
          <div
            className="rounded-xl mb-3 aspect-[9/12] flex items-center justify-center px-6"
            style={{ backgroundColor: bgColor }}
          >
            <p className="text-white text-xl font-medium text-center break-words">
              {caption || 'Type your status…'}
            </p>
          </div>
        )}

        {mode === 'text' && (
          <div className="flex gap-2 mb-3">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setBgColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${bgColor === c ? 'border-ember-400' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Background ${c}`}
              />
            ))}
          </div>
        )}

        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={300}
          placeholder={mode === 'text' ? "What's on your mind?" : 'Add a caption (optional)'}
          className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-ember-500 mb-2"
        />

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <input ref={imageInputRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handlePickVideo} className="hidden" />

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => (mode === 'image' ? imageInputRef.current?.click() : setMode('text'))}
            className="flex-1 text-xs font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
          >
            {mode === 'image' ? 'Change photo' : 'Text'}
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex-1 text-xs font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
          >
            Photo
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex-1 text-xs font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
          >
            Video
          </button>
        </div>

        <button
          onClick={handlePost}
          disabled={busy}
          className="w-full mt-2.5 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post status'}
        </button>
      </div>
    </div>
  );
}
