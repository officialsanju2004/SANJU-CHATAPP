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
  if (message.type === 'image') return message.viewOnce ? '📸 Photo (view once)' : '📷 Photo';
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

    socket.on(
      'send_message',
      async ({ receiver, content, type, mediaUrl, duration, replyTo, viewOnce }, callback) => {
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

          // If replying, make sure the quoted message is actually part of
          // this same conversation (can't quote a message from elsewhere)
          let replyToId = null;
          if (replyTo) {
            const conversationId = Message.conversationIdFor(userId, receiver);
            const original = await Message.findOne({ _id: replyTo, conversationId }).select('_id');
            if (original) replyToId = original._id;
          }

          let message = await Message.create({
            sender: userId,
            receiver,
            conversationId: Message.conversationIdFor(userId, receiver),
            type: messageType,
            content: content?.trim() || '',
            mediaUrl: mediaUrl || '',
            duration: duration || 0,
            replyTo: replyToId,
            // View-once only makes sense for a photo - silently ignore the
            // flag on text/voice messages instead of trusting the client.
            viewOnce: messageType === 'image' ? !!viewOnce : false,
          });

          // Populate the quoted message's preview fields so both sides can
          // render "replying to: ..." without an extra round trip
          if (replyToId) {
            message = await message.populate('replyTo', 'content type mediaUrl sender');
          }

          // Receiver already has this conversation open -> mark it seen
          // immediately instead of waiting for a separate mark_seen call
          const receiverHasChatOpen = openConversations.get(String(receiver)) === userId;
          if (receiverHasChatOpen) {
            message.seen = true;
            message.seenAt = new Date();
            await message.save();
          }

          emitToUser(io, receiver, 'receive_message', message);
          callback?.(message);

          if (receiverHasChatOpen) {
            emitToUser(io, userId, 'messages_seen', { by: receiver, upTo: message._id });
          }

          // Receiver has no tab/app open at all -> fall back to a Web Push
          // notification so they're alerted the way WhatsApp does. (If
          // they're online, the in-app Notification API in useNotifications.js
          // already covers the "tab open but unfocused" case.)
          const sender = await User.findById(userId).select('username avatar');

          sendPushToUser(receiver, {
            title: sender?.username || 'New message',
            body: previewFor(message),
            icon: sender?.avatar || '/icon-192.png',
            tag: `chat-${userId}`,
            url: '/',
            senderId: userId,
          }).catch((err) => console.error('push send error:', err));
        } catch (err) {
          console.error('send_message error:', err.message);
          callback?.({ error: 'Message could not be sent' });
        }
      }
    );

    // ---- Read receipts ----
    // userId -> the _id of the friend whose conversation they currently have
    // open on screen. Used both to mark new messages seen instantly (above)
    // and to bulk-mark everything seen when a chat is opened (below).
    // Declared on first use via the module-level map further down.

    // Client tells us "I just opened my chat with `sender`" (on mount, or
    // whenever the active conversation changes) - mark every unseen message
    // from them as seen, and let them know in real time.
    socket.on('open_conversation', ({ withUser }) => {
      openConversations.set(userId, withUser || null);
      if (!withUser) return;
      markSeen(io, userId, withUser);
    });

    // Client left the chat screen (closed the tab, switched conversations,
    // or logged out) - stop auto-marking their messages as seen.
    socket.on('close_conversation', () => {
      if (openConversations.get(userId)) openConversations.delete(userId);
    });

    // Fallback for an already-open conversation that just received a message
    // while the tab was in the background (visibility, not conversation,
    // changed) - client calls this once it becomes visible again.
    socket.on('mark_seen', ({ sender }) => {
      if (!sender) return;
      markSeen(io, userId, sender);
    });

    // Typing indicator: relayed only, never persisted
    socket.on('typing', ({ receiver, isTyping }) => {
      if (!receiver) return;
      emitToUser(io, receiver, 'typing', { from: userId, isTyping: !!isTyping });
    });

    // ---- Emoji reactions (WhatsApp-style, one reaction per user per message) ----
    const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    socket.on('react_message', async ({ messageId, emoji }) => {
      try {
        if (!ALLOWED_REACTIONS.includes(emoji)) return;
        const message = await Message.findById(messageId);
        if (!message) return;

        // Only the two people in this conversation may react to it
        const isParticipant =
          String(message.sender) === userId || String(message.receiver) === userId;
        if (!isParticipant) return;

        const existingIndex = message.reactions.findIndex((r) => String(r.user) === userId);
        if (existingIndex >= 0 && message.reactions[existingIndex].emoji === emoji) {
          // Tapping the same emoji again removes it (toggle off)
          message.reactions.splice(existingIndex, 1);
        } else if (existingIndex >= 0) {
          message.reactions[existingIndex].emoji = emoji;
        } else {
          message.reactions.push({ user: userId, emoji });
        }
        await message.save();

        const otherId = String(message.sender) === userId ? message.receiver : message.sender;
        const payload = { messageId, reactions: message.reactions };
        emitToUser(io, userId, 'message_reacted', payload);
        emitToUser(io, otherId, 'message_reacted', payload);
      } catch (err) {
        console.error('react_message error:', err.message);
      }
    });

    // ---- WebRTC signaling for audio/video calls ----
    // The server never touches media - it just relays SDP offers/answers and
    // ICE candidates between the two peers, plus the ring/accept/reject/hangup
    // handshake around them.

    socket.on('call_user', async ({ to, offer, callType }) => {
      if (!to || !offer) return;

      if (!isUserOnline(to)) {
        // Can't ring a truly offline device in real time (that needs native
        // VoIP push, which a web app doesn't have access to) - but at least
        // let them know they got a call attempt via Web Push, the same way
        // offline chat messages already work.
        const caller = await User.findById(userId).select('username avatar');
        sendPushToUser(to, {
          title: caller?.username || 'Someone',
          body: `📞 Missed ${callType === 'video' ? 'video' : 'audio'} call`,
          icon: caller?.avatar || '/icon-192.png',
          tag: `call-${userId}`,
          url: '/',
          senderId: userId,
        }).catch((err) => console.error('call push error:', err));

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
      openConversations.delete(userId);

      // Still has another tab/device open -> nothing changed, no grace period needed
      if (onlineUsers.has(userId)) return;

      // Fully disconnected - wait a few seconds before broadcasting "offline"
      // and stamping lastSeen, in case this is just a quick reconnect
      scheduleOfflineStamp(io, userId);
    });
  });
}

// userId -> the _id of the friend whose conversation window is currently
// open for them. Lives at module scope (like onlineUsers) since it needs to
// be readable from inside the send_message handler above.
const openConversations = new Map();

async function markSeen(io, viewerId, otherUserId) {
  try {
    const conversationId = Message.conversationIdFor(viewerId, otherUserId);
    const result = await Message.updateMany(
      { conversationId, receiver: viewerId, sender: otherUserId, seen: false },
      { seen: true, seenAt: new Date() }
    );
    if (result.modifiedCount > 0) {
      emitToUser(io, otherUserId, 'messages_seen', { by: viewerId });
    }
  } catch (err) {
    console.error('mark_seen error:', err.message);
  }
}
