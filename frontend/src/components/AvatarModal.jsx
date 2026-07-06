import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usersApi, mediaUrl } from '../api/axios.js';
import Avatar from './Avatar.jsx';

export default function AvatarModal({ onClose }) {
  const { user, updateAvatar } = useAuth();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const handleSave = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { data } = await usersApi.uploadAvatar(file);
      updateAvatar(data.avatar);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs bg-surface border border-surface-border rounded-2xl p-6 shadow-neon-inset"
      >
        <h2 className="font-display font-semibold text-ember-50 text-lg mb-4">Profile picture</h2>

        <div className="flex flex-col items-center gap-4">
          {preview ? (
            <img
              src={preview}
              alt="preview"
              className="w-24 h-24 rounded-full object-cover border border-surface-border"
            />
          ) : (
            <Avatar username={user?.username} avatar={user?.avatar} size="xl" />
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold px-4 py-2 rounded-lg border border-surface-border text-ember-50/70 hover:text-ember-50 transition-colors"
          >
            Choose image
          </button>

          {error && <p className="text-xs text-ember-300">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium py-2.5 rounded-lg border border-surface-border text-ember-50/60 hover:text-ember-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!file || uploading}
            className="flex-1 text-sm font-semibold py-2.5 rounded-lg bg-ember-500 hover:bg-ember-400 disabled:opacity-50 text-void-950 shadow-neon transition-colors"
          >
            {uploading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
