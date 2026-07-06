import { useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { useCall } from '../context/CallContext.jsx';

function CallButton({ onClick, className = '', title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export default function CallModal() {
  const {
    callState,
    callType,
    peerUser,
    callError,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    clearError,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream || null;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream || null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  // Auto-dismiss a transient call error toast (declined / offline / failed)
  useEffect(() => {
    if (!callError) return;
    const id = setTimeout(clearError, 3500);
    return () => clearTimeout(id);
  }, [callError, clearError]);

  if (callState === 'idle') {
    return callError ? (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-surface border border-surface-border text-ember-50/80 text-sm px-4 py-2 rounded-lg shadow-neon-lg animate-floatIn">
        {callError}
      </div>
    ) : null;
  }

  const isVideo = callType === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-void-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6 animate-floatIn">
      {isVideo && callState === 'connected' ? (
        <div className="relative w-full h-full">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-surface"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 w-28 h-40 sm:w-36 sm:h-52 object-cover rounded-xl border border-surface-border shadow-neon-lg"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Avatar username={peerUser?.username || '?'} avatar={peerUser?.avatar} size="xl" />
          <div className="text-center">
            <p className="text-lg font-display font-semibold text-ember-50">
              {peerUser?.username || 'Connecting…'}
            </p>
            <p className="text-sm text-ember-50/50 mt-1">
              {callState === 'incoming' && `Incoming ${isVideo ? 'video' : 'audio'} call…`}
              {callState === 'outgoing' && 'Ringing…'}
              {callState === 'connected' && (isVideo ? 'Video call' : 'Audio call in progress')}
            </p>
          </div>
        </div>
      )}

      {/* Hidden audio sink for audio-only calls so remote sound plays */}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay />}

      <div className="absolute bottom-8 flex items-center gap-4">
        {callState === 'incoming' ? (
          <>
            <CallButton
              onClick={rejectCall}
              title="Decline"
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" className="fill-current rotate-[135deg]">
                <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
              </svg>
            </CallButton>
            <CallButton
              onClick={acceptCall}
              title="Accept"
              className="bg-ember-500 hover:bg-ember-400 text-void-950 shadow-neon"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" className="fill-current">
                <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
              </svg>
            </CallButton>
          </>
        ) : (
          <>
            <CallButton
              onClick={toggleMute}
              title={muted ? 'Unmute' : 'Mute'}
              className={muted ? 'bg-ember-500 text-void-950' : 'bg-surface border border-surface-border text-ember-50/70 hover:text-ember-50'}
            >
              {muted ? (
                <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
                  <path d="M16.5 12c0-.23-.03-.46-.06-.68l-1.51 1.51v.17a2.94 2.94 0 0 1-4.62 2.43l-1.16 1.16A4.42 4.42 0 0 0 16.5 12ZM19.14 20 4.86 5.72 3.59 7l4.18 4.18v.82a4.42 4.42 0 0 0 6.02 4.13l1.68 1.68A6.9 6.9 0 0 1 12 19c-3.87 0-7-3.13-7-7H3.5a8.5 8.5 0 0 0 7 8.36V23h3v-2.64c.86-.15 1.67-.44 2.4-.85l1.97 1.97 1.27-1.27ZM9.94 6.11 12 8.17V6a2.94 2.94 0 0 0-4.4-2.55l1.05 1.05c.4-.29.9-.44 1.35-.39.85.1 1.7.94 1.7 1.9v.1Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
                  <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5.5A6.5 6.5 0 0 0 11.5 18.44V21h1v-2.56A6.5 6.5 0 0 0 18.5 12H17Z" />
                </svg>
              )}
            </CallButton>

            {isVideo && (
              <CallButton
                onClick={toggleCamera}
                title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                className={cameraOff ? 'bg-ember-500 text-void-950' : 'bg-surface border border-surface-border text-ember-50/70 hover:text-ember-50'}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
                  {cameraOff ? (
                    <path d="M17 10.5V7a1 1 0 0 0-1-1H5.83L3.7 3.87 2.29 5.29l18.42 18.42 1.41-1.41-3.12-3.12V10.5l4-4v11l-2-2ZM4 6.83 13.17 16H4a1 1 0 0 1-1-1V7.83L4 6.83Z" />
                  ) : (
                    <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z" />
                  )}
                </svg>
              </CallButton>
            )}

            <CallButton
              onClick={() => endCall(true)}
              title="End call"
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" className="fill-current rotate-[135deg]">
                <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
              </svg>
            </CallButton>
          </>
        )}
      </div>
    </div>
  );
}
