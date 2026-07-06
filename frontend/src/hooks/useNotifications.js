import { useCallback, useEffect, useState } from 'react';

const SUPPORTED = typeof Notification !== 'undefined';

export function useNotifications() {
  const [permission, setPermission] = useState(SUPPORTED ? Notification.permission : 'unsupported');

  // Keep local state in sync if the user changes the permission from the
  // browser's own site-settings UI while the app is open
  useEffect(() => {
    if (!SUPPORTED) return;
    const id = setInterval(() => setPermission(Notification.permission), 2000);
    return () => clearInterval(id);
  }, []);

  // Must be called from a real user gesture (button click) - browsers like
  // Safari and recent Chrome/Firefox silently ignore permission requests
  // that aren't triggered by direct user interaction.
  const requestPermission = useCallback(async () => {
    if (!SUPPORTED) return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notify = useCallback((title, options) => {
    if (!SUPPORTED) return;
    if (Notification.permission !== 'granted') return;
    // Don't spam a notification if the tab is already focused and visible
    if (document.visibilityState === 'visible' && document.hasFocus()) return;

    try {
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (err) {
      console.warn('Notification failed:', err.message);
    }
  }, []);

  return { permission, requestPermission, notify };
}
