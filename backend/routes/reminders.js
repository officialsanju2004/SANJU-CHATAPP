import { Router } from 'express';
import mongoose from 'mongoose';
import Reminder from '../models/Reminder.js';
import Message from '../models/Message.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/reminders { messageId, remindAt, note }
router.post('/', requireAuth, async (req, res) => {
  try {
    const { messageId, remindAt, note } = req.body;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message id' });
    }
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const isParticipant =
      String(message.sender) === req.userId || String(message.receiver) === req.userId || message.group;
    if (!isParticipant) return res.status(403).json({ message: 'Not your conversation' });

    const when = new Date(remindAt);
    if (isNaN(when.getTime()) || when <= new Date()) {
      return res.status(400).json({ message: 'Reminder time must be in the future' });
    }

    const reminder = await Reminder.create({
      user: req.userId,
      message: messageId,
      note: (note || '').trim(),
      remindAt: when,
    });

    res.status(201).json(reminder);
  } catch (err) {
    res.status(500).json({ message: 'Could not set reminder' });
  }
});

// GET /api/reminders -> my upcoming reminders
router.get('/', requireAuth, async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.userId, sent: false })
      .sort({ remindAt: 1 })
      .populate('message');
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: 'Could not load reminders' });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await Reminder.deleteOne({ _id: req.params.id, user: req.userId });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete reminder' });
  }
});

export default router;
