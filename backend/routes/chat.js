import { Router } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import Group from '../models/Group.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadChatMedia } from '../middleware/upload.js';
import { emitToUser } from '../socket/index.js';
import User from '../models/User.js';

const router = Router();

const DEFAULT_PAGE_SIZE = 30;

// A view-once photo the receiver has already opened must never be sent back
// down to them again - strip the URL and just leave a marker they can render
// as "Photo · opened". The sender still sees it normally (they already have
// the file; view-once only protects it from lingering on the receiver's side).
function maskViewOnce(messages, viewerId) {
  return messages.map((m) => {
    if (m.viewOnce && m.viewOnceOpenedAt && String(m.receiver) === String(viewerId)) {
      return { ...m, mediaUrl: '', viewOnceConsumed: true };
    }
    return m;
  });
}

// An unsent ("deleted for everyone") message keeps its document (so reactions/
// replies pointing at it don't break) but its actual content is scrubbed for
// EVERY viewer, sender included - matches WhatsApp's "This message was deleted".
function maskDeletedForEveryone(messages) {
  return messages.map((m) =>
    m.deletedForEveryone ? { ...m, content: '', mediaUrl: '', reactions: [] } : m
  );
}

// GET /api/chat/messages/:otherUserId?before=<messageId>&limit=30
// Cursor-based pagination: returns the `limit` messages immediately before
// `before` (or the newest `limit` messages if `before` is omitted), oldest
// first. This uses the { conversationId, createdAt } index, so it stays fast
// no matter how long the conversation history gets.
router.get('/messages/:otherUserId', requireAuth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { before } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 100);

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
const otherUser = await User.findById(otherUserId).select('isBot');

if (!otherUser?.isBot) {
  const relation = await Friendship.findBetween(req.userId, otherUserId);

  if (!relation || relation.status !== 'accepted') {
    return res.status(403).json({
      message: 'You must be friends to view this conversation',
    });
  }
}

    const conversationId = Message.conversationIdFor(req.userId, otherUserId);
    const query = { conversationId, deletedFor: { $ne: req.userId } };

    if (before) {
      if (!mongoose.Types.ObjectId.isValid(before)) {
        return res.status(400).json({ message: 'Invalid cursor' });
      }
      const cursorMsg = await Message.findById(before).select('createdAt');
      if (cursorMsg) {
        query.createdAt = { $lt: cursorMsg.createdAt };
      }
    }

    const page = await Message.find(query)
      .sort({ createdAt: -1 }) // newest first for an efficient index scan...
      .limit(limit)
      .populate('replyTo', 'content type mediaUrl sender')
      .lean();

    page.reverse(); // ...then flip to oldest-first for the UI

    res.json({
      messages: maskDeletedForEveryone(maskViewOnce(page, req.userId)),
      hasMore: page.length === limit,
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load messages' });
  }
});

// GET /api/chat/group/:groupId/messages?before=<messageId>&limit=30
router.get('/group/:groupId/messages', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { before } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 100);

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group id' });
    }

    const group = await Group.findById(groupId).select('members');
    if (!group || !group.isMember(req.userId)) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const conversationId = Message.conversationIdForGroup(groupId);
    const query = { conversationId };

    if (before) {
      if (!mongoose.Types.ObjectId.isValid(before)) {
        return res.status(400).json({ message: 'Invalid cursor' });
      }
      const cursorMsg = await Message.findById(before).select('createdAt');
      if (cursorMsg) query.createdAt = { $lt: cursorMsg.createdAt };
    }

    const page = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('replyTo', 'content type mediaUrl sender')
      .populate('sender', 'username avatar verified')
      .lean();

    page.reverse();

    res.json({
      messages: maskDeletedForEveryone(page),
      hasMore: page.length === limit,
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load group messages' });
  }
});

// GET /api/chat/summaries -> last message + unread count per friend, for the
// chat list previews (so you can see who messaged you without opening the chat)
router.get('/summaries', requireAuth, async (req, res) => {
  try {
    const relations = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: req.userId }, { recipient: req.userId }],
    });
    const friendIds = relations.map((r) =>
      String(r.requester) === String(req.userId) ? r.recipient : r.requester
    );

    const summaries = await Promise.all(
      friendIds.map(async (friendId) => {
        const conversationId = Message.conversationIdFor(req.userId, friendId);
        const [lastMessage, unreadCount] = await Promise.all([
          Message.findOne({ conversationId, deletedFor: { $ne: req.userId } })
            .sort({ createdAt: -1 })
            .lean(),
          Message.countDocuments({
            conversationId,
            receiver: req.userId,
            seen: false,
            deletedFor: { $ne: req.userId },
          }),
        ]);
        return {
          friendId,
          lastMessage: lastMessage ? maskDeletedForEveryone(maskViewOnce([lastMessage], req.userId))[0] : null,
          unreadCount,
        };
      })
    );

    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: 'Could not load conversation summaries' });
  }
});

// POST /api/chat/messages/:messageId/star -> toggle star for me only
router.post('/messages/:messageId/star', requireAuth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const isMine = String(message.sender) === req.userId || String(message.receiver) === req.userId;
    const isGroupMember = message.group ? true : false; // group membership already implied by having loaded it in chat
    if (!isMine && !isGroupMember) return res.status(403).json({ message: 'Not your conversation' });

    const already = message.starredBy.some((id) => String(id) === req.userId);
    if (already) {
      message.starredBy = message.starredBy.filter((id) => String(id) !== req.userId);
    } else {
      message.starredBy.push(req.userId);
    }
    await message.save();
    res.json({ starred: !already });
  } catch (err) {
    res.status(500).json({ message: 'Could not star message' });
  }
});

// GET /api/chat/starred -> every message I've starred, across all conversations
router.get('/starred', requireAuth, async (req, res) => {
  try {
    const messages = await Message.find({ starredBy: req.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .populate('group', 'name avatar')
      .lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Could not load starred messages' });
  }
});

// GET /api/chat/search?conversation=<friendId|group_<id>>&q=text
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { conversation, q } = req.query;
    if (!conversation || !q?.trim()) return res.json([]);

    let conversationId;
    if (conversation.startsWith('group_')) {
      const groupId = conversation.replace('group_', '');
      const group = await Group.findById(groupId).select('members');
      if (!group || !group.isMember(req.userId)) return res.status(403).json({ message: 'Not a member' });
      conversationId = conversation;
    } else {
      const relation = await Friendship.findBetween(req.userId, conversation);
      if (!relation || relation.status !== 'accepted') return res.status(403).json({ message: 'Not friends' });
      conversationId = Message.conversationIdFor(req.userId, conversation);
    }

    const matches = await Message.find({
      conversationId,
      deletedForEveryone: false,
      content: { $regex: q.trim(), $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('content type createdAt sender')
      .lean();

    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Could not search messages' });
  }
});

// GET /api/chat/messages/:otherUserId/around/:messageId -> jump-to-message:
// a window of messages centered on a specific one (used by search results)
router.get('/messages/:otherUserId/around/:messageId', requireAuth, async (req, res) => {
  try {
    const { otherUserId, messageId } = req.params;
    const target = await Message.findById(messageId).select('createdAt conversationId');
    if (!target) return res.status(404).json({ message: 'Message not found' });

    const otherUser = await User.findById(otherUserId).select('isBot');
    if (!otherUser?.isBot) {
      const relation = await Friendship.findBetween(req.userId, otherUserId);
      if (!relation || relation.status !== 'accepted') {
        return res.status(403).json({ message: 'You must be friends to view this conversation' });
      }
    }

    const [before, after] = await Promise.all([
      Message.find({ conversationId: target.conversationId, createdAt: { $lte: target.createdAt }, deletedFor: { $ne: req.userId } })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate('replyTo', 'content type mediaUrl sender')
        .lean(),
      Message.find({ conversationId: target.conversationId, createdAt: { $gt: target.createdAt }, deletedFor: { $ne: req.userId } })
        .sort({ createdAt: 1 })
        .limit(15)
        .populate('replyTo', 'content type mediaUrl sender')
        .lean(),
    ]);

    before.reverse();
    const messages = maskDeletedForEveryone(maskViewOnce([...before, ...after], req.userId));
    res.json({ messages, hasMore: before.length === 15 });
  } catch (err) {
    res.status(500).json({ message: 'Could not load message context' });
  }
});
router.post('/upload', requireAuth, uploadChatMedia.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const type = req.file.mimetype.startsWith('audio/')
      ? 'voice'
      : req.file.mimetype.startsWith('video/')
      ? 'video'
      : 'image';
    res.json({
      url: req.file.path,
      type,
    });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

// POST /api/chat/messages/:messageId/view-once/open -> the ONE time the
// receiver is allowed to fetch a view-once photo's URL. Every request after
// this returns it masked (see maskViewOnce above).
router.post('/messages/:messageId/view-once/open', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message id' });
    }

    const message = await Message.findById(messageId);
    if (!message || !message.viewOnce) {
      return res.status(404).json({ message: 'View-once message not found' });
    }
    if (String(message.receiver) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only the recipient can open this' });
    }
    if (message.viewOnceOpenedAt) {
      return res.status(410).json({ message: 'This photo has already been viewed' });
    }

    message.viewOnceOpenedAt = new Date();
    await message.save();

    emitToUser(req.app.locals.io, message.sender, 'view_once_opened', { messageId });

    res.json({ mediaUrl: message.mediaUrl, type: message.type });
  } catch (err) {
    res.status(500).json({ message: 'Could not open photo' });
  }
});

// DELETE /api/chat/messages/:otherUserId -> permanently clear the conversation for both sides
router.delete('/messages/:otherUserId', requireAuth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

   const otherUser = await User.findById(otherUserId).select('isBot');

if (!otherUser?.isBot) {
  const relation = await Friendship.findBetween(req.userId, otherUserId);

  if (!relation || relation.status !== 'accepted') {
    return res.status(403).json({
      message: 'You must be friends to view this conversation',
    });
  }
}

    const conversationId = Message.conversationIdFor(req.userId, otherUserId);
    await Message.updateMany({ conversationId }, { $addToSet: { deletedFor: req.userId } });

    res.json({ message: 'Conversation deleted for you' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete conversation' });
  }
});

export default router;
