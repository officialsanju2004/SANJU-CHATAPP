import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext.jsx';

const CallContext = createContext(null);

// Public STUN server only - fine for two peers on open networks / same NAT.
// For reliable calls across arbitrary networks in production, add a TURN
// server here too, e.g. { urls: 'turn:your-turn-host:3478', username, credential }.
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// idle -> outgoing (ringing, we called) -> connected -> idle
// idle -> incoming (ringing, they called) -> connected -> idle
export function CallProvider({ children }) {
  const { socket } = useSocket();

  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('audio'); // 'audio' | 'video'
  const [peerUser, setPeerUser] = useState(null); // { _id, username, avatar }
  const [callError, setCallError] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pcRef = useRef(null);
  const pendingOfferRef = useRef(null); // {from, offer, callType} while ringing
  const pendingCandidatesRef = useRef([]); // ICE candidates that arrive before remote description is set
  const ringTimeoutRef = useRef(null); // auto end an unanswered call, like a real phone

  const RING_TIMEOUT_MS = 45000;

  const clearRingTimeout = useCallback(() => {
    clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    setMuted(false);
    setCameraOff(false);
  }, [localStream]);

  const endCall = useCallback(
    (notifyPeer = true) => {
      clearRingTimeout();
      if (notifyPeer && peerUser && socket) {
        socket.emit('call_end', { to: peerUser._id });
      }
      cleanup();
      setCallState('idle');
      setPeerUser(null);
    },
    [cleanup, peerUser, socket, clearRingTimeout]
  );

  const buildPeerConnection = useCallback(
    (targetUserId) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('call_ice_candidate', { to: targetUserId, candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          if (pc.connectionState === 'failed') {
            setCallError('Call connection lost');
            endCall(true);
          }
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [socket, endCall]
  );

  const startCall = useCallback(
    async (targetUser, type = 'audio') => {
      if (!socket || callState !== 'idle') return;
      setCallError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
        setLocalStream(stream);
        setCallType(type);
        setPeerUser(targetUser);
        setCallState('outgoing');

        const pc = buildPeerConnection(targetUser._id);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call_user', { to: targetUser._id, offer, callType: type });

        // Like a real phone: if nobody answers within 45s, stop ringing
        // automatically instead of leaving the caller hanging forever.
        clearRingTimeout();
        ringTimeoutRef.current = setTimeout(() => {
          setCallError('No answer');
          endCall(true);
        }, RING_TIMEOUT_MS);
      } catch (err) {
        setCallError(err.name === 'NotAllowedError' ? 'Camera/microphone permission denied' : 'Could not start call');
        cleanup();
        setCallState('idle');
      }
    },
    [socket, callState, buildPeerConnection, cleanup, clearRingTimeout, endCall]
  );

  const acceptCall = useCallback(async () => {
    const pending = pendingOfferRef.current;
    if (!pending) return;
    clearRingTimeout();
    setCallError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: pending.callType === 'video',
      });
      setLocalStream(stream);

      const pc = buildPeerConnection(pending.from);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(pending.offer));
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call_answer', { to: pending.from, answer });

      setCallState('connected');
    } catch (err) {
      setCallError('Could not access camera/microphone');
      socket.emit('call_reject', { to: pending.from });
      cleanup();
      setCallState('idle');
      setPeerUser(null);
    }
  }, [socket, buildPeerConnection, cleanup, clearRingTimeout]);

  const rejectCall = useCallback(() => {
    clearRingTimeout();
    const pending = pendingOfferRef.current;
    if (pending) socket.emit('call_reject', { to: pending.from });
    cleanup();
    setCallState('idle');
    setPeerUser(null);
  }, [socket, cleanup, clearRingTimeout]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const next = !muted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [localStream, muted]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const next = !cameraOff;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  }, [localStream, cameraOff]);

  // ---- Socket listeners for the signaling events from backend/socket/index.js ----
  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = ({ from, offer, callType: type }) => {
      // Busy - auto-reject any second incoming call while one is in progress
      if (callState !== 'idle') {
        socket.emit('call_reject', { to: from });
        return;
      }
      pendingOfferRef.current = { from, offer, callType: type };
      setCallType(type);
      setPeerUser((prev) => prev || { _id: from });
      setCallState('incoming');

      // Stop ringing on this side too if it's never picked up, same as a
      // real phone eventually giving up.
      clearRingTimeout();
      ringTimeoutRef.current = setTimeout(() => {
        socket.emit('call_reject', { to: from });
        cleanup();
        setCallState('idle');
        setPeerUser(null);
      }, RING_TIMEOUT_MS);
    };

    const onCallAnswered = async ({ answer }) => {
      clearRingTimeout();
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      for (const candidate of pendingCandidatesRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];
      setCallState('connected');
    };

    const onIceCandidate = async ({ candidate }) => {
      if (pcRef.current?.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // benign if it arrives after teardown
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };

    const onCallRejected = () => {
      clearRingTimeout();
      setCallError('Call declined');
      cleanup();
      setCallState('idle');
      setPeerUser(null);
    };

    const onCallEnded = () => {
      clearRingTimeout();
      cleanup();
      setCallState('idle');
      setPeerUser(null);
    };

    const onCallFailed = ({ reason }) => {
      clearRingTimeout();
      setCallError(reason === 'offline' ? "User is offline - they'll see a missed call" : 'Call failed');
      cleanup();
      setCallState('idle');
      setPeerUser(null);
    };

    socket.on('incoming_call', onIncomingCall);
    socket.on('call_answered', onCallAnswered);
    socket.on('call_ice_candidate', onIceCandidate);
    socket.on('call_rejected', onCallRejected);
    socket.on('call_ended', onCallEnded);
    socket.on('call_failed', onCallFailed);

    return () => {
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_answered', onCallAnswered);
      socket.off('call_ice_candidate', onIceCandidate);
      socket.off('call_rejected', onCallRejected);
      socket.off('call_ended', onCallEnded);
      socket.off('call_failed', onCallFailed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callState, cleanup]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        peerUser,
        callError,
        localStream,
        remoteStream,
        muted,
        cameraOff,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        setPeerUser,
        clearError: () => setCallError(''),
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);