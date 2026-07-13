import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeModal({ username, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `sanjuchat://add/${username}`, {
        width: 220,
        margin: 1,
        color: { dark: '#ff9500', light: '#00000000' },
      });
    }
  }, [username]);

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-6 w-full max-w-xs shadow-neon-lg animate-floatIn flex flex-col items-center">
        <p className="font-display font-semibold text-ember-50 mb-1">My QR code</p>
        <p className="text-xs text-ember-50/50 mb-4">@{username}</p>
        <div className="bg-void-950 rounded-xl p-4 border border-surface-border">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-xs text-ember-50/40 mt-4 text-center">
          Someone can scan this to send you a friend request instantly.
        </p>
        <button
          onClick={onClose}
          className="w-full mt-5 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950"
        >
          Done
        </button>
      </div>
    </div>
  );
}
