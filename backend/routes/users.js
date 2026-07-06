import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = Router();

// POST /api/users/avatar (multipart field name: "avatar")
router.post('/avatar', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Clean up the old avatar file so uploads/ doesn't grow forever
    if (user.avatar) {
      const oldPath = path.join(process.cwd(), user.avatar.replace(/^\//, ''));
      fs.unlink(oldPath, () => {});
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: 'Could not upload avatar' });
  }
});

export default router;
