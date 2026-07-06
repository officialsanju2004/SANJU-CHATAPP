import { Router } from 'express';
import PushSubscription from '../models/PushSubscription.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/push/vapid-public-key -> the browser needs this to create a subscription
router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/push/subscribe -> save (or refresh) this browser's push subscription
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body?.subscription || req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription payload' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.userId, endpoint, keys },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Subscribed' });
  } catch (err) {
    res.status(500).json({ message: 'Could not save subscription' });
  }
});

// POST /api/push/unsubscribe -> stop sending push to this browser (e.g. on logout)
router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: 'endpoint is required' });
    await PushSubscription.deleteOne({ endpoint, user: req.userId });
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ message: 'Could not remove subscription' });
  }
});

export default router;
