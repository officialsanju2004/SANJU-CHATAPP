import { createPortal } from 'react-dom';
import { closeViaBack } from '../hooks/useBackClose.js';

// Fullscreen tap-to-close image viewer, WhatsApp-style. Shared by chat image
// bubbles and profile-picture previews so both look and behave the same way.
// Rendered via a portal straight into <body> - if it rendered inline instead,
// any ancestor with a CSS `transform` (e.g. the swipe-to-reply row) would
// turn into a containing block for `position: fixed`, making the "fullscreen"
// view get clipped to that ancestor's small box instead of covering the
// real viewport.
export default function MediaViewerOverlay({ src, alt = 'preview', onClose }) {
  return createPortal(
    <div
      onClick={onClose || closeViaBack}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
    >
      <img src={src} alt={alt} className="max-w-full max-h-full rounded-lg object-contain" />
    </div>,
    document.body
  );
}
