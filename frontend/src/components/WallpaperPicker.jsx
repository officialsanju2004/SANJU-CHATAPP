import { useRef, useState } from 'react';
import { chatApi } from '../api/axios.js';

export const WALLPAPER_PRESETS = [
  { id: 'default', label: 'Default', style: null },
  { id: 'midnight', label: 'Midnight', style: { background: 'linear-gradient(160deg,#0a0e1a,#141b2e)' } },
  { id: 'forest', label: 'Forest', style: { background: 'linear-gradient(160deg,#07130d,#0f2418)' } },
  { id: 'sunset', label: 'Sunset', style: { background: 'linear-gradient(160deg,#1a0e07,#2e1710)' } },
  { id: 'grape', label: 'Grape', style: { background: 'linear-gradient(160deg,#150a1e,#241132)' } },
  { id: 'charcoal', label: 'Charcoal', style: { background: '#101010' } },
];

export function wallpaperKey(conversationKey) {
  return `wallpaper:${conversationKey}`;
}

export function loadWallpaper(conversationKey) {
  try {
    const raw = localStorage.getItem(wallpaperKey(conversationKey));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function WallpaperPicker({ conversationKey, onClose, onChanged }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const apply = (wallpaper) => {
    if (wallpaper) localStorage.setItem(wallpaperKey(conversationKey), JSON.stringify(wallpaper));
    else localStorage.removeItem(wallpaperKey(conversationKey));
    onChanged?.(wallpaper);
    onClose();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await chatApi.uploadMedia(file);
      apply({ type: 'image', value: data.url });
    } catch (err) {
      // silently ignore - user can just try a preset instead
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-4">Chat wallpaper</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {WALLPAPER_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => apply(p.style ? { type: 'color', value: p.style.background } : null)}
              className="aspect-square rounded-xl border border-surface-border overflow-hidden flex items-end p-1.5"
              style={p.style || { background: '#050403' }}
            >
              <span className="text-[10px] text-white/70 bg-black/40 rounded px-1">{p.label}</span>
            </button>
          ))}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60 disabled:opacity-50 mb-2.5"
        >
          {uploading ? 'Uploading…' : 'Upload custom image'}
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950"
        >
          Done
        </button>
      </div>
    </div>
  );
}
