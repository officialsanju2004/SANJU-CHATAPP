import { useCallback, useEffect, useRef } from 'react';

export function useNotifications() {
  const permissionRef = useRef(typeof Notification !== 'undefined' ? Notification.permission : 'denied');

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
      });
    }
  }, []);

  const notify = useCallback((title, options) => {
    if (typeof Notification === 'undefined') return;
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
      // Some browsers (e.g. iOS Safari PWA-less) don't support the constructor
      console.warn('Notification failed:', err.message);
    }
  }, []);

  return { notify };
}
