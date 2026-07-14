import { createContext, useContext, useEffect, useState } from 'react';
import { themeApi } from '../api/axios.js';
import { useAuth } from './AuthContext.jsx';

const ThemeContext = createContext(null);

export const THEMES = [
  { id: 'ember', label: 'Ember (default)', swatch: '#ff9500' },
  { id: 'blue', label: 'Blue', swatch: '#3b82f6' },
  { id: 'green', label: 'Green', swatch: '#22c55e' },
  { id: 'purple', label: 'Purple', swatch: '#a855f7' },
  { id: 'amoled', label: 'AMOLED Black', swatch: '#ff9500' },
];

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [theme, setThemeState] = useState(() => localStorage.getItem('ember_theme') || 'ember');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Once the logged-in user's saved theme is known, apply it (it may differ
  // from whatever localStorage had, e.g. after switching devices)
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setThemeState(user.theme);
      localStorage.setItem('ember_theme', user.theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.theme]);

  const setTheme = (next) => {
    setThemeState(next);
    localStorage.setItem('ember_theme', next);
    // Keep the cached `user` object (ember_user in localStorage) in sync too -
    // otherwise it stays stale at whatever theme was active at login, and the
    // effect above overwrites the just-picked theme back to that old value
    // on the very next refresh.
    updateUser({ theme: next });
    themeApi.set(next).catch(() => {});
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
