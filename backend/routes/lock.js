import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const PIN_REGEX = /^\d{4,6}$/; // 4-6 digit PIN, like a phone lock screen

// GET /api/lock/status
router.get('/status', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select('chatLock.enabled chatLock.pinLength');
  res.json({ enabled: !!user?.chatLock?.enabled, pinLength: user?.chatLock?.pinLength || 0 });
});

// POST /api/lock/set { pin }  -> turns the lock ON for the first time (or resets it)
router.post('/set', requireAuth, async (req, res) => {
  const { pin } = req.body;
  if (!PIN_REGEX.test(pin || '')) {
    return res.status(400).json({ message: 'PIN must be 4-6 digits' });
  }
  const pinHash = await bcrypt.hash(pin, 10);
  await User.findByIdAndUpdate(req.userId, {
    chatLock: { enabled: true, pinHash, pinLength: pin.length },
  });
  res.json({ enabled: true });
});

// POST /api/lock/verify { pin } -> used every time the app is opened/unlocked
router.post('/verify', requireAuth, async (req, res) => {
  const { pin } = req.body;
  const user = await User.findById(req.userId).select('chatLock.pinHash chatLock.enabled');
  if (!user?.chatLock?.enabled) {
    return res.json({ valid: true }); // lock isn't even on - nothing to check
  }
  const valid = await user.comparePin(pin || '');
  if (!valid) return res.status(401).json({ valid: false, message: 'Incorrect PIN' });
  res.json({ valid: true });
});

// POST /api/lock/disable { pin } -> must know the current PIN to turn it off
router.post('/disable', requireAuth, async (req, res) => {
  const { pin } = req.body;
  const user = await User.findById(req.userId).select('chatLock.pinHash chatLock.enabled');
  if (!user?.chatLock?.enabled) return res.json({ enabled: false });

  const valid = await user.comparePin(pin || '');
  if (!valid) return res.status(401).json({ message: 'Incorrect PIN' });

  await User.findByIdAndUpdate(req.userId, { chatLock: { enabled: false, pinHash: '', pinLength: 0 } });
  res.json({ enabled: false });
});

// POST /api/lock/change { currentPin, newPin }
router.post('/change', requireAuth, async (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!PIN_REGEX.test(newPin || '')) {
    return res.status(400).json({ message: 'New PIN must be 4-6 digits' });
  }
  const user = await User.findById(req.userId).select('chatLock.pinHash chatLock.enabled');
  if (user?.chatLock?.enabled) {
    const valid = await user.comparePin(currentPin || '');
    if (!valid) return res.status(401).json({ message: 'Current PIN is incorrect' });
  }
  const pinHash = await bcrypt.hash(newPin, 10);
  await User.findByIdAndUpdate(req.userId, {
    chatLock: { enabled: true, pinHash, pinLength: newPin.length },
  });
  res.json({ enabled: true });
});

export default router;
