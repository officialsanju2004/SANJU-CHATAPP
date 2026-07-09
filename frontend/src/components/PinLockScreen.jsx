import { useState } from 'react';
import { lockApi } from '../api/axios.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleKey = async (key) => {
    setError('');
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!key || pin.length >= 6) return;
    const next = pin + key;
    setPin(next);

    if (next.length >= 4) {
      setChecking(true);
      try {
        const { data } = await lockApi.verify(next);
        if (data.valid) {
          onUnlock();
        } else if (next.length === 6) {
          setError('Incorrect PIN');
          setPin('');
        }
      } catch (err) {
        if (next.length === 6 || err.response?.status === 401) {
          setError(err.response?.data?.message || 'Incorrect PIN');
          setPin('');
        }
      } finally {
        setChecking(false);
      }
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-void-950 px-6">
      <div className="w-14 h-14 rounded-2xl bg-ember-500/15 border border-ember-500/40 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" width="24" height="24" className="fill-ember-400">
          <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm-3 8V6a3 3 0 0 1 6 0v3Z" />
        </svg>
      </div>
      <p className="font-display font-semibold text-lg text-ember-50 mb-1">Enter PIN</p>
      <p className="text-sm text-ember-50/40 mb-6">Chats are locked for your privacy</p>

      <div className="flex gap-3 mb-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`w-3.5 h-3.5 rounded-full border ${
              i < pin.length ? 'bg-ember-400 border-ember-400' : 'border-ember-50/25'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-red-400 h-4 mb-4">{error}</p>

      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        {KEYS.map((key, i) =>
          key ? (
            <button
              key={i}
              disabled={checking}
              onClick={() => handleKey(key)}
              className="h-16 rounded-2xl bg-surface-light border border-surface-border text-ember-50 text-xl font-medium flex items-center justify-center hover:bg-void/60 active:scale-95 transition-transform disabled:opacity-50"
            >
              {key === 'del' ? (
                <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
                  <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-4.34 12.71a1 1 0 0 1-1.41 0L14 13.41l-2.29 2.3a1 1 0 1 1-1.41-1.42L12.59 12l-2.3-2.29a1 1 0 0 1 1.41-1.41L14 10.59l2.29-2.3a1 1 0 1 1 1.41 1.41L15.41 12l2.3 2.29a1 1 0 0 1-.05 1.42Z" />
                </svg>
              ) : (
                key
              )}
            </button>
          ) : (
            <span key={i} />
          )
        )}
      </div>
    </div>
  );
}
