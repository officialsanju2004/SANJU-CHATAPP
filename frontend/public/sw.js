// Service worker for background Web Push notifications.
// This keeps running (the browser wakes it up) even when every Ember Chat
// tab - or the browser window itself - is closed, which is what lets a
// notification arrive the way it does in WhatsApp.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: 'New message', body: event.data.text() };
  }

  const { title = 'Ember Chat', body = '', icon, tag, url = '/', senderId } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: true,
      data: { url, senderId },
    })
  );
});

// Clicking the notification focuses an already-open tab if there is one,
// otherwise opens a new one.
self.addEventListener('notificationclick', (event) => {
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
