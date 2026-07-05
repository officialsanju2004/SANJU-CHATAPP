import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/chat/users -> everyone except the logged-in user
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('username createdAt')
      .sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Could not load users' });
  }
});

// GET /api/chat/messages/:otherUserId -> conversation history between two users
router.get('/messages/:otherUserId', requireAuth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user id' });
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

export default router;
