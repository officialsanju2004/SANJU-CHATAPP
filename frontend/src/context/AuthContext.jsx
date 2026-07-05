import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios.js';

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

  const register = async (username, password) => {
    const { data } = await api.post('/auth/register', { username, password });
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
