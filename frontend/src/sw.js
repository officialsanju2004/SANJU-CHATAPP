// Service worker for background Web Push notifications.
// This keeps running (the browser wakes it up) even when every Sanju Chat
// tab - or the browser window itself - is closed, which is what lets a
// notification arrive the way it does in WhatsApp.
//
// NOTE: this file now lives in src/sw.js (not public/sw.js) because
// vite-plugin-pwa's "injectManifest" strategy needs to bundle it and inject
// the precache manifest below. Don't move it back to public/ - vite-plugin-pwa
// would then have nothing to inject into, and a second, auto-generated
// sw.js could overwrite this one at build time (the original bug).

import { precacheAndRoute } from 'workbox-precaching';

// Required by injectManifest: this is where vite-plugin-pwa injects the
// list of build assets to precache. Leaving this out is what breaks the
// build - injectManifest fails if self.__WB_MANIFEST is never referenced.
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  console.log('✅ SW installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ SW activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('📩 1. Push event received!');

  if (!event.data) {
    console.log('❌ No data in push event');
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
    console.log('✅ 2. Payload parsed:', payload);
    console.log('✅ 3. Title:', payload.title);
    console.log('✅ 4. Body:', payload.body);
  } catch (err) {
    console.log('❌ Failed to parse JSON:', err);
    payload = { title: 'New message', body: event.data.text() };
  }

  // ✅ CHANGE 1: Default body set karo
  const { title = 'Ember Chat', body = '📩 New message', icon, tag, url = '/', senderId } = payload;

  console.log('📢 5. Showing notification with:', { title, body });

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body || '📩 New message', // ✅ CHANGE 2: Fallback body
      icon: icon || '/icons/icon2.jpeg',
      badge: '/icons/icon2.jpeg',
      tag,
      renotify: true,
      data: { url, senderId },
    })
  );
});

// Clicking the notification focuses an already-open tab if there is one,
// otherwise opens a new one.
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event.notification);
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ✅ MANUAL TRIGGER - Console se push test karne ke liye
self.addEventListener('message', (event) => {
  console.log('📩 Message received in SW:', event.data);

  if (event.data?.type === 'TRIGGER_PUSH') {
    const { title = '🔔 Test', body = 'Yeh manually triggered hai!', icon = '/icons/icon2.jpeg' } = event.data;

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: icon,
        badge: '/icons/icon2.jpeg',
        data: { url: '/' },
      })
    );
  }
});
