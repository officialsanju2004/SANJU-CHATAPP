import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import User from '../models/User.js';
import { sendPushToUser } from '../utils/webpush.js';

// userId -> Set of socket ids (a user can have multiple tabs/devices open)
export const onlineUsers = new Map();

// userId -> pending "mark offline" timeout. Lets a quick reconnect (page
// refresh, React StrictMode's double-mount in dev, a brief network blip, a
// backend restart the client auto-reconnects from) cancel the offline stamp
// instead of flashing everyone's status and lastSeen to "just now".
const pendingOffline = new Map();
const OFFLINE_GRACE_MS = 8000;

function addSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);

  // Cancel any pending "went offline" stamp for this user - they're back
  clearTimeout(pendingOffline.get(userId));
  pendingOffline.delete(userId);
}

function removeSocket(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

function scheduleOfflineStamp(io, userId) {
  clearTimeout(pendingOffline.get(userId));
  const timeoutId = setTimeout(async () => {
    pendingOffline.delete(userId);
    // If they reconnected during the grace window, do nothing
    if (onlineUsers.has(userId)) return;

    io.emit('online_users', Array.from(onlineUsers.keys()));
    try {
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { lastSeen });
      io.emit('user_last_seen', { userId, lastSeen });
    } catch (err) {
      console.error('lastSeen update error:', err.message);
    }
  }, OFFLINE_GRACE_MS);
  pendingOffline.set(userId, timeoutId);
}

// Emit an event to every open socket/tab a given user has, if they're online
export function emitToUser(io, userId, event, payload) {
  const sockets = onlineUsers.get(String(userId));
  if (!sockets) return;
  sockets.forEach((sid) => io.to(sid).emit(event, payload));
}

export function isUserOnline(userId) {
  return onlineUsers.has(String(userId));
}

function previewFor(message) {
  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'voice') return '🎤 Voice message';
  return message.content;
}

export function initSocket(io) {
  // Authenticate every socket connection using the same JWT used for REST calls
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(decoded.id);
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    addSocket(userId, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));

    socket.on('send_message', async ({ receiver, content, type, mediaUrl, duration }, callback) => {
      try {
        const messageType = type || 'text';
        if (!receiver) return callback?.({ error: 'No recipient specified' });
        if (messageType === 'text' && !content?.trim()) return callback?.(null);
        if (messageType !== 'text' && !mediaUrl) return callback?.({ error: 'Missing media' });

        // Only accepted friends can exchange messages
        const relation = await Friendship.findBetween(userId, receiver);
        if (!relation || relation.status !== 'accepted') {
          return callback?.({ error: 'You must be friends to message this user' });
        }

        const message = await Message.create({
          sender: userId,
          receiver,
          conversationId: Message.conversationIdFor(userId, receiver),
          type: messageType,
          content: content?.trim() || '',
          mediaUrl: mediaUrl || '',
          duration: duration || 0,
        });

        emitToUser(io, receiver, 'receive_message', message);
        callback?.(message);

        // Receiver has no tab/app open at all -> fall back to a Web Push
        // notification so they're alerted the way WhatsApp does. (If
        // they're online, the in-app Notification API in useNotifications.js
        // already covers the "tab open but unfocused" case.)
        if (!isUserOnline(receiver)) {
          const sender = await User.findById(userId).select('username avatar');
          sendPushToUser(receiver, {
            title: sender?.username || 'New message',
            body: previewFor(message),
            icon: sender?.avatar || '/icon-192.png',
            tag: `chat-${userId}`,
            url: '/',
            senderId: userId,
          }).catch((err) => console.error('push send error:', err.message));
        }
      } catch (err) {
        console.error('send_message error:', err.message);
        callback?.({ error: 'Message could not be sent' });
      }
    });

    // Typing indicator: relayed only, never persisted
    socket.on('typing', ({ receiver, isTyping }) => {
      if (!receiver) return;
      emitToUser(io, receiver, 'typing', { from: userId, isTyping: !!isTyping });
    });

    // ---- WebRTC signaling for audio/video calls ----
    // The server never touches media - it just relays SDP offers/answers and
    // ICE candidates between the two peers, plus the ring/accept/reject/hangup
    // handshake around them.

    socket.on('call_user', ({ to, offer, callType }) => {
      if (!to || !offer) return;
      if (!isUserOnline(to)) {
        return socket.emit('call_failed', { to, reason: 'offline' });
      }
      emitToUser(io, to, 'incoming_call', {
        from: userId,
        offer,
        callType: callType === 'video' ? 'video' : 'audio',
      });
    });

    socket.on('call_answer', ({ to, answer }) => {
      if (!to || !answer) return;
      emitToUser(io, to, 'call_answered', { from: userId, answer });
    });

    socket.on('call_ice_candidate', ({ to, candidate }) => {
      if (!to || !candidate) return;
      emitToUser(io, to, 'call_ice_candidate', { from: userId, candidate });
    });

    socket.on('call_reject', ({ to }) => {
      if (!to) return;
      emitToUser(io, to, 'call_rejected', { from: userId });
    });

    socket.on('call_end', ({ to }) => {
      if (!to) return;
      emitToUser(io, to, 'call_ended', { from: userId });
    });

    socket.on('disconnect', () => {
      removeSocket(userId, socket.id);

      // Still has another tab/device open -> nothing changed, no grace period needed
      if (onlineUsers.has(userId)) return;

      // Fully disconnected - wait a few seconds before broadcasting "offline"
      // and stamping lastSeen, in case this is just a quick reconnect
      scheduleOfflineStamp(io, userId);
    });
  });
}
