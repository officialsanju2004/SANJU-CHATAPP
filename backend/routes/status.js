import { Router } from 'express';
import mongoose from 'mongoose';
import Status from '../models/Status.js';
import Friendship from '../models/Friendship.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadStatus } from '../middleware/upload.js';
import { emitToUser } from '../socket/index.js';

const router = Router();

async function friendIds(userId) {
  const relations = await Friendship.find({
    status: 'accepted',
    $or: [{ requester: userId }, { recipient: userId }],
  });
  return relations.map((r) => (String(r.requester) === String(userId) ? r.recipient : r.requester));
}

// POST /api/status/image (multipart field: "status") -> photo status with optional caption
router.post('/image', requireAuth, uploadStatus.single('status'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const status = await Status.create({
      user: req.userId,
      type: 'image',
      mediaUrl: req.file.path,
      caption: (req.body.caption || '').trim(),
    });

    const friends = await friendIds(req.userId);
    friends.forEach((id) => emitToUser(req.app.locals.io, id, 'new_status', { from: req.userId }));

    res.status(201).json(status);
  } catch (err) {
    res.status(500).json({ message: 'Could not post status' });
  }
});

// POST /api/status/text { caption, bgColor } -> WhatsApp-style plain colour status
router.post('/text', requireAuth, async (req, res) => {
  try {
    const { caption, bgColor } = req.body;
    if (!caption?.trim()) return res.status(400).json({ message: 'Status text cannot be empty' });

    const status = await Status.create({
      user: req.userId,
      type: 'text',
      caption: caption.trim().slice(0, 300),
      bgColor: bgColor || '#f97316',
    });

    const friends = await friendIds(req.userId);
    friends.forEach((id) => emitToUser(req.app.locals.io, id, 'new_status', { from: req.userId }));

    res.status(201).json(status);
  } catch (err) {
    res.status(500).json({ message: 'Could not post status' });
  }
});

// GET /api/status/feed -> every friend who currently has an active (un-expired)
// status, grouped by user, with a hasUnseen flag for the ring colour
router.get('/feed', requireAuth, async (req, res) => {
  try {
    const friends = await friendIds(req.userId);
    const statuses = await Status.find({
      user: { $in: [...friends, req.userId] },
    })
      .sort({ createdAt: 1 })
      .lean();

    const grouped = new Map();
    for (const s of statuses) {
      const key = String(s.user);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(s);
    }

    const feed = await Promise.all(
      [...grouped.entries()].map(async ([userId, items]) => {
        const user = await User.findById(userId).select('username avatar');
        const hasUnseen = items.some((s) => !s.views.some((v) => String(v.user) === String(req.userId)));
        return {
          user: { id: userId, username: user?.username, avatar: user?.avatar },
          statuses: items,
          hasUnseen,
          isMine: String(userId) === String(req.userId),
        };
      })
    );

    // My own status first (if any), then friends with unseen ones, then seen
    feed.sort((a, b) => {
      if (a.isMine) return -1;
      if (b.isMine) return 1;
      return Number(b.hasUnseen) - Number(a.hasUnseen);
    });

    res.json(feed);
  } catch (err) {
    res.status(500).json({ message: 'Could not load status feed' });
  }
});

// POST /api/status/:id/view -> mark as seen by me (no-op if it's my own or already seen)
router.post('/:id/view', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: 'Status not found' });

    if (String(status.user) !== String(req.userId) && !status.hasViewed(req.userId)) {
      status.views.push({ user: req.userId, viewedAt: new Date() });
      await status.save();
      emitToUser(req.app.locals.io, status.user, 'status_viewed', {
        statusId: id,
        by: req.userId,
        viewedAt: new Date(),
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Could not mark status as viewed' });
  }
});

// GET /api/status/:id/viewers -> only the status owner can see who viewed it, and when
router.get('/:id/viewers', requireAuth, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id).populate('views.user', 'username avatar');
    if (!status) return res.status(404).json({ message: 'Status not found' });
    if (String(status.user) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only the owner can see viewers' });
    }
    res.json(
      status.views
        .slice()
        .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt))
        .map((v) => ({ user: v.user, viewedAt: v.viewedAt }))
    );
  } catch (err) {
    res.status(500).json({ message: 'Could not load viewers' });
  }
});

// DELETE /api/status/:id -> remove my own status early
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: 'Status not found' });
    if (String(status.user) !== String(req.userId)) {
      return res.status(403).json({ message: 'You can only delete your own status' });
    }
    await status.deleteOne();
    res.json({ message: 'Status deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete status' });
  }
});

export default router;
