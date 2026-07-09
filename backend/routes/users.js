import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
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

    // Clean up the old avatar on Cloudinary so storage doesn't grow forever
    if (user.avatarPublicId) {
      cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
    }

    // multer-storage-cloudinary gives us the hosted URL in `path` and the
    // Cloudinary asset id (needed to delete it later) in `filename`.
    user.avatar = req.file.path;
    user.avatarPublicId = req.file.filename;
    await user.save();

    res.json({ avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: 'Could not upload avatar' });
  }
});

// GET /api/users/privacy
router.get('/privacy', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select('privacy');
  res.json({ blockGroupAdd: !!user?.privacy?.blockGroupAdd });
});

// PATCH /api/users/privacy { blockGroupAdd }
router.patch('/privacy', requireAuth, async (req, res) => {
  const { blockGroupAdd } = req.body;
  await User.findByIdAndUpdate(req.userId, { 'privacy.blockGroupAdd': !!blockGroupAdd });
  res.json({ blockGroupAdd: !!blockGroupAdd });
});

export default router;
