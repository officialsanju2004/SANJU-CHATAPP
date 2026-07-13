import { useState } from 'react';
import { scheduledApi } from '../api/axios.js';

export default function ScheduleMessageModal({ text, onClose, onScheduled, target }) {
  const [when, setWhen] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSchedule = async () => {
    setError('');
    if (!when) return setError('Pick a date and time');
    const date = new Date(when);
    if (date <= new Date()) return setError('Pick a time in the future');

    setBusy(true);
    try {
      const payload = {
        type: 'text',
        content: text,
        scheduledFor: date.toISOString(),
        ...(target.type === 'dm' ? { receiver: target.user._id } : { groupId: target.group._id }),
      };
      await scheduledApi.create(payload);
      onScheduled?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not schedule message');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-xs shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-1">Schedule message</p>
        <p className="text-xs text-ember-50/50 mb-4 truncate">"{text}"</p>

        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="w-full bg-void border border-surface-border rounded-lg px-3 py-2.5 text-ember-50 outline-none focus:border-ember-500 mb-2"
        />
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="flex gap-2.5 mt-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={busy}
            className="flex-1 text-sm font-medium py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 disabled:opacity-50"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
