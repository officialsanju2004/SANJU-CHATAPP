import { Router } from 'express';
import mongoose from 'mongoose';
import Block from '../models/Block.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/block/:userId -> block someone (messages/calls stop working both ways)
router.post('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    if (userId === req.userId) return res.status(400).json({ message: "You can't block yourself" });

    await Block.updateOne(
      { blocker: req.userId, blocked: userId },
      { blocker: req.userId, blocked: userId },
      { upsert: true }
    );
    res.json({ blocked: true });
  } catch (err) {
    res.status(500).json({ message: 'Could not block user' });
  }
});

// DELETE /api/block/:userId -> unblock
router.delete('/:userId', requireAuth, async (req, res) => {
  try {
    await Block.deleteOne({ blocker: req.userId, blocked: req.params.userId });
    res.json({ blocked: false });
  } catch (err) {
    res.status(500).json({ message: 'Could not unblock user' });
  }
});

// GET /api/block -> list of people I've blocked
router.get('/', requireAuth, async (req, res) => {
  try {
    const blocks = await Block.find({ blocker: req.userId }).populate('blocked', 'username avatar');
    res.json(blocks.map((b) => b.blocked));
  } catch (err) {
    res.status(500).json({ message: 'Could not load blocked users' });
  }
});

// GET /api/block/status/:userId -> { blockedByMe, blockedByThem }
router.get('/status/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const [byMe, byThem] = await Promise.all([
      Block.findOne({ blocker: req.userId, blocked: userId }),
      Block.findOne({ blocker: userId, blocked: req.userId }),
    ]);
    res.json({ blockedByMe: !!byMe, blockedByThem: !!byThem });
  } catch (err) {
    res.status(500).json({ message: 'Could not check block status' });
  }
});

export default router;
