import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ember_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const friendsApi = {
  search: (q) => api.get('/friends/search', { params: { q } }),
  sendRequest: (username) => api.post('/friends/request', { username }),
  incoming: () => api.get('/friends/requests/incoming'),
  outgoing: () => api.get('/friends/requests/outgoing'),
  accept: (id) => api.post(`/friends/requests/${id}/accept`),
  decline: (id) => api.post(`/friends/requests/${id}/decline`),
  list: () => api.get('/friends'),
  setNickname: (friendUserId, nickname) => api.patch(`/friends/${friendUserId}/nickname`, { nickname }),
  setAutoDelete: (friendUserId, seconds) => api.patch(`/friends/${friendUserId}/auto-delete`, { seconds }),
  remove: (friendUserId) => api.delete(`/friends/${friendUserId}`),
};

export const chatApi = {
  // Cursor-based pagination: pass the oldest loaded message's _id as `before`
  // to fetch the previous page. Omit it to get the latest page.
  messages: (otherUserId, before) =>
    api.get(`/chat/messages/${otherUserId}`, { params: before ? { before } : {} }),
  groupMessages: (groupId, before) =>
    api.get(`/chat/group/${groupId}/messages`, { params: before ? { before } : {} }),
  deleteChat: (otherUserId) => api.delete(`/chat/messages/${otherUserId}`),
  uploadMedia: (file, onProgress) => {
    const form = new FormData();
    form.append('media', file);
    return api.post('/chat/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  // Last message + unread count per friend, for the chat-list previews
  summaries: () => api.get('/chat/summaries'),
  // The one-time reveal call for a view-once photo
  openViewOnce: (messageId) => api.post(`/chat/messages/${messageId}/view-once/open`),
  toggleStar: (messageId) => api.post(`/chat/messages/${messageId}/star`),
  starred: () => api.get('/chat/starred'),
  search: (conversation, q) => api.get('/chat/search', { params: { conversation, q } }),
  messagesAround: (otherUserId, messageId) => api.get(`/chat/messages/${otherUserId}/around/${messageId}`),
};

export const pushApi = {
  getPublicKey: () => api.get('/push/vapid-public-key'),
  subscribe: (subscription) => api.post('/push/subscribe', { subscription }),
  unsubscribe: (endpoint) => api.post('/push/unsubscribe', { endpoint }),
};

export const usersApi = {
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/users/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ✅ Chat lock (single app-wide PIN)
export const lockApi = {
  status: () => api.get('/lock/status'),
  set: (pin) => api.post('/lock/set', { pin }),
  verify: (pin) => api.post('/lock/verify', { pin }),
  disable: (pin) => api.post('/lock/disable', { pin }),
  change: (currentPin, newPin) => api.post('/lock/change', { currentPin, newPin }),
};

// ✅ Block / unblock
export const blockApi = {
  block: (userId) => api.post(`/block/${userId}`),
  unblock: (userId) => api.delete(`/block/${userId}`),
  list: () => api.get('/block'),
  status: (userId) => api.get(`/block/status/${userId}`),
};

// ✅ Groups
export const groupsApi = {
  create: (name, memberIds) => api.post('/groups', { name, memberIds }),
  list: () => api.get('/groups'),
  get: (groupId) => api.get(`/groups/${groupId}`),
  addMember: (groupId, userId) => api.post(`/groups/${groupId}/members`, { userId }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  rename: (groupId, name) => api.patch(`/groups/${groupId}`, { name }),
  setAutoDelete: (groupId, seconds) => api.patch(`/groups/${groupId}/auto-delete`, { seconds }),
};

// ✅ Privacy settings
export const privacyApi = {
  get: () => api.get('/users/privacy'),
  update: (blockGroupAdd) => api.patch('/users/privacy', { blockGroupAdd }),
};

// ✅ Status (WhatsApp-style stories)
export const statusApi = {
  feed: () => api.get('/status/feed'),
  postImage: (file, caption) => {
    const form = new FormData();
    form.append('status', file);
    if (caption) form.append('caption', caption);
    return api.post('/status/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  postVideo: (file, caption) => {
    const form = new FormData();
    form.append('status', file);
    if (caption) form.append('caption', caption);
    return api.post('/status/video', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  postText: (caption, bgColor) => api.post('/status/text', { caption, bgColor }),
  markViewed: (statusId) => api.post(`/status/${statusId}/view`),
  viewers: (statusId) => api.get(`/status/${statusId}/viewers`),
  remove: (statusId) => api.delete(`/status/${statusId}`),
};

// ✅ Verified badge (only the @sanju account can call grant/revoke - the
// backend enforces this too, this is just for UI convenience)
export const verifyApi = {
  search: (q) => api.get('/users/verify/search', { params: { q } }),
  grant: (userId) => api.post(`/users/${userId}/verify`),
  revoke: (userId) => api.delete(`/users/${userId}/verify`),
};

// ✅ Account deletion (separate from sign out)
export const accountApi = {
  deleteAccount: (password) => api.delete('/account/me', { data: { password } }),
};

// ✅ Scheduled messages
export const scheduledApi = {
  create: (payload) => api.post('/scheduled', payload),
  list: () => api.get('/scheduled'),
  cancel: (id) => api.delete(`/scheduled/${id}`),
};

// ✅ Reminders
export const remindersApi = {
  create: (messageId, remindAt, note) => api.post('/reminders', { messageId, remindAt, note }),
  list: () => api.get('/reminders'),
  cancel: (id) => api.delete(`/reminders/${id}`),
};

// ✅ AI Assistant
export const aiApi = {
  get: () => api.get('/users/ai-assistant'),
};

// ✅ Online/last-seen visibility privacy
export const visibilityApi = {
  get: () => api.get('/users/privacy/visibility'),
  update: (payload) => api.patch('/users/privacy/visibility', payload),
};

// ✅ Pinned chats
export const pinApi = {
  toggle: (conversationKey) => api.patch('/users/pins', { conversationKey }),
};

// ✅ Theme
export const themeApi = {
  set: (theme) => api.patch('/users/theme', { theme }),
};

// Resolve a relative /uploads/... path from the API into an absolute URL.
// (Avatars/media are full Cloudinary URLs now and already start with
// "http", so this just passes those straight through.)
export const mediaUrl = (relativePath) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${base}${relativePath}`;
};

export default api;

