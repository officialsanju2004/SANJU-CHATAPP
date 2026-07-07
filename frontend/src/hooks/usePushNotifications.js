import { useCallback, useEffect, useState } from 'react';
import { pushApi } from '../api/axios.js';

const SUPPORTED =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

// Converts the base64url VAPID public key into the Uint8Array format
// PushManager.subscribe() expects.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Registers the service worker once, and (given permission) subscribes this
// browser to Web Push so the backend can wake it up with a notification even
// when every Sanju Chat tab - or the whole browser - is closed.
export function usePushNotifications(enabled) {
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = useCallback(async () => {
    if (!SUPPORTED) return false;
    try {
      // Kick off registration if it hasn't happened yet (main.jsx usually
      // already does this, so most of the time this just returns the
      // existing registration).
      await navigator.serviceWorker.register('/sw.js');

      // ⚠️ FIX: register() resolves as soon as the registration exists -
      // NOT once the service worker is actually active. Calling
      // pushManager.subscribe() right after register() can race the SW's
      // install/activate lifecycle and fail with
      // "Subscription failed - no active Service Worker".
      // navigator.serviceWorker.ready only resolves once there IS an
      // active worker controlling the page, so wait on that instead.
      const registration = await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setSubscribed(true);
        return true;
      }

      const { data } = await pushApi.getPublicKey();
      if (!data.key) {
        console.warn('Push not configured on the server (missing VAPID keys).');
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      });

      await pushApi.subscribe(subscription.toJSON());
      setSubscribed(true);
      return true;
    } catch (err) {
      console.warn('Push subscription failed:', err.message);
      return false;
    }
  }, []);

  // Once notification permission is granted elsewhere (useNotifications),
  // quietly (re)establish the push subscription for this browser.
  useEffect(() => {
    if (!enabled || !SUPPORTED) return;
    if (Notification.permission !== 'granted') return;
    subscribe();
  }, [enabled, subscribe]);

  return { supported: SUPPORTED, subscribed, subscribe };
}