import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import { emitToUser } from '../socket/index.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/users/me -> the logged-in user's own profile (safe fields only)
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user.toSafeObject());
});

// PATCH /api/users/username { newUsername, password } -> renames the user's
// account. The old username is freed up immediately for anyone else to take
// (usernames aren't reserved after a rename), and the new one is locked in
// as soon as this succeeds since it goes through the same unique index as
// registration.
router.patch('/username', requireAuth, async (req, res) => {
  try {
    const { newUsername, password } = req.body;
    if (!newUsername || !password) {
      return res.status(400).json({ message: 'New username and your password are required' });
    }

    const cleaned = newUsername.trim().toLowerCase();
    if (cleaned.length < 3 || cleaned.length > 24) {
      return res.status(400).json({ message: 'Username must be 3-24 characters' });
    }
    if (!/^[a-z0-9._]+$/.test(cleaned)) {
      return res.status(400).json({ message: 'Username can only contain letters, numbers, dots and underscores' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const validPassword = await user.comparePassword(password);
    if (!validPassword) return res.status(401).json({ message: 'Incorrect password' });

    if (cleaned === user.username) {
      return res.status(400).json({ message: 'That is already your username' });
    }

    const taken = await User.findOne({ username: cleaned });
    if (taken) {
      return res.status(409).json({ message: 'That username is already taken' });
    }

    user.username = cleaned;
    await user.save();

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'That username is already taken' });
    }
    res.status(500).json({ message: 'Could not change username' });
  }
});

// PATCH /api/users/email { email } -> lets existing accounts (created before
// email was required) add or update their recovery email. Setting this also
// silences the periodic "add a recovery email" reminder for this user.
router.patch('/email', requireAuth, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const taken = await User.findOne({ email, _id: { $ne: req.userId } });
    if (taken) {
      return res.status(409).json({ message: 'That email is already linked to another account' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.email = email;
    user.recoveryReminder = { lastSentAt: null }; // stop future nudges
    await user.save();

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'That email is already linked to another account' });
    }
    res.status(500).json({ message: 'Could not save recovery email' });
  }
});

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

// The one account allowed to grant/revoke the verified badge. Kept as a
// single constant rather than a role/permission system since this is a
// one-person power by design, not a general admin role.
const VERIFIER_USERNAME = 'sanju';

async function requireVerifier(req, res, next) {
  const me = await User.findById(req.userId).select('username');
  if (me?.username?.toLowerCase() !== VERIFIER_USERNAME) {
    return res.status(403).json({ message: 'Only @sanju can manage verified badges' });
  }
  next();
}

// GET /api/users/verify/search?q=username -> find anyone (not just friends) to verify
router.get('/verify/search', requireAuth, requireVerifier, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const users = await User.find({ username: { $regex: q, $options: 'i' } })
    .select('username avatar verified')
    .limit(15);
  res.json(users);
});

// POST /api/users/:userId/verify -> grant the orange tick
router.post('/:userId/verify', requireAuth, requireVerifier, async (req, res) => {
  const target = await User.findByIdAndUpdate(req.params.userId, { verified: true }, { new: true }).select(
    'username verified'
  );
  if (!target) return res.status(404).json({ message: 'User not found' });
  emitToUser(req.app.locals.io, target._id, 'verification_changed', { verified: true });
  res.json({ username: target.username, verified: true });
});

// DELETE /api/users/:userId/verify -> revoke it
router.delete('/:userId/verify', requireAuth, requireVerifier, async (req, res) => {
  const target = await User.findByIdAndUpdate(req.params.userId, { verified: false }, { new: true }).select(
    'username verified'
  );
  if (!target) return res.status(404).json({ message: 'User not found' });
  emitToUser(req.app.locals.io, target._id, 'verification_changed', { verified: false });
  res.json({ username: target.username, verified: false });
});

// ---- Online status & last-seen privacy ----

// GET /api/users/privacy/visibility
router.get('/privacy/visibility', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select('privacy');
  res.json({
    hideOnlineStatus: !!user?.privacy?.hideOnlineStatus,
    onlineVisibleTo: user?.privacy?.onlineVisibleTo || [],
    lastSeenVisibility: user?.privacy?.lastSeenVisibility || 'everyone',
    lastSeenVisibleTo: user?.privacy?.lastSeenVisibleTo || [],
  });
});

// PATCH /api/users/privacy/visibility { hideOnlineStatus, onlineVisibleTo, lastSeenVisibility, lastSeenVisibleTo }
router.patch('/privacy/visibility', requireAuth, async (req, res) => {
  const { hideOnlineStatus, onlineVisibleTo, lastSeenVisibility, lastSeenVisibleTo } = req.body;
  const update = {};
  if (typeof hideOnlineStatus === 'boolean') update['privacy.hideOnlineStatus'] = hideOnlineStatus;
  if (Array.isArray(onlineVisibleTo)) update['privacy.onlineVisibleTo'] = onlineVisibleTo;
  if (['everyone', 'nobody', 'selected'].includes(lastSeenVisibility)) {
    update['privacy.lastSeenVisibility'] = lastSeenVisibility;
  }
  if (Array.isArray(lastSeenVisibleTo)) update['privacy.lastSeenVisibleTo'] = lastSeenVisibleTo;

  await User.findByIdAndUpdate(req.userId, update);
  res.json({ ok: true });
});

// ---- Pinned chats ----

// PATCH /api/users/pins { conversationKey } -> toggle pin ("dm-<id>" or "group-<id>")
router.patch('/pins', requireAuth, async (req, res) => {
  const { conversationKey } = req.body;
  if (!conversationKey) return res.status(400).json({ message: 'conversationKey required' });

  const user = await User.findById(req.userId).select('pinnedChats');
  const isPinned = user.pinnedChats.includes(conversationKey);
  if (isPinned) {
    user.pinnedChats = user.pinnedChats.filter((k) => k !== conversationKey);
  } else {
    user.pinnedChats.unshift(conversationKey);
  }
  await user.save();
  res.json({ pinnedChats: user.pinnedChats });
});

// ---- Theme ----

// PATCH /api/users/theme { theme }
router.patch('/theme', requireAuth, async (req, res) => {
  const allowed = ['ember', 'blue', 'green', 'purple', 'amoled'];
  if (!allowed.includes(req.body.theme)) return res.status(400).json({ message: 'Invalid theme' });
  await User.findByIdAndUpdate(req.userId, { theme: req.body.theme });
  res.json({ theme: req.body.theme });
});

// GET /api/users/ai-assistant -> the built-in AI Assistant's public profile
router.get('/ai-assistant', requireAuth, async (req, res) => {
  let bot = await User.findOne({ isBot: true });

  if (!bot) {
    bot = await User.create({
      username: 'AI Assistant',
      password: '123456',
      isBot: true,
      verified: true,
      avatar:'https://res.cloudinary.com/dhcf8e2pq/image/upload/v1783947591/file_000000004ecc7208ac9efd009165f157_bcd6vq.png',
    });
  }

  res.json({
    _id: bot._id,
    username: bot.username,
    avatar: bot.avatar,
    verified: bot.verified,
    isBot: true,
  });
});

export default router;
