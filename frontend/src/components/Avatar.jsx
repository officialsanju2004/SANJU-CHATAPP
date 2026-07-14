import { useState } from 'react';
import { mediaUrl } from '../api/axios.js';
import MediaViewerOverlay from './MediaViewerOverlay.jsx';
import { useBackClose, closeViaBack } from '../hooks/useBackClose.js';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

// `preview` (default true) lets anyone's profile picture be tapped open into
// a fullscreen view, WhatsApp-style. Only applies when an avatar image is
// actually set - the initials fallback isn't worth a fullscreen view.
export default function Avatar({
  username,
  avatar,
  size = 'md',
  online,
  className = '',
  preview = true,
}) {
  const sizeClass = SIZES[size] || SIZES.md;
  const [open, setOpen] = useState(false);
  useBackClose(open, () => setOpen(false));

  const canPreview = preview && !!avatar;

  const handleClick = (e) => {
    if (!canPreview) return;
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      {avatar ? (
        <img
          src={mediaUrl(avatar)}
          alt={username}
          onClick={handleClick}
          className={`${sizeClass} rounded-full object-cover border border-surface-border ${
            canPreview ? 'cursor-pointer' : ''
          }`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center font-display font-semibold bg-void text-ember-400 border border-surface-border`}
        >
          {username?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-ember-400 border-2 border-surface shadow-neon" />
      )}
      {open && canPreview && (
        <MediaViewerOverlay src={mediaUrl(avatar)} alt={username} onClose={closeViaBack} />
      )}
    </div>
  );
}
