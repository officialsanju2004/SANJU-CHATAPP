import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';
import Status from '../models/Status.js';
import PushSubscription from '../models/PushSubscription.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// DELETE /api/account/me { password } -> permanently deletes the account
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await user.comparePassword(password || '');
    if (!valid) return res.status(401).json({ message: 'Incorrect password' });

    if (user.avatarPublicId) {
      cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
    }

    await Promise.all([
      Message.deleteMany({ $or: [{ sender: user._id }, { receiver: user._id }] }),
      Friendship.deleteMany({ $or: [{ requester: user._id }, { recipient: user._id }] }),
      Status.deleteMany({ user: user._id }),
      PushSubscription.deleteMany({ user: user._id }).catch(() => {}),
      user.deleteOne(),
    ]);

    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete account' });
  }
});

export default router;
