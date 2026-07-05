import { Router } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser } from '../socket/index.js';

const router = Router();

// GET /api/chat/messages/:otherUserId -> conversation history, only if you're friends
router.get('/messages/:otherUserId', requireAuth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const relation = await Friendship.findBetween(req.userId, otherUserId);
    if (!relation || relation.status !== 'accepted') {
      return res.status(403).json({ message: 'You must be friends to view this conversation' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: otherUserId },
        { sender: otherUserId, receiver: req.userId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Could not load messages' });
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

    await Message.deleteMany({
      $or: [
        { sender: req.userId, receiver: otherUserId },
        { sender: otherUserId, receiver: req.userId },
      ],
    });

    // Let the other person's open tab know the chat was cleared too
    emitToUser(req.app.locals.io, otherUserId, 'chat_deleted', { by: req.userId });

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete conversation' });
  }
});

export default router;
