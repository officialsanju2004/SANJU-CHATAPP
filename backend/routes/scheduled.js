import { Router } from 'express';
import mongoose from 'mongoose';
import ScheduledMessage from '../models/ScheduledMessage.js';
import Friendship from '../models/Friendship.js';
import Group from '../models/Group.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/scheduled { receiver | groupId, type, content, mediaUrl, scheduledFor }
router.post('/', requireAuth, async (req, res) => {
  try {
    const { receiver, groupId, type, content, mediaUrl, scheduledFor } = req.body;
    if (!receiver && !groupId) return res.status(400).json({ message: 'No recipient specified' });

    const when = new Date(scheduledFor);
    if (isNaN(when.getTime()) || when <= new Date()) {
      return res.status(400).json({ message: 'Scheduled time must be in the future' });
    }

    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group || !group.isMember(req.userId)) {
        return res.status(403).json({ message: 'You are not a member of this group' });
      }
    } else {
      const relation = await Friendship.findBetween(req.userId, receiver);
      if (!relation || relation.status !== 'accepted') {
        return res.status(403).json({ message: 'You must be friends to message this user' });
      }
    }

    const scheduled = await ScheduledMessage.create({
      sender: req.userId,
      receiver: groupId ? null : receiver,
      group: groupId || null,
      type: type || 'text',
      content: content || '',
      mediaUrl: mediaUrl || '',
      scheduledFor: when,
    });

    res.status(201).json(scheduled);
  } catch (err) {
    res.status(500).json({ message: 'Could not schedule message' });
  }
});

// GET /api/scheduled -> my own pending scheduled messages
router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await ScheduledMessage.find({ sender: req.userId, sent: false, cancelled: false })
      .sort({ scheduledFor: 1 })
      .populate('receiver', 'username avatar')
      .populate('group', 'name avatar');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Could not load scheduled messages' });
  }
});

// DELETE /api/scheduled/:id -> cancel before it sends
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const item = await ScheduledMessage.findOne({ _id: req.params.id, sender: req.userId });
    if (!item) return res.status(404).json({ message: 'Not found' });
    if (item.sent) return res.status(400).json({ message: 'Already sent' });

    item.cancelled = true;
    await item.save();
    res.json({ cancelled: true });
  } catch (err) {
    res.status(500).json({ message: 'Could not cancel scheduled message' });
  }
});

export default router;
