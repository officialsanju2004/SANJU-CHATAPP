import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Status from '../models/Status.js';
import Friendship from '../models/Friendship.js';
import User from '../models/User.js';
import Block from '../models/Block.js';
import Group from '../models/Group.js';
import { sendPushToUser } from '../utils/webpush.js';
import { getAIReply } from '../utils/aiAssistant.js';
import { decryptText } from '../utils/encryption.js';
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

// Sends a PERSONALIZED online-users list to every connected socket, instead
// of one global broadcast - each viewer only sees users who haven't hidden
// their online status from them (privacy.hideOnlineStatus + onlineVisibleTo).
async function broadcastOnlineUsers(io) {
  const ids = Array.from(onlineUsers.keys());
  const users = ids.length ? await User.find({ _id: { $in: ids } }).select('privacy') : [];
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  for (const [viewerId, sockets] of onlineUsers.entries()) {
    const visibleIds = ids.filter((id) => {
      if (id === viewerId) return true;
      const u = userMap.get(id);
      return u ? u.isOnlineVisibleTo(viewerId) : true;
    });
    sockets.forEach((sid) => io.to(sid).emit('online_users', visibleIds));
  }
}

// Same idea for last-seen: only tell currently-connected viewers who are
// actually allowed to see it (privacy.lastSeenVisibility). Offline viewers
// just get the correct (possibly hidden) value next time they fetch /friends.
async function broadcastLastSeen(io, userId, lastSeen) {
  const target = await User.findById(userId).select('privacy');
  if (!target) return;
  for (const [viewerId, sockets] of onlineUsers.entries()) {
    if (viewerId === String(userId) || target.isLastSeenVisibleTo(viewerId)) {
      sockets.forEach((sid) => io.to(sid).emit('user_last_seen', { userId, lastSeen }));
    }
  }
}

function scheduleOfflineStamp(io, userId) {
  clearTimeout(pendingOffline.get(userId));
  const timeoutId = setTimeout(async () => {
    pendingOffline.delete(userId);
    if (onlineUsers.has(userId)) return;

    await broadcastOnlineUsers(io);
    try {
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { lastSeen });
      await broadcastLastSeen(io, userId, lastSeen);
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
  if (message.type === 'video') return '🎥 Video';
  if (message.type === 'voice') return '🎤 Voice message';
  if (message.type === 'poll') return `📊 Poll: ${message.poll?.question || ''}`;
  if (message.type === 'location') return message.location?.live ? '📍 Live location' : '📍 Location';
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

// Fetches the last few messages of a DM with the AI Assistant, asks
// Anthropic for a reply, saves it as a message FROM the bot, and pushes it
// to the human side in real time - same shape as a normal received message.
async function replyAsAssistant(io, conversationId, userId, botId) {
  const recent = await Message.find({ conversationId, type: 'text' })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();
  recent.reverse();

  const history = recent.map((m) => ({
  role: String(m.sender) === String(botId) ? 'assistant' : 'user',
  content: decryptText(m.content),
}));
  if (history.length === 0 || history[history.length - 1].role !== 'user') return;

  const replyText = await getAIReply(history);

  const reply = await Message.create({
    sender: botId,
    receiver: userId,
    conversationId,
    type: 'text',
    content: replyText,
    seen: false,
  });

  emitToUser(io, userId, 'receive_message', reply);
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
    await broadcastOnlineUsers(io);

    socket.on(
      'send_message',
      async (
        { receiver, groupId, content, type, mediaUrl, duration, replyTo, viewOnce, statusReplyTo, poll, location },
        callback
      ) => {
        try {
          const messageType = type || 'text';
          if (!receiver && !groupId) return callback?.({ error: 'No recipient specified' });
          if (messageType === 'text' && !content?.trim()) return callback?.(null);
          if (['image', 'video', 'voice'].includes(messageType) && !mediaUrl) {
            return callback?.({ error: 'Missing media' });
          }
          if (messageType === 'poll' && (!poll?.question?.trim() || !poll?.options || poll.options.length < 2)) {
            return callback?.({ error: 'A poll needs a question and at least 2 options' });
          }
          if (messageType === 'location' && (typeof location?.lat !== 'number' || typeof location?.lng !== 'number')) {
            return callback?.({ error: 'Missing location coordinates' });
          }

          let group = null;
          let conversationId;
          let botReceiver = null;

          if (groupId) {
            group = await Group.findById(groupId);
            if (!group || !group.isMember(userId)) {
              return callback?.({ error: 'You are not a member of this group' });
            }
            conversationId = Message.conversationIdForGroup(groupId);
          } else {
            botReceiver = await User.findById(receiver).select('isBot');
            if (botReceiver?.isBot) {
              // The AI Assistant isn't a real friend - messaging it always works
              conversationId = Message.conversationIdFor(userId, receiver);
            } else {
              const relation = await Friendship.findBetween(userId, receiver);
              if (!relation || relation.status !== 'accepted') {
                return callback?.({ error: 'You must be friends to message this user' });
              }
              if (await Block.existsBetween(userId, receiver)) {
                return callback?.({ error: 'You can no longer message this user' });
              }
              conversationId = Message.conversationIdFor(userId, receiver);
            }
          }

          let replyToId = null;
          if (replyTo) {
            const original = await Message.findOne({ _id: replyTo, conversationId }).select('_id');
            if (original) replyToId = original._id;
          }

          let statusReplySnapshot = null;
          if (statusReplyTo && !group) {
            const status = await Status.findById(statusReplyTo);
            if (status) {
              statusReplySnapshot = {
                statusId: status._id,
                type: status.type,
                mediaUrl: status.mediaUrl,
                caption: status.caption,
                bgColor: status.bgColor,
              };
            }
          }

          let pollData = null;
          if (messageType === 'poll') {
            pollData = {
              question: poll.question.trim(),
              options: poll.options.slice(0, 10).map((o) => ({ text: String(o).trim().slice(0, 100), votes: [] })),
              allowMultiple: !!poll.allowMultiple,
            };
          }

          let locationData = null;
          if (messageType === 'location') {
            locationData = {
              lat: location.lat,
              lng: location.lng,
              live: !!location.live,
              expiresAt: location.live ? new Date(Date.now() + (location.liveMinutes || 60) * 60000) : null,
            };
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
            statusReplyTo: statusReplySnapshot,
            poll: pollData,
            location: locationData,
            viewOnce: !group && messageType === 'image' ? !!viewOnce : false,
            seenBy: group ? [{ user: userId, seenAt: new Date() }] : [],
          });

          if (replyToId) {
            message = await message.populate('replyTo', 'content type mediaUrl sender');
          }
          if (group) {
            message = await message.populate('sender', 'username avatar verified');
          }

          const sender = await User.findById(userId).select('username avatar');

          if (group) {
            const otherMembers = group.members.filter((m) => String(m.user) !== userId);

            const instantSeenIds = otherMembers
              .filter((m) => openGroupConversations.get(String(m.user)) === String(groupId))
              .map((m) => String(m.user));

            if (instantSeenIds.length > 0) {
              message.seenBy.push(...instantSeenIds.map((uid) => ({ user: uid, seenAt: new Date() })));
              await message.save();
            }

            otherMembers.forEach((m) => emitToUser(io, m.user, 'receive_message', message));
            callback?.(message);

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

           if (botReceiver?.isBot) {

  // Show typing
  emitToUser(io, userId, "typing", {
    from: receiver,
    isTyping: true,
  });

  replyAsAssistant(io, conversationId, userId, receiver)
    .then(() => {
      // Hide typing
      emitToUser(io, userId, "typing", {
        from: receiver,
        isTyping: false,
      });
    })
    .catch((err) => {
      console.error("AI assistant reply error:", err.message);

      emitToUser(io, userId, "typing", {
        from: receiver,
        isTyping: false,
      });
    });

}  else {
              sendPushToUser(receiver, {
                title: sender?.username || 'New message',
                body: previewFor(message),
                icon: sender?.avatar || '/icon-192.png',
                tag: `chat-${userId}`,
                url: '/',
                senderId: userId,
              }).catch((err) => console.error('push send error:', err));
            }
          }
        } catch (err) {
          console.error('send_message error:', err.message);
          callback?.({ error: 'Message could not be sent' });
        }
      }
    );

    // ---- Poll voting ----
    socket.on('vote_poll', async ({ messageId, optionIndexes }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || message.type !== 'poll' || !message.poll) return;

        let group = null;
        if (message.group) {
          group = await Group.findById(message.group).select('members');
          if (!group?.isMember(userId)) return;
        } else if (String(message.sender) !== userId && String(message.receiver) !== userId) {
          return;
        }

        const indexes = message.poll.allowMultiple ? optionIndexes : optionIndexes.slice(0, 1);
        message.poll.options.forEach((opt, i) => {
          opt.votes = opt.votes.filter((v) => String(v) !== userId);
          if (indexes.includes(i)) opt.votes.push(userId);
        });
        await message.save();

        const payload = { messageId, poll: message.poll };
        if (group) {
          group.members.forEach((m) => emitToUser(io, m.user, 'poll_updated', payload));
        } else {
          emitToUser(io, userId, 'poll_updated', payload);
          emitToUser(io, String(message.sender) === userId ? message.receiver : message.sender, 'poll_updated', payload);
        }
      } catch (err) {
        console.error('vote_poll error:', err.message);
      }
    });

    // ---- Live location updates ----
    socket.on('update_live_location', async ({ messageId, lat, lng }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || message.type !== 'location' || !message.location?.live) return;
        if (String(message.sender) !== userId) return;
        if (message.location.expiresAt && message.location.expiresAt < new Date()) return;

        message.location.lat = lat;
        message.location.lng = lng;
        await message.save();

        const payload = { messageId, lat, lng };
        if (message.group) {
          const group = await Group.findById(message.group).select('members');
          group?.members.forEach((m) => emitToUser(io, m.user, 'location_updated', payload));
        } else {
          emitToUser(io, message.receiver, 'location_updated', payload);
        }
      } catch (err) {
        console.error('update_live_location error:', err.message);
      }
    });

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
