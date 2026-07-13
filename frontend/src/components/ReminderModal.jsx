import { useState } from 'react';
import { remindersApi } from '../api/axios.js';

const PRESETS = [
  { label: 'In 1 hour', ms: 60 * 60 * 1000 },
  { label: 'This evening (8 PM)', evening: true },
  { label: 'Tomorrow morning (9 AM)', tomorrowMorning: true },
  { label: 'In 1 week', ms: 7 * 24 * 60 * 60 * 1000 },
];

function resolvePreset(preset) {
  const now = new Date();
  if (preset.ms) return new Date(now.getTime() + preset.ms);
  if (preset.evening) {
    const d = new Date(now);
    d.setHours(20, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  }
  if (preset.tomorrowMorning) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  return now;
}

export default function ReminderModal({ message, onClose }) {
  const [customDate, setCustomDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const create = async (remindAt) => {
    setBusy(true);
    setError('');
    try {
      await remindersApi.create(message._id, remindAt.toISOString(), note.trim());
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not set reminder');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-xs shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-1">Remind me</p>
        <p className="text-xs text-ember-50/50 mb-4 truncate">"{message.content || 'this message'}"</p>

        {success ? (
          <p className="text-sm text-ember-400">Reminder set ✓</p>
        ) : (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full bg-void border border-surface-border rounded-lg px-3 py-2 text-sm text-ember-50 outline-none focus:border-ember-500 mb-3"
            />
            <div className="space-y-1.5 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => create(resolvePreset(p))}
                  disabled={busy}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg border border-surface-border text-ember-50/80 hover:bg-void/60 disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 bg-void border border-surface-border rounded-lg px-2 py-2 text-xs text-ember-50 outline-none focus:border-ember-500"
              />
              <button
                onClick={() => customDate && create(new Date(customDate))}
                disabled={!customDate || busy}
                className="text-sm font-medium px-3 py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-void-950 disabled:opacity-50"
              >
                Set
              </button>
            </div>
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          </>
        )}

        <button
          onClick={onClose}
          className="w-full text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
        >
          {success ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
