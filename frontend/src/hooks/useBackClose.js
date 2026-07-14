import { useEffect, useRef } from 'react';

// One shared stack + one shared `popstate` listener for the whole app,
// instead of every screen/modal attaching its own listener. Each open
// screen pushes exactly one browser-history entry and one { id, onClose }
// record here. Back button -> popstate -> we pop only the TOP of the
// stack and close only that screen - so if a modal is open on top of an
// open chat, one back-press closes just the modal, a second closes the
// chat, and only then does a third exit the app. Without a single shared
// listener, every open screen's own listener would fire on every
// back-press and they'd all close at once.
const stack = [];
let listenerAttached = false;
let nextId = 1;

function handlePopState() {
  const top = stack.pop();
  if (top) top.onClose();
}

function ensureListener() {
  if (listenerAttached) return;
  window.addEventListener('popstate', handlePopState);
  listenerAttached = true;
}

/**
 * Makes the device/browser back button (and swipe-back gesture) close
 * whichever "screen" is currently open - an active chat, a modal, an
 * expanded viewer, a sidebar panel, etc. - instead of exiting the whole
 * installed app or (worse) falling back to a stale login/register screen.
 *
 * @param {boolean} isOpen - whether this screen/modal is currently open
 * @param {() => void} onClose - called to close it when back is pressed
 */
export function useBackClose(isOpen, onClose) {
  const idRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen && idRef.current === null) {
      ensureListener();
      const id = nextId++;
      idRef.current = id;
      window.history.pushState({ appScreen: id }, '');
      stack.push({ id, onClose: () => onCloseRef.current() });
    } else if (!isOpen && idRef.current !== null) {
      // Closed some other way (an in-app button that didn't go through
      // closeViaBack, or the screen closed itself e.g. after an action
      // completed). Drop our entry from the stack so a future back-press
      // doesn't land on a phantom record for a screen that's already gone.
      const idx = stack.findIndex((e) => e.id === idRef.current);
      if (idx !== -1) stack.splice(idx, 1);
      idRef.current = null;
    }
  }, [isOpen]);
}

/**
 * Closes whichever screen is currently on top of the back-stack, the same
 * way a real back-press would. In-app "back"/"close" buttons should call
 * this instead of the raw state setter, so the history entry that was
 * pushed for that screen gets cleaned up the same way - otherwise the next
 * real back-press would land on a leftover entry and silently do nothing.
 */
export function closeViaBack() {
  if (stack.length > 0) {
    window.history.back();
  }
}

