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
};

export const chatApi = {
  // Cursor-based pagination: pass the oldest loaded message's _id as `before`
  // to fetch the previous page. Omit it to get the latest page.
  messages: (otherUserId, before) =>
    api.get(`/chat/messages/${otherUserId}`, { params: before ? { before } : {} }),
  deleteChat: (otherUserId) => api.delete(`/chat/messages/${otherUserId}`),
  uploadMedia: (file, onProgress) => {
    const form = new FormData();
    form.append('media', file);
    return api.post('/chat/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
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

// Resolve a relative /uploads/... path from the API into an absolute URL
export const mediaUrl = (relativePath) => {
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${base}${relativePath}`;
};

export default api;
