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
      const registration = await navigator.serviceWorker.register('/sw.js');

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
