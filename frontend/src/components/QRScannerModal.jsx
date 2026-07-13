import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QRScannerModal({ onClose, onFound }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        tick();
      })
      .catch(() => setError('Camera permission denied'));

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data?.startsWith('sanjuchat://add/')) {
          const username = code.data.replace('sanjuchat://add/', '');
          onFound(username);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border-2 border-ember-500">
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      <p className="text-white/60 text-sm mt-4">Point your camera at a Sanju Chat QR code</p>
      <button
        onClick={onClose}
        className="mt-5 text-sm font-medium px-5 py-2 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        Cancel
      </button>
    </div>
  );
}
