import { useEffect, useState } from 'react';
import { chatApi } from '../api/axios.js';
import { formatMessageTime, formatDateSeparator } from '../utils/time.js';
import Avatar from './Avatar.jsx';

function previewFor(m) {
  if (m.type === 'image') return '📷 Photo';
  if (m.type === 'video') return '🎥 Video';
  if (m.type === 'voice') return '🎤 Voice message';
  if (m.type === 'poll') return `📊 ${m.poll?.question || 'Poll'}`;
  if (m.type === 'location') return '📍 Location';
  return m.content;
}

export default function StarredMessagesModal({ onClose, currentUserId, onJump }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    chatApi.starred().then(({ data }) => setItems(data));
  }, []);

  const handleUnstar = async (id) => {
    await chatApi.toggleStar(id);
    setItems((prev) => prev.filter((m) => m._id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-semibold text-ember-50">⭐ Starred messages</p>
          <button onClick={onClose} className="text-ember-50/50 hover:text-ember-50">
            <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
              <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-ember">
          {items === null && <p className="text-sm text-ember-50/40">Loading…</p>}
          {items?.length === 0 && <p className="text-sm text-ember-50/40">No starred messages yet</p>}
          {items?.map((m) => {
            const isMine = String(m.sender?._id || m.sender) === currentUserId;
            const other = m.group ? m.group : isMine ? m.receiver : m.sender;
            return (
              <div key={m._id} className="border-b border-surface-border py-3">
                <button
                  onClick={() => {
                    onJump(m);
                    onClose();
                  }}
                  className="w-full flex items-start gap-2.5 text-left hover:bg-void/40 rounded-lg p-1 -m-1"
                >
                  <Avatar username={other?.username || other?.name} avatar={other?.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ember-400 mb-0.5">{other?.username || other?.name}</p>
                    <p className="text-sm text-ember-50 truncate">{previewFor(m)}</p>
                    <p className="text-[11px] text-ember-50/40 mt-0.5">
                      {formatDateSeparator(m.createdAt)} · {formatMessageTime(m.createdAt)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleUnstar(m._id)}
                  className="text-xs text-ember-50/40 hover:text-red-400 mt-1"
                >
                  Unstar
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
