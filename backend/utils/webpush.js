import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT_EMAIL } = process.env;

export const pushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushConfigured) {
  webpush.setVapidDetails(
    `mailto:${VAPID_CONTACT_EMAIL || 'admin@example.com'}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn(
    'Web Push is not configured (missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). ' +
      'Background push notifications will be skipped. Run "npx web-push generate-vapid-keys" and add them to backend/.env'
  );
}

// Sends a push to every device a user has registered. Silently prunes
// subscriptions the push service reports as gone (unsubscribed / uninstalled).
export async function sendPushToUser(userId, payload) {
  if (!pushConfigured) return;

  const subs = await PushSubscription.find({ user: userId });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error('web-push send error:', err.message);
        }
      }
    })
  );
}
