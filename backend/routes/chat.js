import { Router } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser } from '../socket/index.js';
import { uploadChatMedia } from '../middleware/upload.js';

const router = Router();

const DEFAULT_PAGE_SIZE = 30;

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
    const query = { conversationId };

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
      .lean();

    page.reverse(); // ...then flip to oldest-first for the UI

    res.json({
      messages: page,
      hasMore: page.length === limit,
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load messages' });
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
      url: `/uploads/media/${req.file.filename}`,
      type,
    });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
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
    await Message.deleteMany({ conversationId });

    emitToUser(req.app.locals.io, otherUserId, 'chat_deleted', { by: req.userId });

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete conversation' });
  }
});

export default router;
