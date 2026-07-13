import { useEffect, useState } from 'react';
import { scheduledApi } from '../api/axios.js';
import { formatMessageTime, formatDateSeparator } from '../utils/time.js';

export default function ScheduledMessagesList({ onClose }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    scheduledApi.list().then(({ data }) => setItems(data));
  }, []);

  const handleCancel = async (id) => {
    await scheduledApi.cancel(id);
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-semibold text-ember-50">Scheduled messages</p>
          <button onClick={onClose} className="text-ember-50/50 hover:text-ember-50">
            <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
              <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-ember">
          {items === null && <p className="text-sm text-ember-50/40">Loading…</p>}
          {items?.length === 0 && <p className="text-sm text-ember-50/40">No scheduled messages</p>}
          {items?.map((item) => (
            <div key={item._id} className="border-b border-surface-border py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-ember-400 mb-0.5">
                    To {item.receiver?.username || item.group?.name}
                  </p>
                  <p className="text-sm text-ember-50 truncate">{item.content}</p>
                  <p className="text-[11px] text-ember-50/40 mt-0.5">
                    {formatDateSeparator(item.scheduledFor)} · {formatMessageTime(item.scheduledFor)}
                  </p>
                </div>
                <button
                  onClick={() => handleCancel(item._id)}
                  className="shrink-0 text-xs text-red-400 hover:text-red-300 px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
