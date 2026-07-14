import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

// Decodes a QR code out of a picked image file (gallery / file picker) using
// the same jsQR library the live camera scanner uses - draws the image onto
// an offscreen canvas, reads the pixel data, and runs it through jsQR.
function decodeQrFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) resolve(code.data);
      else reject(new Error('No QR code found in that image'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image'));
    };
    img.src = objectUrl;
  });
}

export default function QRScannerModal({ onClose, onFound }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [error, setError] = useState('');
  const [decoding, setDecoding] = useState(false);

  const handleCode = (data) => {
    if (!data?.startsWith('sanjuchat://add/')) {
      setError('That QR code is not a Sanju Chat code');
      return;
    }
    const username = data.replace('sanjuchat://add/', '');
    onFound(username);
  };

  const handleGalleryPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setDecoding(true);
    try {
      const data = await decodeQrFromFile(file);
      handleCode(data);
    } catch (err) {
      setError(err.message || 'Could not find a QR code in that image');
    } finally {
      setDecoding(false);
    }
  };

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
      .catch(() => setError('Camera permission denied - you can still pick a QR code from your gallery below'));

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
      {error && <p className="text-red-400 text-sm mt-4 text-center max-w-xs">{error}</p>}
      <p className="text-white/60 text-sm mt-4">Point your camera at a Sanju Chat QR code</p>

      <div className="flex items-center gap-2 w-full max-w-xs mt-2">
        <div className="flex-1 h-px bg-white/15" />
        <span className="text-white/40 text-xs">or</span>
        <div className="flex-1 h-px bg-white/15" />
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryPick}
        className="hidden"
      />
      <button
        onClick={() => galleryInputRef.current?.click()}
        disabled={decoding}
        className="mt-3 flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" className="fill-current">
          <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-14-4 2.5-3 2 2.5L15 10l4 6H7Z" />
        </svg>
        {decoding ? 'Reading QR code…' : 'Choose from gallery'}
      </button>

      <button
        onClick={onClose}
        className="mt-5 text-sm font-medium px-5 py-2 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        Cancel
      </button>
    </div>
  );
}
