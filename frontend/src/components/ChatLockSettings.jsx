import { useState } from 'react';
import { lockApi } from '../api/axios.js';

export default function ChatLockSettings({ enabled, onClose, onChanged }) {
  const [step, setStep] = useState(enabled ? 'menu' : 'set'); // menu | set | change | disable
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSet = async () => {
    setError('');
    if (!/^\d{4,6}$/.test(pin)) return setError('PIN must be 4-6 digits');
    setBusy(true);
    try {
      await lockApi.set(pin);
      onChanged(true);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not set PIN');
    } finally {
      setBusy(false);
    }
  };

  const handleChange = async () => {
    setError('');
    if (!/^\d{4,6}$/.test(newPin)) return setError('New PIN must be 4-6 digits');
    setBusy(true);
    try {
      await lockApi.change(pin, newPin);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change PIN');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setError('');
    setBusy(true);
    try {
      await lockApi.disable(pin);
      onChanged(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not disable lock');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-xs shadow-neon-lg animate-floatIn">
        {step === 'menu' && (
          <>
            <p className="font-display font-semibold text-ember-50 mb-4">Chat Lock</p>
            <button
              onClick={() => setStep('change')}
              className="w-full text-left text-sm text-ember-50/80 hover:text-ember-50 py-2.5 border-b border-surface-border"
            >
              Change PIN
            </button>
            <button
              onClick={() => setStep('disable')}
              className="w-full text-left text-sm text-red-400 hover:text-red-300 py-2.5"
            >
              Turn off chat lock
            </button>
            <button
              onClick={onClose}
              className="mt-4 w-full text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
            >
              Close
            </button>
          </>
        )}

        {step === 'set' && (
          <>
            <p className="font-display font-semibold text-ember-50 mb-1">Set a PIN</p>
            <p className="text-xs text-ember-50/50 mb-4">
              You'll need this 4-6 digit PIN to open your chats every time you use the app.
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="New PIN"
              className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 text-center tracking-[0.3em] outline-none focus:border-ember-500 mb-2"
            />
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex gap-2.5 mt-3">
              <button
                onClick={onClose}
                className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
              >
                Cancel
              </button>
              <button
                onClick={handleSet}
                disabled={busy}
                className="flex-1 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 disabled:opacity-50"
              >
                Enable Lock
              </button>
            </div>
          </>
        )}

        {step === 'change' && (
          <>
            <p className="font-display font-semibold text-ember-50 mb-4">Change PIN</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Current PIN"
              className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 text-center tracking-[0.3em] outline-none focus:border-ember-500 mb-2.5"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="New PIN"
              className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 text-center tracking-[0.3em] outline-none focus:border-ember-500 mb-2"
            />
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex gap-2.5 mt-3">
              <button
                onClick={() => setStep('menu')}
                className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
              >
                Back
              </button>
              <button
                onClick={handleChange}
                disabled={busy}
                className="flex-1 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </>
        )}

        {step === 'disable' && (
          <>
            <p className="font-display font-semibold text-ember-50 mb-4">Turn off chat lock</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter current PIN"
              className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 text-center tracking-[0.3em] outline-none focus:border-ember-500 mb-2"
            />
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex gap-2.5 mt-3">
              <button
                onClick={() => setStep('menu')}
                className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
              >
                Back
              </button>
              <button
                onClick={handleDisable}
                disabled={busy}
                className="flex-1 text-sm font-medium py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white disabled:opacity-50"
              >
                Turn Off
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
