import { createContext, useContext, useEffect, useState } from 'react';
import api, { usersApi } from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ember_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('ember_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('ember_token', data.token);
    localStorage.setItem('ember_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (username, password, email) => {
    const { data } = await api.post('/auth/register', { username, password, email });
    localStorage.setItem('ember_token', data.token);
    localStorage.setItem('ember_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('ember_token');
    localStorage.removeItem('ember_user');
    setToken(null);
    setUser(null);
  };

  const updateAvatar = (avatarUrl) => {
    setUser((prev) => {
      const next = { ...prev, avatar: avatarUrl };
      localStorage.setItem('ember_user', JSON.stringify(next));
      return next;
    });
  };

  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('ember_user', JSON.stringify(next));
      return next;
    });
  };

  // ✅ Username change - server confirms uniqueness + password, we just
  // sync whatever it returns into local state/storage.
  const changeUsername = async (newUsername, password) => {
    const { data } = await usersApi.changeUsername(newUsername, password);
    updateUser(data.user);
    return data.user;
  };

  // ✅ Add/replace the recovery email (also silences the 24h nudge server-side)
  const setRecoveryEmail = async (email) => {
    const { data } = await usersApi.setRecoveryEmail(email);
    updateUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, updateAvatar, updateUser, changeUsername, setRecoveryEmail }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
