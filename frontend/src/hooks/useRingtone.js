import { useEffect, useRef } from 'react';

// Plays a synthesized ring tone for as long as `active` is true. Two
// slightly different patterns:
//  - 'incoming' -> classic phone ring: two short beeps, then a pause, repeat
//  - 'outgoing' -> ringback tone: one longer steady tone, then a pause, repeat
// Built with the Web Audio API instead of an audio file so there's nothing
// extra to host/bundle and it can't 404.
export function useRingtone(active, kind = 'incoming') {
  const ctxRef = useRef(null);
  const timeoutsRef = useRef([]);
  const stoppedRef = useRef(true);

  useEffect(() => {
    if (!active) return undefined;

    stoppedRef.current = false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const beep = (startAt, duration, freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.15, startAt + 0.02);
      gain.gain.linearRampToValueAtTime(0, startAt + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    };

    const scheduleIncoming = (baseTime) => {
      // Two quick beeps then a pause - repeats roughly every 2s
      beep(baseTime, 0.35, 900);
      beep(baseTime + 0.45, 0.35, 900);
    };

    const scheduleOutgoing = (baseTime) => {
      // One steady ringback tone then a pause - repeats roughly every 3s
      beep(baseTime, 1.2, 480);
      beep(baseTime, 1.2, 620);
    };

    const CYCLE = kind === 'incoming' ? 2 : 3;
    let cycle = 0;

    const tick = () => {
      if (stoppedRef.current) return;
      const now = ctx.currentTime + 0.05;
      if (kind === 'incoming') scheduleIncoming(now);
      else scheduleOutgoing(now);

      const id = setTimeout(tick, CYCLE * 1000);
      timeoutsRef.current.push(id);
      cycle += 1;
    };

    tick();

    return () => {
      stoppedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      ctx.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [active, kind]);
}
