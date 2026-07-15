import User from '../models/User.js';
import { emitToUser } from '../socket/index.js';
import { sendPushToUser } from './webpush.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Checking every 30 min is enough to keep everyone's reminder within an hour
// or so of the 24h mark, without hammering the DB like a per-minute job would.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function startRecoveryEmailReminder(io) {
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - DAY_MS);

      // Only users with no email at all, and either never nudged before or
      // not nudged in the last 24h.
      const users = await User.find({
        $or: [{ email: { $exists: false } }, { email: '' }],
        $and: [
          {
            $or: [
              { 'recoveryReminder.lastSentAt': null },
              { 'recoveryReminder.lastSentAt': { $lte: cutoff } },
            ],
          },
        ],
      }).select('_id recoveryReminder');

      for (const user of users) {
        const payload = {
          title: 'Add a recovery email 🔒',
          body: 'Set a recovery email so you can reset your password with an OTP if you ever forget it.',
        };

        // In-app toast/banner trigger for anyone currently connected
        emitToUser(io, user._id, 'recovery_email_reminder', payload);

        // Browser push for anyone offline / tab not focused
        sendPushToUser(user._id, {
          title: payload.title,
          body: payload.body,
          tag: 'recovery-email-reminder',
          url: '/',
        }).catch(() => {});

        user.recoveryReminder = { lastSentAt: new Date() };
        await user.save();
      }
    } catch (err) {
      console.error('Recovery email reminder scheduler error:', err.message);
    }
  }, CHECK_INTERVAL_MS);
}
