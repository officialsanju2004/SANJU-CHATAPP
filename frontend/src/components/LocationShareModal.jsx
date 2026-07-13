import { useState } from 'react';

export default function LocationShareModal({ onClose, onShare }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleShare = (live) => {
    setError('');
    if (!navigator.geolocation) return setError('Location isn\'t available on this device/browser');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onShare({ lat: pos.coords.latitude, lng: pos.coords.longitude, live, liveMinutes: 60 });
        setBusy(false);
        onClose();
      },
      () => {
        setError('Location permission denied');
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-xs shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-1">Share location</p>
        <p className="text-xs text-ember-50/50 mb-4">
          Your browser will ask for location permission the first time.
        </p>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button
          onClick={() => handleShare(false)}
          disabled={busy}
          className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border border-surface-border hover:bg-void/60 mb-2 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-ember-400 shrink-0">
            <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
          <span className="text-sm text-ember-50">Send current location</span>
        </button>

        <button
          onClick={() => handleShare(true)}
          disabled={busy}
          className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border border-surface-border hover:bg-void/60 mb-4 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" className="fill-ember-400 shrink-0">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 10.6 4 2.3-.8 1.4-4.7-2.7V6h1.5Z" />
          </svg>
          <span className="text-sm text-ember-50">Share live location (1 hour)</span>
        </button>

        <button
          onClick={onClose}
          className="w-full text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
