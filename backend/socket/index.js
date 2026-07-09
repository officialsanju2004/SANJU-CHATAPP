import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import User from '../models/User.js';
import Block from '../models/Block.js';
import Group from '../models/Group.js';
import { sendPushToUser } from '../utils/webpush.js';

// userId -> Set of socket ids (a user can have multiple tabs/devices open)
export const onlineUsers = new Map();

// userId -> pending "mark offline" timeout. Lets a quick reconnect (page
// refresh, React StrictMode's double-mount in dev, a brief network blip, a
// backend restart the client auto-reconnects from) cancel the offline stamp
// instead of flashing everyone's status and lastSeen to "just now".
const pendingOffline = new Map();
const OFFLINE_GRACE_MS = 8000;

// userId -> the _id of the friend (DM) whose conversation window is
// currently open for them, or null. Used to mark incoming DMs seen instantly.
const openConversations = new Map();

// userId -> the _id of the GROUP whose conversation window is currently open
// for them, or null. Same idea as openConversations, but for groups.
const openGroupConversations = new Map();

const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function addSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
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

async function markGroupSeen(io, viewerId, groupId, group) {
  try {
    const conversationId = Message.conversationIdForGroup(groupId);
    const result = await Message.updateMany(
      { conversationId, sender: { $ne: viewerId }, 'seenBy.user': { $ne: viewerId } },
      { $push: { seenBy: { user: viewerId, seenAt: new Date() } } }
    );
    if (result.modifiedCount > 0) {
      const members = group?.members || (await Group.findById(groupId).select('members'))?.members || [];
      members.forEach((m) => emitToUser(io, m.user, 'group_messages_seen', { groupId, by: viewerId }));
    }
  } catch (err) {
    console.error('mark_group_seen error:', err.message);
  }
}

export function initSocket(io) {
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
      async ({ receiver, groupId, content, type, mediaUrl, duration, replyTo, viewOnce }, callback) => {
        try {
          const messageType = type || 'text';
          if (!receiver && !groupId) return callback?.({ error: 'No recipient specified' });
          if (messageType === 'text' && !content?.trim()) return callback?.(null);
          if (messageType !== 'text' && !mediaUrl) return callback?.({ error: 'Missing media' });

          let group = null;
          let conversationId;

          if (groupId) {
            group = await Group.findById(groupId);
            if (!group || !group.isMember(userId)) {
              return callback?.({ error: 'You are not a member of this group' });
            }
            conversationId = Message.conversationIdForGroup(groupId);
          } else {
            // Only accepted friends who haven't blocked each other can exchange DMs
            const relation = await Friendship.findBetween(userId, receiver);
            if (!relation || relation.status !== 'accepted') {
              return callback?.({ error: 'You must be friends to message this user' });
            }
            if (await Block.existsBetween(userId, receiver)) {
              return callback?.({ error: 'You can no longer message this user' });
            }
            conversationId = Message.conversationIdFor(userId, receiver);
          }

          // If replying, make sure the quoted message is actually part of
          // this same conversation (can't quote a message from elsewhere)
          let replyToId = null;
          if (replyTo) {
            const original = await Message.findOne({ _id: replyTo, conversationId }).select('_id');
            if (original) replyToId = original._id;
          }

          let message = await Message.create({
            sender: userId,
            receiver: group ? null : receiver,
            group: group ? groupId : null,
            conversationId,
            type: messageType,
            content: content?.trim() || '',
            mediaUrl: mediaUrl || '',
            duration: duration || 0,
            replyTo: replyToId,
            viewOnce: !group && messageType === 'image' ? !!viewOnce : false,
            seenBy: group ? [{ user: userId, seenAt: new Date() }] : [],
          });

          if (replyToId) {
            message = await message.populate('replyTo', 'content type mediaUrl sender');
          }
          if (group) {
            message = await message.populate('sender', 'username avatar');
          }

          const sender = await User.findById(userId).select('username avatar');

          if (group) {
            const otherMembers = group.members.filter((m) => String(m.user) !== userId);

            // Anyone with this group open right now has effectively already
            // "seen" it - mark them in before broadcasting.
            const instantSeenIds = otherMembers
              .filter((m) => openGroupConversations.get(String(m.user)) === String(groupId))
              .map((m) => String(m.user));

            if (instantSeenIds.length > 0) {
              message.seenBy.push(...instantSeenIds.map((uid) => ({ user: uid, seenAt: new Date() })));
              await message.save();
            }

            otherMembers.forEach((m) => emitToUser(io, m.user, 'receive_message', message));
            callback?.(message);

            // Push-notify members who are fully offline
            otherMembers
              .filter((m) => !isUserOnline(m.user))
              .forEach((m) => {
                sendPushToUser(m.user, {
                  title: group.name,
                  body: `${sender?.username || 'Someone'}: ${previewFor(message)}`,
                  icon: sender?.avatar || '/icon-192.png',
                  tag: `group-${groupId}`,
                  url: '/',
                  senderId: userId,
                }).catch((err) => console.error('group push error:', err));
              });
          } else {
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
            // notification, same as before.
            sendPushToUser(receiver, {
              title: sender?.username || 'New message',
              body: previewFor(message),
              icon: sender?.avatar || '/icon-192.png',
              tag: `chat-${userId}`,
              url: '/',
              senderId: userId,
            }).catch((err) => console.error('push send error:', err));
          }
        } catch (err) {
          console.error('send_message error:', err.message);
          callback?.({ error: 'Message could not be sent' });
        }
      }
    );

    // ---- Edit message (text only, sender only) ----
    socket.on('edit_message', async ({ messageId, content }) => {
      try {
        if (!content?.trim()) return;
        const message = await Message.findById(messageId);
        if (!message || String(message.sender) !== userId) return;
        if (message.type !== 'text' || message.deletedForEveryone) return;

        message.content = content.trim();
        message.editedAt = new Date();
        await message.save();

        const payload = { messageId, content: message.content, editedAt: message.editedAt };
        if (message.group) {
          const group = await Group.findById(message.group).select('members');
          group?.members.forEach((m) => emitToUser(io, m.user, 'message_edited', payload));
        } else {
          emitToUser(io, userId, 'message_edited', payload);
          emitToUser(io, message.receiver, 'message_edited', payload);
        }
      } catch (err) {
        console.error('edit_message error:', err.message);
      }
    });

    // ---- Unsend / "delete for everyone" (sender only) ----
    socket.on('unsend_message', async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || String(message.sender) !== userId) return;
        if (message.deletedForEveryone) return;

        message.deletedForEveryone = true;
        message.content = '';
        message.mediaUrl = '';
        message.reactions = [];
        await message.save();

        const payload = { messageId };
        if (message.group) {
          const group = await Group.findById(message.group).select('members');
          group?.members.forEach((m) => emitToUser(io, m.user, 'message_unsent', payload));
        } else {
          emitToUser(io, userId, 'message_unsent', payload);
          emitToUser(io, message.receiver, 'message_unsent', payload);
        }
      } catch (err) {
        console.error('unsend_message error:', err.message);
      }
    });

    // ---- Read receipts (DM) ----
    socket.on('open_conversation', ({ withUser }) => {
      openConversations.set(userId, withUser || null);
      if (!withUser) return;
      markSeen(io, userId, withUser);
    });

    socket.on('close_conversation', () => {
      if (openConversations.get(userId)) openConversations.delete(userId);
    });

    socket.on('mark_seen', ({ sender }) => {
      if (!sender) return;
      markSeen(io, userId, sender);
    });

    // ---- Read receipts (group) ----
    socket.on('open_group_conversation', async ({ groupId }) => {
      openGroupConversations.set(userId, groupId || null);
      if (!groupId) return;
      markGroupSeen(io, userId, groupId);
    });

    socket.on('close_group_conversation', () => {
      if (openGroupConversations.get(userId)) openGroupConversations.delete(userId);
    });

    // Typing indicator: relayed only, never persisted
    socket.on('typing', ({ receiver, groupId, isTyping }) => {
      if (groupId) {
        Group.findById(groupId)
          .select('members')
          .then((group) => {
            group?.members
              .filter((m) => String(m.user) !== userId)
              .forEach((m) => emitToUser(io, m.user, 'typing', { from: userId, groupId, isTyping: !!isTyping }));
          })
          .catch(() => {});
        return;
      }
      if (!receiver) return;
      emitToUser(io, receiver, 'typing', { from: userId, isTyping: !!isTyping });
    });

    // ---- Emoji reactions (WhatsApp-style, one reaction per user per message) ----
    socket.on('react_message', async ({ messageId, emoji }) => {
      try {
        if (!ALLOWED_REACTIONS.includes(emoji)) return;
        const message = await Message.findById(messageId);
        if (!message) return;

        let isParticipant = String(message.sender) === userId || String(message.receiver) === userId;
        let group = null;
        if (message.group) {
          group = await Group.findById(message.group).select('members');
          isParticipant = group?.isMember(userId);
        }
        if (!isParticipant) return;

        const existingIndex = message.reactions.findIndex((r) => String(r.user) === userId);
        if (existingIndex >= 0 && message.reactions[existingIndex].emoji === emoji) {
          message.reactions.splice(existingIndex, 1);
        } else if (existingIndex >= 0) {
          message.reactions[existingIndex].emoji = emoji;
        } else {
          message.reactions.push({ user: userId, emoji });
        }
        await message.save();

        const payload = { messageId, reactions: message.reactions };
        if (group) {
          group.members.forEach((m) => emitToUser(io, m.user, 'message_reacted', payload));
        } else {
          const otherId = String(message.sender) === userId ? message.receiver : message.sender;
          emitToUser(io, userId, 'message_reacted', payload);
          emitToUser(io, otherId, 'message_reacted', payload);
        }
      } catch (err) {
        console.error('react_message error:', err.message);
      }
    });

    // ---- WebRTC signaling for audio/video calls (1:1 only - blocked users can't call) ----
    socket.on('call_user', async ({ to, offer, callType }) => {
      if (!to || !offer) return;

      if (await Block.existsBetween(userId, to)) {
        return socket.emit('call_failed', { to, reason: 'blocked' });
      }

      if (!isUserOnline(to)) {
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
      openGroupConversations.delete(userId);

      if (onlineUsers.has(userId)) return;
      scheduleOfflineStamp(io, userId);
    });
  });
}
