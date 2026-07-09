import { useState } from 'react';
import { groupsApi } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';

export default function GroupInfoModal({ group, friends, onClose, onUpdated, onLeft }) {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAddFriends, setShowAddFriends] = useState(false);

  const isAdmin = group.members.some((m) => {
    const id = m.user?._id || m.user;
    return String(id) === user.id && m.role === 'admin';
  });

  const memberIds = new Set(group.members.map((m) => String(m.user?._id || m.user)));
  const addableFriends = friends.filter((f) => !memberIds.has(f._id));

  const handleAdd = async (friendId) => {
    setError('');
    setBusy(true);
    try {
      const { data } = await groupsApi.addMember(group._id, friendId);
      onUpdated?.(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add member');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (memberId) => {
    setBusy(true);
    try {
      const { data } = await groupsApi.removeMember(group._id, memberId);
      if (data.deleted) onLeft?.();
      else onUpdated?.(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove member');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = () => {
    if (window.confirm(`Leave "${group.name}"?`)) handleRemove(user.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-neon-lg animate-floatIn flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display font-semibold text-ember-50">{group.name}</p>
          <button onClick={onClose} className="text-ember-50/50 hover:text-ember-50">
            <svg viewBox="0 0 24 24" width="18" height="18" className="fill-current">
              <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-ember-50/40 mb-4">{group.members.length} members</p>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="flex-1 overflow-y-auto scrollbar-ember -mx-1 px-1 mb-3">
          {group.members.map((m) => {
            const u = m.user;
            const id = String(u?._id || u);
            return (
              <div key={id} className="flex items-center gap-3 px-2 py-2">
                <Avatar username={u?.username} avatar={u?.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ember-50 truncate">
                    {u?.username} {id === user.id && '(you)'}
                  </p>
                  {m.role === 'admin' && <p className="text-[10px] text-ember-400">Admin</p>}
                </div>
                {isAdmin && id !== user.id && (
                  <button
                    onClick={() => handleRemove(id)}
                    disabled={busy}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="mb-3">
            <button
              onClick={() => setShowAddFriends((v) => !v)}
              className="text-sm text-ember-400 hover:text-ember-300 font-medium"
            >
              {showAddFriends ? 'Hide' : '+ Add friends'}
            </button>
            {showAddFriends && (
              <div className="mt-2 max-h-40 overflow-y-auto scrollbar-ember">
                {addableFriends.length === 0 && (
                  <p className="text-xs text-ember-50/40 py-2">Everyone is already in the group</p>
                )}
                {addableFriends.map((f) => (
                  <button
                    key={f._id}
                    onClick={() => handleAdd(f._id)}
                    disabled={busy}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-void/60"
                  >
                    <Avatar username={f.username} avatar={f.avatar} size="sm" />
                    <span className="text-sm text-ember-50 flex-1 text-left">{f.username}</span>
                    <span className="text-xs text-ember-400">Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLeave}
          className="w-full text-sm font-medium py-2 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/30"
        >
          Leave group
        </button>
      </div>
    </div>
  );
}
