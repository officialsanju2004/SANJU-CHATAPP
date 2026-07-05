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
  messages: (otherUserId) => api.get(`/chat/messages/${otherUserId}`),
  deleteChat: (otherUserId) => api.delete(`/chat/messages/${otherUserId}`),
};

export default api;
