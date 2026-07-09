import { Router } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadChatMedia } from '../middleware/upload.js';
import { emitToUser } from '../socket/index.js';

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

    const relation = await Friendship.findBetween(req.userId, otherUserId);
    if (!relation || relation.status !== 'accepted') {
      return res.status(403).json({ message: 'You must be friends to view this conversation' });
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
      messages: maskViewOnce(page, req.userId),
      hasMore: page.length === limit,
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load messages' });
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
          lastMessage: lastMessage ? maskViewOnce([lastMessage], req.userId)[0] : null,
          unreadCount,
        };
      })
    );

    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: 'Could not load conversation summaries' });
  }
});

// POST /api/chat/upload (multipart field name: "media") -> image or voice note
router.post('/upload', requireAuth, uploadChatMedia.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const type = req.file.mimetype.startsWith('audio/') ? 'voice' : 'image';
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

    const relation = await Friendship.findBetween(req.userId, otherUserId);
    if (!relation) {
      return res.status(403).json({ message: 'You can only delete a conversation with a friend' });
    }

    const conversationId = Message.conversationIdFor(req.userId, otherUserId);
    await Message.updateMany({ conversationId }, { $addToSet: { deletedFor: req.userId } });

    res.json({ message: 'Conversation deleted for you' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete conversation' });
  }
});

export default router;
